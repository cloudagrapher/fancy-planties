import 'server-only';
import { createEmailService } from './resend-email-service';
import { getEmailVerificationConfig } from './email-config';
import { logVerificationCodeInDevelopment, getEmailServiceStatus } from '../utils/email-dev-logger';

/**
 * Test email service configuration and send a test email
 * This is useful for verifying the setup during development
 */
export async function testEmailService(testEmail?: string): Promise<{
  success: boolean;
  message: string;
  config: ReturnType<typeof getEmailServiceStatus>;
}> {
  const config = getEmailServiceStatus();
  
  if (!config.configured) {
    return {
      success: false,
      message: 'Email service not configured. Please set RESEND_API_KEY and FROM_EMAIL environment variables.',
      config,
    };
  }

  if (!testEmail) {
    return {
      success: true,
      message: 'Email service is configured but no test email provided.',
      config,
    };
  }

  try {
    const emailService = createEmailService();
    const testCode = '123456';
    
    // Log in development
    logVerificationCodeInDevelopment(testEmail, testCode);
    
    // Send test email
    const success = await emailService.sendVerificationEmail(testEmail, testCode, 'Test User');
    
    return {
      success,
      message: success 
        ? `Test verification email sent successfully to ${testEmail}` 
        : 'Failed to send test email',
      config,
    };
    
  } catch (error) {
    return {
      success: false,
      message: `Email service test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      config,
    };
  }
}

/**
 * Validate email service configuration without sending emails
 */
export function validateEmailServiceConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    const config = getEmailVerificationConfig();
    
    // Check API key
    if (!config.apiKey || config.apiKey === 're_xxxxxxxxxx' || config.apiKey === 're_development_key') {
      if (process.env.NODE_ENV === 'production') {
        errors.push('Production environment requires a valid RESEND_API_KEY');
      } else {
        warnings.push('Development environment using placeholder API key');
      }
    }
    
    // Check email domain
    if (!config.fromEmail.includes('fancy-planties.cloudagrapher.com')) {
      warnings.push('FROM_EMAIL should use the configured domain: fancy-planties.cloudagrapher.com');
    }
    
    // Check configuration values
    if (config.codeExpiryMinutes < 5) {
      warnings.push('Code expiry time is very short (< 5 minutes)');
    }
    
    if (config.maxVerificationAttempts > 10) {
      warnings.push('Max verification attempts is very high (> 10)');
    }
    
  } catch (error) {
    errors.push(`Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}