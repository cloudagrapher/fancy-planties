import { EmailServiceError } from '@/lib/services/email';
import { getEmailErrorMessage, shouldRetryEmailOperation } from '../email-errors';

describe('Email Error Utilities', () => {
  describe('getEmailErrorMessage', () => {
    it('should return specific message for quota exceeded error', () => {
      const error = new EmailServiceError('Quota exceeded', 'QUOTA_EXCEEDED');
      const message = getEmailErrorMessage(error);
      
      expect(message).toContain('temporarily unavailable');
    });

    it('should return specific message for invalid email error', () => {
      const error = new EmailServiceError('Invalid email', 'INVALID_EMAIL');
      const message = getEmailErrorMessage(error);
      
      expect(message).toContain('email address appears to be invalid');
    });

    it('should return specific message for network error', () => {
      const error = new EmailServiceError('Network timeout', 'NETWORK_ERROR');
      const message = getEmailErrorMessage(error);
      
      expect(message).toContain('Network error occurred');
    });

    it('should return generic message for API error', () => {
      const error = new EmailServiceError('API error', 'API_ERROR');
      const message = getEmailErrorMessage(error);
      
      expect(message).toContain('Unable to send verification email');
    });

    it('should return generic message for regular Error', () => {
      const error = new Error('Some error');
      const message = getEmailErrorMessage(error);
      
      expect(message).toContain('Unable to send verification email');
    });

    it('should return generic message for unknown error', () => {
      const message = getEmailErrorMessage('string error');
      
      expect(message).toContain('An unexpected error occurred');
    });
  });

  describe('shouldRetryEmailOperation', () => {
    it('should not retry for invalid email error', () => {
      const error = new EmailServiceError('Invalid email', 'INVALID_EMAIL');
      
      expect(shouldRetryEmailOperation(error)).toBe(false);
    });

    it('should not retry for quota exceeded error', () => {
      const error = new EmailServiceError('Quota exceeded', 'QUOTA_EXCEEDED');
      
      expect(shouldRetryEmailOperation(error)).toBe(false);
    });

    it('should retry for network error', () => {
      const error = new EmailServiceError('Network error', 'NETWORK_ERROR');
      
      expect(shouldRetryEmailOperation(error)).toBe(true);
    });

    it('should retry for API error', () => {
      const error = new EmailServiceError('API error', 'API_ERROR');
      
      expect(shouldRetryEmailOperation(error)).toBe(true);
    });

    it('should retry for regular Error', () => {
      const error = new Error('Some error');
      
      expect(shouldRetryEmailOperation(error)).toBe(true);
    });
  });
});