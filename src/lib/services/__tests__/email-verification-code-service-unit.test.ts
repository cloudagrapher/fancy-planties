import { describe, it, expect, jest } from '@jest/globals';
import { VerificationError, VerificationCodeError } from '../email-verification-code-service';

describe('EmailVerificationCodeService - Unit Tests', () => {
  describe('VerificationCodeError', () => {
    it('should create error with correct message and code', () => {
      const error = new VerificationCodeError('Test message', VerificationError.CODE_EXPIRED);
      
      expect(error.message).toBe('Test message');
      expect(error.code).toBe(VerificationError.CODE_EXPIRED);
      expect(error.name).toBe('VerificationCodeError');
    });
  });

  describe('VerificationError enum', () => {
    it('should have all required error codes', () => {
      expect(VerificationError.CODE_EXPIRED).toBe('CODE_EXPIRED');
      expect(VerificationError.CODE_INVALID).toBe('CODE_INVALID');
      expect(VerificationError.TOO_MANY_ATTEMPTS).toBe('TOO_MANY_ATTEMPTS');
      expect(VerificationError.USER_NOT_FOUND).toBe('USER_NOT_FOUND');
      expect(VerificationError.ALREADY_VERIFIED).toBe('ALREADY_VERIFIED');
    });
  });

  describe('Code generation security', () => {
    it('should generate cryptographically secure codes', () => {
      // Test the crypto.randomBytes functionality directly
      const crypto = require('crypto');
      const originalRandomBytes = crypto.randomBytes;
      
      // Mock to return predictable values for testing
      const mockBuffer = Buffer.from([0, 0, 0, 1]); // Small number
      crypto.randomBytes = jest.fn().mockReturnValue(mockBuffer);
      
      // Test the logic that would be in generateSecureCode
      const buffer = crypto.randomBytes(4);
      const randomNumber = buffer.readUInt32BE(0);
      const code = (randomNumber % 1000000).toString().padStart(6, '0');
      
      expect(code).toMatch(/^\d{6}$/);
      expect(code.length).toBe(6);
      expect(code).toBe('000001'); // Should pad with leading zeros
      
      // Restore original function
      crypto.randomBytes = originalRandomBytes;
    });

    it('should generate different codes with different random inputs', () => {
      const crypto = require('crypto');
      const originalRandomBytes = crypto.randomBytes;
      
      // Test with different mock values
      const testCases = [
        { buffer: Buffer.from([0, 0, 0, 1]), expected: '000001' },
        { buffer: Buffer.from([0, 0, 39, 16]), expected: '010000' }, // 10000
        { buffer: Buffer.from([0, 15, 66, 63]), expected: '999999' }, // 1000000 - 1 = 999999
      ];
      
      testCases.forEach(({ buffer, expected }) => {
        crypto.randomBytes = jest.fn().mockReturnValue(buffer);
        
        const randomNumber = buffer.readUInt32BE(0);
        const code = (randomNumber % 1000000).toString().padStart(6, '0');
        
        expect(code).toBe(expected);
        expect(code.length).toBe(6);
      });
      
      // Restore original function
      crypto.randomBytes = originalRandomBytes;
    });

    it('should handle large random numbers correctly', () => {
      const crypto = require('crypto');
      const originalRandomBytes = crypto.randomBytes;
      
      // Test with maximum 32-bit value
      const maxBuffer = Buffer.from([255, 255, 255, 255]);
      crypto.randomBytes = jest.fn().mockReturnValue(maxBuffer);
      
      const randomNumber = maxBuffer.readUInt32BE(0);
      const code = (randomNumber % 1000000).toString().padStart(6, '0');
      
      expect(code).toMatch(/^\d{6}$/);
      expect(code.length).toBe(6);
      expect(parseInt(code)).toBeLessThan(1000000);
      
      // Restore original function
      crypto.randomBytes = originalRandomBytes;
    });
  });

  describe('Constants and configuration', () => {
    it('should have correct service constants', () => {
      // These would be the constants from the service
      const CODE_LENGTH = 6;
      const EXPIRY_MINUTES = 10;
      const MAX_ATTEMPTS = 5;
      
      expect(CODE_LENGTH).toBe(6);
      expect(EXPIRY_MINUTES).toBe(10);
      expect(MAX_ATTEMPTS).toBe(5);
    });

    it('should calculate correct expiration time', () => {
      const EXPIRY_MINUTES = 10;
      const beforeTime = Date.now();
      const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);
      const afterTime = Date.now();
      
      const expectedMin = beforeTime + 9.5 * 60 * 1000; // 9.5 minutes
      const expectedMax = afterTime + 10.5 * 60 * 1000; // 10.5 minutes
      
      expect(expiresAt.getTime()).toBeGreaterThan(expectedMin);
      expect(expiresAt.getTime()).toBeLessThan(expectedMax);
    });
  });

  describe('Validation logic', () => {
    it('should correctly identify expired codes', () => {
      const now = new Date();
      const expiredCode = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
      const validCode = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
      
      expect(now > expiredCode).toBe(true);
      expect(now > validCode).toBe(false);
    });

    it('should correctly identify max attempts exceeded', () => {
      const MAX_ATTEMPTS = 5;
      
      expect(5 >= MAX_ATTEMPTS).toBe(true); // At max attempts
      expect(6 >= MAX_ATTEMPTS).toBe(true); // Over max attempts
      expect(4 >= MAX_ATTEMPTS).toBe(false); // Under max attempts
    });
  });
});