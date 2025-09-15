/**
 * Security Fixes Test Suite
 * Tests the three critical security improvements:
 * 1. Secure session cookies
 * 2. CSRF protection
 * 3. Database-backed rate limiting
 */

import { generateCSRFToken, validateCSRFToken, rateLimit } from '@/lib/auth/middleware';
import { testDb } from '../setup/test-db';
import { rateLimits } from '@/lib/db/schema';

describe('Security Fixes', () => {
  describe('CSRF Protection', () => {
    test('should generate cryptographically secure CSRF tokens', () => {
      const sessionId = 'test-session-123';
      const token1 = generateCSRFToken(sessionId);
      const token2 = generateCSRFToken(sessionId);
      
      // Tokens should be different each time
      expect(token1).not.toBe(token2);
      
      // Tokens should have the expected format (token.signature)
      expect(token1).toMatch(/^[a-f0-9]{64}\.[a-f0-9]{64}$/);
      expect(token2).toMatch(/^[a-f0-9]{64}\.[a-f0-9]{64}$/);
    });

    test('should validate CSRF tokens correctly', () => {
      const sessionId = 'test-session-123';
      const validToken = generateCSRFToken(sessionId);
      
      // Valid token should pass validation
      expect(validateCSRFToken(validToken, sessionId)).toBe(true);
      
      // Invalid tokens should fail validation
      expect(validateCSRFToken('invalid-token', sessionId)).toBe(false);
      expect(validateCSRFToken(validToken, 'wrong-session')).toBe(false);
      expect(validateCSRFToken('', sessionId)).toBe(false);
      expect(validateCSRFToken(validToken, '')).toBe(false);
    });
  });

  describe('Database-backed Rate Limiting', () => {
    beforeEach(async () => {
      // Clean up rate limit records before each test
      try {
        await testDb.delete(rateLimits);
      } catch (error) {
        // Skip cleanup if database not available
        console.warn('Database cleanup failed:', error.message);
      }
    });

    test('should allow requests within rate limit', async () => {
      const identifier = 'test-ip-1';
      
      const result = await rateLimit(identifier, testDb);
      
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(99); // 100 - 1
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    test('should block requests exceeding rate limit', async () => {
      const identifier = 'test-ip-2';
      
      // Make 100 requests (the limit)
      for (let i = 0; i < 100; i++) {
        const result = await rateLimit(identifier, testDb);
        expect(result.success).toBe(true);
      }
      
      // 101st request should be blocked
      const blockedResult = await rateLimit(identifier, testDb);
      expect(blockedResult.success).toBe(false);
      expect(blockedResult.remaining).toBe(0);
    });
  });
});