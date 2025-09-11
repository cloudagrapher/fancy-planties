import 'server-only';
import { db } from '@/lib/db';
import { passwordResetTokens, users } from '@/lib/db/schema';
import { eq, and, gt, lt, isNull } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export interface PasswordResetToken {
  id: number;
  userId: number;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt: Date | null;
}

export class PasswordResetService {
  private static readonly TOKEN_LENGTH = 32;
  private static readonly TOKEN_EXPIRY_HOURS = 1; // 1 hour expiry

  /**
   * Generate a secure password reset token for a user
   */
  async generateToken(userId: number): Promise<string> {
    // Clean up any existing unused tokens for this user
    await this.cleanupUserTokens(userId);

    // Generate a secure random token
    const token = randomBytes(PasswordResetService.TOKEN_LENGTH).toString('hex');
    
    // Calculate expiry time
    const expiresAt = new Date(Date.now() + PasswordResetService.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Store the token in the database
    await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
    });

    return token;
  }

  /**
   * Validate a password reset token
   */
  async validateToken(token: string): Promise<{ valid: boolean; userId?: number; tokenId?: number }> {
    try {
      const result = await db
        .select({
          id: passwordResetTokens.id,
          userId: passwordResetTokens.userId,
          expiresAt: passwordResetTokens.expiresAt,
          usedAt: passwordResetTokens.usedAt,
        })
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, token),
            gt(passwordResetTokens.expiresAt, new Date()),
            isNull(passwordResetTokens.usedAt)
          )
        )
        .limit(1);

      if (result.length === 0) {
        return { valid: false };
      }

      const tokenData = result[0];
      return {
        valid: true,
        userId: tokenData.userId,
        tokenId: tokenData.id,
      };
    } catch (error) {
      console.error('Error validating password reset token:', error);
      return { valid: false };
    }
  }

  /**
   * Mark a token as used
   */
  async markTokenAsUsed(tokenId: number): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, tokenId));
  }

  /**
   * Clean up expired or used tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await db
      .delete(passwordResetTokens)
      .where(lt(passwordResetTokens.expiresAt, new Date()));

    return result.length || 0;
  }

  /**
   * Clean up all tokens for a specific user
   */
  async cleanupUserTokens(userId: number): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId));
  }

  /**
   * Get user email by user ID (for sending reset emails)
   */
  async getUserEmail(userId: number): Promise<string | null> {
    try {
      const result = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return result.length > 0 ? result[0].email : null;
    } catch (error) {
      console.error('Error getting user email:', error);
      return null;
    }
  }

  /**
   * Find user by email (for initiating password reset)
   */
  async findUserByEmail(email: string): Promise<{ id: number; email: string; name: string } | null> {
    try {
      const result = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
        })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  /**
   * Check if user has a valid unused token
   */
  async hasValidToken(userId: number): Promise<boolean> {
    try {
      const result = await db
        .select({ id: passwordResetTokens.id })
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.userId, userId),
            gt(passwordResetTokens.expiresAt, new Date()),
            isNull(passwordResetTokens.usedAt)
          )
        )
        .limit(1);

      return result.length > 0;
    } catch (error) {
      console.error('Error checking for valid token:', error);
      return false;
    }
  }
}

// Export singleton instance
export const passwordResetService = new PasswordResetService();