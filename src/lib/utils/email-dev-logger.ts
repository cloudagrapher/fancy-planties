import 'server-only';

/**
 * Development utility to log verification codes to console
 * This helps during development when email service might not be configured
 */
export function logVerificationCodeInDevelopment(email: string, code: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('\n' + '='.repeat(50));
    console.log('📧 VERIFICATION CODE (Development Only)');
    console.log('='.repeat(50));
    console.log(`Email: ${email}`);
    console.log(`Code:  ${code}`);
    console.log('='.repeat(50) + '\n');
  }
}

/**
 * Check if email service is properly configured
 */
export function isEmailServiceConfigured(): boolean {
  return !!(
    process.env.RESEND_API_KEY &&
    process.env.FROM_EMAIL &&
    process.env.RESEND_API_KEY !== 're_xxxxxxxxxx'
  );
}

/**
 * Get email service configuration status for debugging
 */
export function getEmailServiceStatus(): {
  configured: boolean;
  hasApiKey: boolean;
  hasFromEmail: boolean;
  isDevelopment: boolean;
} {
  return {
    configured: isEmailServiceConfigured(),
    hasApiKey: !!(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_xxxxxxxxxx'),
    hasFromEmail: !!process.env.FROM_EMAIL,
    isDevelopment: process.env.NODE_ENV === 'development',
  };
}