/**
 * Integration test for email service
 * Tests that the email service can be properly instantiated and configured
 */

import { createEmailService, EmailServiceError } from '@/lib/services/email';
import { getEmailErrorMessage } from '@/lib/utils/email-errors';

// Mock environment variables for testing
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
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

afterEach(() => {
  process.env = originalEnv;
});

describe('Email Service Integration', () => {
  it('should create email service with environment configuration', () => {
    expect(() => createEmailService()).not.toThrow();
  });

  it('should throw error when RESEND_API_KEY is missing', () => {
    delete process.env.RESEND_API_KEY;
    
    expect(() => createEmailService()).toThrow('RESEND_API_KEY environment variable is required');
  });

  it('should use default values when optional env vars are missing', () => {
    delete process.env.FROM_EMAIL;
    delete process.env.FROM_NAME;
    
    expect(() => createEmailService()).not.toThrow();
  });

  it('should handle email service errors gracefully', () => {
    const quotaError = new EmailServiceError('Quota exceeded', 'QUOTA_EXCEEDED');
    const message = getEmailErrorMessage(quotaError);
    
    expect(message).toContain('temporarily unavailable');
  });

  it('should provide user-friendly error messages', () => {
    const networkError = new EmailServiceError('Network timeout', 'NETWORK_ERROR');
    const message = getEmailErrorMessage(networkError);
    
    expect(message).toContain('Network error occurred');
    expect(message).not.toContain('timeout'); // Should not expose technical details
  });
});