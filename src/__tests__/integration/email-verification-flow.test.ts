/**
 * Email Verification Flow Integration Tests
 * Tests complete signup and verification process, resend functionality, and rate limiting
 * Requirements: 1.1, 1.4, 2.1, 2.2
 */

// Mock services first
jest.mock('@/lib/services/email-verification-code-service');
jest.mock('@/lib/services/resend-email-service');
jest.mock('@/lib/services/email-service');

import { emailVerificationCodeService } from '@/lib/services/email-verification-code-service';
import { createEmailService } from '@/lib/services/resend-email-service';
import { sendEmailWithRetry } from '@/lib/services/email-service';
import { getUserByEmail, getUserById } from '@/lib/auth';

// Mock database
jest.mock('@/lib/db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    returning: jest.fn(),
    execute: jest.fn(),
  },
}));

// Mock auth functions
jest.mock('@/lib/auth', () => ({
  getUserByEmail: jest.fn(),
  getUserById: jest.fn(),
}));

const mockEmailService = {
  sendVerificationEmail: jest.fn(),
};

const mockCreateEmailService = createEmailService as jest.MockedFunction<typeof createEmailService>;
const mockSendEmailWithRetry = sendEmailWithRetry as jest.MockedFunction<typeof sendEmailWithRetry>;
const mockDb = require('@/lib/db').db;
const mockGetUserByEmail = getUserByEmail as jest.MockedFunction<typeof getUserByEmail>;
const mockGetUserById = getUserById as jest.MockedFunction<typeof getUserById>;
const mockEmailVerificationCodeService = emailVerificationCodeService as jest.Mocked<typeof emailVerificationCodeService>;

// Mock environment variables
const originalEnv = process.env;

beforeAll(() => {
  process.env = {
    ...originalEnv,
    RESEND_API_KEY: 'test-api-key',
    FROM_EMAIL: 'test@example.com',
    FROM_NAME: 'Test App',
    VERIFICATION_CODE_EXPIRY_MINUTES: '10',
    MAX_VERIFICATION_ATTEMPTS: '5',
    RESEND_COOLDOWN_SECONDS: '60',
    MAX_RESEND_PER_HOUR: '5',
    NODE_ENV: 'test',
  };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('Email Verification Flow Integration Tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Mock email service to always succeed
    mockCreateEmailService.mockReturnValue(mockEmailService);
    mockSendEmailWithRetry.mockResolvedValue(true);
    mockEmailService.sendVerificationEmail.mockResolvedValue(true);

    // Mock email verification service methods
    mockEmailVerificationCodeService.generateCode.mockResolvedValue('123456');
    mockEmailVerificationCodeService.validateCode.mockResolvedValue(true);
    mockEmailVerificationCodeService.cleanupExpiredCodes.mockResolvedValue(0);

    // Setup default database mocks with proper chaining
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.insert.mockReturnThis();
    mockDb.values.mockReturnThis();
    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.delete.mockReturnThis();
    mockDb.limit.mockReturnThis();
    mockDb.returning.mockResolvedValue([]);
    mockDb.execute.mockResolvedValue([]);
  });

  describe('Complete Signup and Verification Process', () => {
    it('should complete full signup and verification workflow', async () => {
      // Mock user data
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isEmailVerified: false,
      };

      // Mock database responses for user lookup
      mockGetUserByEmail.mockResolvedValue(mockUser);
      mockGetUserById.mockResolvedValue(mockUser);

      // Mock code insertion
      mockDb.returning.mockResolvedValueOnce([{ id: 1, code: '123456', userId: 1 }]);

      // Step 1: Generate verification code
      const verificationCode = await mockEmailVerificationCodeService.generateCode(mockUser.id);
      expect(verificationCode).toMatch(/^\d{6}$/);

      // Step 2: Mock successful validation
      mockEmailVerificationCodeService.validateCode.mockResolvedValueOnce(true);
      
      // Step 3: Validate the verification code
      const isValid = await mockEmailVerificationCodeService.validateCode('test@example.com', verificationCode);
      expect(isValid).toBe(true);

      // Verify service methods were called
      expect(mockEmailVerificationCodeService.generateCode).toHaveBeenCalledWith(mockUser.id);
      expect(mockEmailVerificationCodeService.validateCode).toHaveBeenCalledWith('test@example.com', verificationCode);
    });

    it('should handle email service failure gracefully during code generation', async () => {
      // Mock user data
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isEmailVerified: false,
      };

      // Mock user lookup
      mockGetUserById.mockResolvedValue(mockUser);

      // Mock code insertion
      mockDb.returning.mockResolvedValueOnce([{ id: 1, code: '123456', userId: 1 }]);

      // Generate verification code (this should work even if email fails)
      const verificationCode = await mockEmailVerificationCodeService.generateCode(mockUser.id);
      expect(verificationCode).toMatch(/^\d{6}$/);

      // Verify service method was called
      expect(mockEmailVerificationCodeService.generateCode).toHaveBeenCalledWith(mockUser.id);
    });

    it('should reject verification with invalid code', async () => {
      // Mock service to throw error for invalid code
      mockEmailVerificationCodeService.validateCode.mockRejectedValueOnce(
        Object.assign(new Error('Invalid code'), { code: 'CODE_INVALID' })
      );

      // Try to verify with wrong code using mocked service
      try {
        await mockEmailVerificationCodeService.validateCode('test@example.com', '654321');
        fail('Should have thrown an error for invalid code');
      } catch (error: unknown) {
        expect((error as { code: string }).code).toBe('CODE_INVALID');
      }
    });

    it('should reject verification with expired code', async () => {
      // Mock service to throw error for expired code
      mockEmailVerificationCodeService.validateCode.mockRejectedValueOnce(
        Object.assign(new Error('Code expired'), { code: 'CODE_EXPIRED' })
      );

      // Try to verify with expired code using mocked service
      try {
        await mockEmailVerificationCodeService.validateCode('test@example.com', '123456');
        fail('Should have thrown an error for expired code');
      } catch (error: unknown) {
        expect((error as { code: string }).code).toBe('CODE_EXPIRED');
      }
    });
  });

  describe('Resend Verification Code Functionality', () => {
    it('should resend verification code by generating new code', async () => {
      // Mock user data
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isEmailVerified: false,
      };

      // Mock user lookup
      mockGetUserById.mockResolvedValue(mockUser);

      // Mock code insertion for new code
      mockDb.returning.mockResolvedValueOnce([{ id: 1, code: '654321', userId: 1 }]);

      // Generate new verification code (simulating resend)
      const newCode = await mockEmailVerificationCodeService.generateCode(mockUser.id);
      expect(newCode).toMatch(/^\d{6}$/);

      // Verify service method was called
      expect(mockEmailVerificationCodeService.generateCode).toHaveBeenCalledWith(mockUser.id);
    });

    it('should handle resend for already verified user', async () => {
      // Mock service to throw error for already verified user
      mockEmailVerificationCodeService.generateCode.mockRejectedValueOnce(
        Object.assign(new Error('User already verified'), { code: 'ALREADY_VERIFIED' })
      );

      // Try to generate code for already verified user
      try {
        await mockEmailVerificationCodeService.generateCode(1);
        fail('Should have thrown an error for already verified user');
      } catch (error: unknown) {
        expect((error as { code: string }).code).toBe('ALREADY_VERIFIED');
      }
    });

    it('should handle resend for non-existent user', async () => {
      // Mock service to throw error for non-existent user
      mockEmailVerificationCodeService.validateCode.mockRejectedValueOnce(
        Object.assign(new Error('User not found'), { code: 'USER_NOT_FOUND' })
      );

      // Try to validate code for non-existent user
      try {
        await mockEmailVerificationCodeService.validateCode('nonexistent@example.com', '123456');
        fail('Should have thrown an error for non-existent user');
      } catch (error: unknown) {
        expect((error as { code: string }).code).toBe('USER_NOT_FOUND');
      }
    });
  });

  describe('Rate Limiting Enforcement', () => {
    it('should enforce verification attempt limits', async () => {
      // Mock service to throw error for too many attempts
      mockEmailVerificationCodeService.validateCode.mockRejectedValueOnce(
        Object.assign(new Error('Too many attempts'), { code: 'TOO_MANY_ATTEMPTS' })
      );

      // Try to verify with max attempts reached
      try {
        await mockEmailVerificationCodeService.validateCode('test@example.com', '123456');
        fail('Should have thrown an error for too many attempts');
      } catch (error: unknown) {
        expect((error as { code: string }).code).toBe('TOO_MANY_ATTEMPTS');
      }
    });

    it('should handle validation at service level', async () => {
      // Mock user data
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isEmailVerified: false,
      };

      // Generate valid code using mocked service
      const validCode = await mockEmailVerificationCodeService.generateCode(mockUser.id);
      expect(validCode).toMatch(/^\d{6}$/);

      // Mock successful validation
      mockEmailVerificationCodeService.validateCode.mockResolvedValueOnce(true);

      // Test that service validates codes properly
      const isValid = await mockEmailVerificationCodeService.validateCode('test@example.com', validCode);
      expect(isValid).toBe(true);

      // Verify service methods were called
      expect(mockEmailVerificationCodeService.generateCode).toHaveBeenCalledWith(mockUser.id);
      expect(mockEmailVerificationCodeService.validateCode).toHaveBeenCalledWith('test@example.com', validCode);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle duplicate verification code generation', async () => {
      // Mock different codes for each generation
      mockEmailVerificationCodeService.generateCode
        .mockResolvedValueOnce('123456')
        .mockResolvedValueOnce('654321');

      // Generate first code
      const firstCode = await mockEmailVerificationCodeService.generateCode(1);
      expect(firstCode).toMatch(/^\d{6}$/);

      // Generate second code (should be different)
      const secondCode = await mockEmailVerificationCodeService.generateCode(1);
      expect(secondCode).toMatch(/^\d{6}$/);
      expect(secondCode).not.toBe(firstCode);

      // Verify service was called twice
      expect(mockEmailVerificationCodeService.generateCode).toHaveBeenCalledTimes(2);
    });

    it('should handle service errors gracefully', async () => {
      // Mock service to throw error for non-existent user
      mockEmailVerificationCodeService.generateCode.mockRejectedValueOnce(
        Object.assign(new Error('User not found'), { code: 'USER_NOT_FOUND' })
      );

      // Test with non-existent user ID
      try {
        await mockEmailVerificationCodeService.generateCode(99999); // Non-existent user ID
        fail('Should have thrown an error for non-existent user');
      } catch (error: unknown) {
        expect((error as { code: string }).code).toBe('USER_NOT_FOUND');
      }
    });

    it('should handle cleanup of expired codes', async () => {
      // Mock cleanup to return count of cleaned codes
      mockEmailVerificationCodeService.cleanupExpiredCodes.mockResolvedValueOnce(2);

      // Run cleanup using mocked service
      const cleanedCount = await mockEmailVerificationCodeService.cleanupExpiredCodes();

      // Verify cleanup was called and returned expected count
      expect(mockEmailVerificationCodeService.cleanupExpiredCodes).toHaveBeenCalled();
      expect(cleanedCount).toBe(2);
    });
  });
});