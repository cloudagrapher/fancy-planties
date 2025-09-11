import { EmailServiceError } from '@/lib/services/email';

export function getEmailErrorMessage(error: unknown): string {
  if (error instanceof EmailServiceError) {
    switch (error.code) {
      case 'QUOTA_EXCEEDED':
        return 'Email service is temporarily unavailable. Please try again later or contact support.';
      case 'INVALID_EMAIL':
        return 'The email address appears to be invalid. Please check and try again.';
      case 'NETWORK_ERROR':
        return 'Network error occurred while sending email. Please check your connection and try again.';
      case 'API_ERROR':
      default:
        return 'Unable to send verification email at this time. Please try again in a few minutes.';
    }
  }

  if (error instanceof Error) {
    // Log the actual error for debugging but return generic message
    console.error('Unexpected email error:', error.message);
    return 'Unable to send verification email. Please try again later.';
  }

  return 'An unexpected error occurred. Please try again.';
}

export function shouldRetryEmailOperation(error: unknown): boolean {
  if (error instanceof EmailServiceError) {
    // Don't retry on these errors
    return !['INVALID_EMAIL', 'QUOTA_EXCEEDED'].includes(error.code);
  }
  
  // Retry on other errors
  return true;
}