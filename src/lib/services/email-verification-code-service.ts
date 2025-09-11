import 'server-only';
import { db } from '@/lib/db';
import { emailVerificationCodes, users } from '@/lib/db/schema';
import { eq, and, lt, gt } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export interface EmailVerificationCode {
  id: number;
  userId: number;
  code: string;
  expiresAt: Date;
  createdAt: Date;
  attemptsUsed: number;
}

export enum VerificationError {
  CODE_EXPIRED = 'CODE_EXPIRED',
  CODE_INVALID = 'CODE_INVALID',
  TOO_MANY_ATTEMPTS = 'TOO_MANY_ATTEMPTS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  ALREADY_VERIFIED = 'ALREADY_VERIFIED'
}

export class VerificationCodeError extends Error {
  constructor(
    message: string,
    public code: VerificationError
  ) {
    super(message);
    this.name = 'VerificationCodeError';
  }
}

export class EmailVerificationCodeService {
  private static readonly CODE_LENGTH = 6;
  private static readonly EXPIRY_MINUTES = 10;
  private static readonly MAX_ATTEMPTS = 5;

  /**
   * Generate a cryptographically secure 6-digit verification code
   */
  private generateSecureCode(): string {
    // Generate random bytes and convert to 6-digit number
    const buffer = randomBytes(4);
    const randomNumber = buffer.readUInt32BE(0);
    // Ensure it's always 6 digits by using modulo and padding
    const code = (randomNumber % 1000000).toString().padStart(6, '0');
    return code;
  }

  /**
   * Generate and store a new verification code for a user
   * Invalidates any existing codes for the user
   */
  async generateCode(userId: number): Promise<string> {
    // First, delete any existing codes for this user
    await this.deleteUserCodes(userId);

    // Generate new code
    const code = this.generateSecureCode();
    const expiresAt = new Date(Date.now() + EmailVerificationCodeService.EXPIRY_MINUTES * 60 * 1000);

    // Store in database
    await db.insert(emailVerificationCodes).values({
      userId,
      code,
      expiresAt,
      attemptsUsed: 0,
    });

    return code;
  }

  /**
   * Validate a verification code for a user
   * Returns true if valid, throws VerificationCodeError if invalid
   */
  async validateCode(email: string, code: string): Promise<boolean> {
    // Find user by email
    const userResult = await db
      .select({ id: users.id, isEmailVerified: users.isEmailVerified })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userResult.length === 0) {
      throw new VerificationCodeError('User not found', VerificationError.USER_NOT_FOUND);
    }

    const user = userResult[0];

    // Check if user is already verified
    if (user.isEmailVerified) {
      throw new VerificationCodeError('Email already verified', VerificationError.ALREADY_VERIFIED);
    }

    // Find the verification code
    const codeResult = await db
      .select()
      .from(emailVerificationCodes)
      .where(
        and(
          eq(emailVerificationCodes.userId, user.id),
          eq(emailVerificationCodes.code, code)
        )
      )
      .limit(1);

    if (codeResult.length === 0) {
      throw new VerificationCodeError('Invalid verification code', VerificationError.CODE_INVALID);
    }

    const verificationCode = codeResult[0];

    // Check if code has expired
    if (new Date() > verificationCode.expiresAt) {
      // Clean up expired code
      await db
        .delete(emailVerificationCodes)
        .where(eq(emailVerificationCodes.id, verificationCode.id));
      
      throw new VerificationCodeError('Verification code has expired', VerificationError.CODE_EXPIRED);
    }

    // Check if too many attempts have been made
    if (verificationCode.attemptsUsed >= EmailVerificationCodeService.MAX_ATTEMPTS) {
      // Invalidate the code
      await db
        .delete(emailVerificationCodes)
        .where(eq(emailVerificationCodes.id, verificationCode.id));
      
      throw new VerificationCodeError('Too many verification attempts', VerificationError.TOO_MANY_ATTEMPTS);
    }

    // Code is valid - mark user as verified and delete the code
    await db.transaction(async (tx) => {
      // Update user verification status
      await tx
        .update(users)
        .set({ isEmailVerified: true })
        .where(eq(users.id, user.id));

      // Delete the verification code
      await tx
        .delete(emailVerificationCodes)
        .where(eq(emailVerificationCodes.id, verificationCode.id));
    });

    return true;
  }

  /**
   * Increment the attempt count for a verification code
   * Used when validation fails but we want to track attempts
   */
  async incrementAttempts(email: string, code: string): Promise<void> {
    // Find user by email
    const userResult = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userResult.length === 0) {
      return; // User not found, nothing to increment
    }

    const user = userResult[0];

    // Find and increment attempts for the code
    const codeResult = await db
      .select({ id: emailVerificationCodes.id, attemptsUsed: emailVerificationCodes.attemptsUsed })
      .from(emailVerificationCodes)
      .where(
        and(
          eq(emailVerificationCodes.userId, user.id),
          eq(emailVerificationCodes.code, code)
        )
      )
      .limit(1);

    if (codeResult.length > 0) {
      const verificationCode = codeResult[0];
      await db
        .update(emailVerificationCodes)
        .set({ attemptsUsed: verificationCode.attemptsUsed + 1 })
        .where(eq(emailVerificationCodes.id, verificationCode.id));
    }
  }

  /**
   * Clean up expired verification codes
   * Should be called periodically by a cleanup job
   */
  async cleanupExpiredCodes(): Promise<number> {
    const now = new Date();
    
    // First count the expired codes
    const expiredCodes = await db
      .select({ id: emailVerificationCodes.id })
      .from(emailVerificationCodes)
      .where(lt(emailVerificationCodes.expiresAt, now));

    const count = expiredCodes.length;

    // Then delete them if any exist
    if (count > 0) {
      await db
        .delete(emailVerificationCodes)
        .where(lt(emailVerificationCodes.expiresAt, now));
    }

    return count;
  }

  /**
   * Delete all verification codes for a specific user
   * Used when generating new codes or when user is deleted
   */
  async deleteUserCodes(userId: number): Promise<void> {
    await db
      .delete(emailVerificationCodes)
      .where(eq(emailVerificationCodes.userId, userId));
  }

  /**
   * Get active verification code for a user (for testing/debugging)
   */
  async getUserActiveCode(userId: number): Promise<EmailVerificationCode | null> {
    const now = new Date();
    const result = await db
      .select()
      .from(emailVerificationCodes)
      .where(
        and(
          eq(emailVerificationCodes.userId, userId),
          gt(emailVerificationCodes.expiresAt, now) // Not expired
        )
      )
      .limit(1);

    return result.length > 0 ? result[0] : null;
  }

  /**
   * Check if a user has any active verification codes
   */
  async hasActiveCode(userId: number): Promise<boolean> {
    const code = await this.getUserActiveCode(userId);
    return code !== null;
  }

  /**
   * Get verification code statistics for monitoring
   */
  async getCodeStats(): Promise<{
    totalActive: number;
    expiredCount: number;
    highAttemptCount: number;
  }> {
    const now = new Date();
    
    // Count active codes
    const activeResult = await db
      .select({ id: emailVerificationCodes.id })
      .from(emailVerificationCodes)
      .where(gt(emailVerificationCodes.expiresAt, now));

    // Count expired codes
    const expiredResult = await db
      .select({ id: emailVerificationCodes.id })
      .from(emailVerificationCodes)
      .where(lt(emailVerificationCodes.expiresAt, now));

    // Count codes with high attempts (4 or more)
    const highAttemptResult = await db
      .select({ id: emailVerificationCodes.id })
      .from(emailVerificationCodes)
      .where(
        and(
          gt(emailVerificationCodes.expiresAt, now),
          eq(emailVerificationCodes.attemptsUsed, 4) // Close to max attempts
        )
      );

    return {
      totalActive: activeResult.length,
      expiredCount: expiredResult.length,
      highAttemptCount: highAttemptResult.length,
    };
  }
}

// Export singleton instance
export const emailVerificationCodeService = new EmailVerificationCodeService();