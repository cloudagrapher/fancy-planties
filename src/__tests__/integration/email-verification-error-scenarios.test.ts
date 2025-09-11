/**
 * Email Verification Error Scenario Tests
 * Tests email service failure handling, retry logic, expired code scenarios, 
 * cleanup processes, and concurrent verification attempts
 * Requirements: 1.4, 3.1, 7.3, 7.4
 */

import { emailVerificationCodeService } from '@/lib/services/email-verification-code-service';
import { createEmailService } from '@/lib/services/resend-email-service';
import { EmailServiceError } from '@/lib/services/email-service';

// Mock email service and related modules
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

describe('Email Verification Error Scenario Tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Default to successful email service
    mockCreateEmailService.mockReturnValue(mockEmailService);
    mockSendEmailWithRetry.mockResolvedValue(true);
    mockEmailService.sendVerificationEmail.mockResolvedValue(true);

    // Setup default database mocks
    mockDb.returning.mockResolvedValue([]);
    mockDb.execute.mockResolvedValue([]);
  });

  describe('Email Service Failure Handling and Retry Logic', () => {
    it('should handle email service errors during code generation', async () => {
      // Mock email service to fail
      mockSendEmailWithRetry.mockRejectedValue(new EmailServiceError('Quota exceeded', 'QUOTA_EXCEEDED'));

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

      // Generate verification code (should work even if email fails)
      const verificationCode = await emailVerificationCodeService.generateCode(mockUser.id);
      expect(verificationCode).toMatch(/^\d{6}$/);

      // Verify database operations were called
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should handle different types of email service errors', async () => {
      // Mock user data
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isEmailVerified: false,
      };

      // Mock user lookup
      mockGetUserById.mockResolvedValue(mockUser);

      // Test API error
      mockSendEmailWithRetry.mockRejectedValue(new EmailServiceError('API error', 'API_ERROR'));
      mockDb.returning.mockResolvedValueOnce([{ id: 1, code: '123456', userId: 1 }]);
      
      const code1 = await emailVerificationCodeService.generateCode(mockUser.id);
      expect(code1).toMatch(/^\d{6}$/);

      // Test network error
      mockSendEmailWithRetry.mockRejectedValue(new EmailServiceError('Network timeout', 'NETWORK_ERROR'));
      mockDb.returning.mockResolvedValueOnce([{ id: 2, code: '654321', userId: 1 }]);
      
      const code2 = await emailVerificationCodeService.generateCode(mockUser.id);
      expect(code2).toMatch(/^\d{6}$/);
      expect(code2).not.toBe(code1); // Should be different code

      // Verify database operations were called
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });
  });

  describe('Expired Code Scenarios and Cleanup Processes', () => {
    it('should handle expired verification codes properly', async () => {
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
        expiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago
        attemptsUsed: 0,
      }]);

      // Try to verify with expired code using service
      try {
        await emailVerificationCodeService.validateCode('test@example.com', '123456');
        fail('Should have thrown an error for expired code');
      } catch (error: any) {
        expect(error.code).toBe('CODE_EXPIRED');
      }
    });

    it('should clean up expired codes during verification service operations', async () => {
      // Mock expired codes for cleanup
      mockDb.returning.mockResolvedValueOnce([
        { id: 1, code: '111111', expiresAt: new Date(Date.now() - 60000) },
        { id: 2, code: '222222', expiresAt: new Date(Date.now() - 120000) },
      ]);

      // Trigger cleanup by calling the service method
      await emailVerificationCodeService.cleanupExpiredCodes();

      // Verify delete was called for expired codes
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('Concurrent Verification Attempts and Race Conditions', () => {
    it('should handle concurrent verification attempts safely', async () => {
      // Mock user data
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isEmailVerified: false,
      };

      // Mock user lookup
      mockGetUserByEmail.mockResolvedValue(mockUser);

      // Mock valid code lookup
      mockDb.returning.mockResolvedValue([{
        id: 1,
        code: '123456',
        userId: 1,
        expiresAt: new Date(Date.now() + 600000),
        attemptsUsed: 0,
      }]);

      // Execute concurrent verification attempts
      const promises = [
        emailVerificationCodeService.validateCode('test@example.com', '123456'),
        emailVerificationCodeService.validateCode('test@example.com', '123456'),
      ];

      // One should succeed, one might fail due to race conditions
      const results = await Promise.allSettled(promises);
      
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;

      // At least one should succeed
      expect(successCount).toBeGreaterThanOrEqual(1);

      // Verify database operations were called
      expect(mockDb.update).toHaveBeenCalled(); // User marked as verified
      expect(mockDb.delete).toHaveBeenCalled(); // Code deleted
    });

    it('should handle concurrent code generation requests safely', async () => {
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

      // Execute concurrent code generation requests
      const promises = [
        emailVerificationCodeService.generateCode(mockUser.id),
        emailVerificationCodeService.generateCode(mockUser.id),
      ];

      const codes = await Promise.all(promises);

      // Both should succeed and return valid codes
      expect(codes[0]).toMatch(/^\d{6}$/);
      expect(codes[1]).toMatch(/^\d{6}$/);

      // Verify database operations were called
      expect(mockDb.delete).toHaveBeenCalled(); // Old codes deleted
      expect(mockDb.insert).toHaveBeenCalled(); // New codes inserted
    });
  });

  describe('Database Error Scenarios', () => {
    it('should handle maximum attempts reached', async () => {
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

    it('should handle service errors during validation', async () => {
      // Test with non-existent user
      mockGetUserByEmail.mockResolvedValue(null);

      try {
        await emailVerificationCodeService.validateCode('nonexistent@example.com', '123456');
        fail('Should have thrown an error for non-existent user');
      } catch (error: any) {
        expect(error.code).toBe('USER_NOT_FOUND');
      }
    });
  });
});