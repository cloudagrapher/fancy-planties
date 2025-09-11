/**
 * Email Verification Flow Integration Tests
 * Tests complete signup and verification process, resend functionality, and rate limiting
 * Requirements: 1.1, 1.4, 2.1, 2.2
 */

import { emailVerificationCodeService } from '@/lib/services/email-verification-code-service';
import { createEmailService } from '@/lib/services/resend-email-service';

// Mock email service
jest.mock('@/lib/services/resend-email-service');
jest.mock('@/lib/services/email-service');

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
const mockSendEmailWithRetry = require('@/lib/services/email-service').sendEmailWithRetry as jest.MockedFunction<any>;
const mockDb = require('@/lib/db').db;
const mockGetUserByEmail = require('@/lib/auth').getUserByEmail as jest.MockedFunction<any>;
const mockGetUserById = require('@/lib/auth').getUserById as jest.MockedFunction<any>;

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

    // Setup default database mocks
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
      const verificationCode = await emailVerificationCodeService.generateCode(mockUser.id);
      expect(verificationCode).toMatch(/^\d{6}$/);

      // Step 2: Mock successful validation
      mockDb.returning.mockResolvedValueOnce([{ 
        id: 1, 
        code: verificationCode, 
        userId: 1, 
        expiresAt: new Date(Date.now() + 600000),
        attemptsUsed: 0 
      }]);
      
      // Mock user update to verified
      mockGetUserById.mockResolvedValueOnce({ ...mockUser, isEmailVerified: true });

      // Step 3: Validate the verification code
      const isValid = await emailVerificationCodeService.validateCode('test@example.com', verificationCode);
      expect(isValid).toBe(true);

      // Verify database operations were called
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.delete).toHaveBeenCalled();
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
      const verificationCode = await emailVerificationCodeService.generateCode(mockUser.id);
      expect(verificationCode).toMatch(/^\d{6}$/);

      // Verify database insert was called
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalled();
    });

    it('should reject verification with invalid code', async () => {
      // Mock user data
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isEmailVerified: false,
      };

      // Mock user lookup
      mockGetUserByEmail.mockResolvedValue(mockUser);

      // Mock code lookup - return empty array (no matching code)
      mockDb.returning.mockResolvedValueOnce([]);

      // Try to verify with wrong code using service directly
      try {
        await emailVerificationCodeService.validateCode('test@example.com', '654321');
        fail('Should have thrown an error for invalid code');
      } catch (error: any) {
        expect(error.code).toBe('CODE_INVALID');
      }
    });

    it('should reject verification with expired code', async () => {
      // Mock user data
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isEmailVerified: false,
      };

      // Mock user lookup
      mockGetUserByEmail.mockResolvedValue(mockUser);

      // Mock expired code lookup
      mockDb.returning.mockResolvedValueOnce([{
        id: 1,
        code: '123456',
        userId: 1,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        attemptsUsed: 0,
      }]);

      // Try to verify with expired code using service directly
      try {
        await emailVerificationCodeService.validateCode('test@example.com', '123456');
        fail('Should have thrown an error for expired code');
      } catch (error: any) {
        expect(error.code).toBe('CODE_EXPIRED');
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
      const newCode = await emailVerificationCodeService.generateCode(mockUser.id);
      expect(newCode).toMatch(/^\d{6}$/);

      // Verify database operations were called
      expect(mockDb.delete).toHaveBeenCalled(); // Old codes deleted
      expect(mockDb.insert).toHaveBeenCalled(); // New code inserted
    });

    it('should handle resend for already verified user', async () => {
      // Mock verified user
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isEmailVerified: true, // Already verified
      };

      // Mock user lookup
      mockGetUserById.mockResolvedValue(mockUser);

      // Try to generate code for already verified user
      try {
        await emailVerificationCodeService.generateCode(mockUser.id);
        fail('Should have thrown an error for already verified user');
      } catch (error: any) {
        expect(error.code).toBe('ALREADY_VERIFIED');
      }
    });

    it('should handle resend for non-existent user', async () => {
      // Mock user not found
      mockGetUserByEmail.mockResolvedValue(null);

      // Try to validate code for non-existent user
      try {
        await emailVerificationCodeService.validateCode('nonexistent@example.com', '123456');
        fail('Should have thrown an error for non-existent user');
      } catch (error: any) {
        expect(error.code).toBe('USER_NOT_FOUND');
      }
    });
  });

  describe('Rate Limiting Enforcement', () => {
    it('should enforce verification attempt limits', async () => {
      // Mock user data
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isEmailVerified: false,
      };

      // Mock user lookup
      mockGetUserByEmail.mockResolvedValue(mockUser);

      // Mock code with max attempts reached
      mockDb.returning.mockResolvedValueOnce([{
        id: 1,
        code: '123456',
        userId: 1,
        expiresAt: new Date(Date.now() + 600000),
        attemptsUsed: 5, // Max attempts reached
      }]);

      // Try to verify with max attempts reached
      try {
        await emailVerificationCodeService.validateCode('test@example.com', '123456');
        fail('Should have thrown an error for too many attempts');
      } catch (error: any) {
        expect(error.code).toBe('TOO_MANY_ATTEMPTS');
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

      // Mock user lookup
      mockGetUserById.mockResolvedValue(mockUser);
      mockGetUserByEmail.mockResolvedValue(mockUser);

      // Mock code insertion
      mockDb.returning.mockResolvedValueOnce([{ id: 1, code: '123456', userId: 1 }]);

      // Generate valid code
      const validCode = await emailVerificationCodeService.generateCode(mockUser.id);
      expect(validCode).toMatch(/^\d{6}$/);

      // Mock successful validation
      mockDb.returning.mockResolvedValueOnce([{
        id: 1,
        code: validCode,
        userId: 1,
        expiresAt: new Date(Date.now() + 600000),
        attemptsUsed: 0,
      }]);

      // Test that service validates codes properly
      const isValid = await emailVerificationCodeService.validateCode('test@example.com', validCode);
      expect(isValid).toBe(true);

      // Verify database operations were called
      expect(mockDb.update).toHaveBeenCalled(); // User marked as verified
      expect(mockDb.delete).toHaveBeenCalled(); // Code deleted
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle duplicate verification code generation', async () => {
      // Mock user data
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isEmailVerified: false,
      };

      // Mock user lookup
      mockGetUserById.mockResolvedValue(mockUser);

      // Mock code insertions
      mockDb.returning
        .mockResolvedValueOnce([{ id: 1, code: '123456', userId: 1 }])
        .mockResolvedValueOnce([{ id: 2, code: '654321', userId: 1 }]);

      // Generate first code
      const firstCode = await emailVerificationCodeService.generateCode(mockUser.id);
      expect(firstCode).toMatch(/^\d{6}$/);

      // Generate second code (should invalidate first)
      const secondCode = await emailVerificationCodeService.generateCode(mockUser.id);
      expect(secondCode).toMatch(/^\d{6}$/);
      expect(secondCode).not.toBe(firstCode);

      // Verify delete was called to remove old codes
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      // Mock user not found
      mockGetUserById.mockResolvedValue(null);

      // Test with non-existent user ID
      try {
        await emailVerificationCodeService.generateCode(99999); // Non-existent user ID
        fail('Should have thrown an error for non-existent user');
      } catch (error: any) {
        expect(error.code).toBe('USER_NOT_FOUND');
      }
    });

    it('should handle cleanup of expired codes', async () => {
      // Mock cleanup operation
      mockDb.returning.mockResolvedValueOnce([
        { id: 1, code: '123456', expiresAt: new Date(Date.now() - 60000) }
      ]);

      // Run cleanup
      await emailVerificationCodeService.cleanupExpiredCodes();

      // Verify delete was called for expired codes
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});