import 'server-only';

export interface EmailVerificationConfig {
  // Email service settings
  apiKey: string;
  fromEmail: string;
  fromName: string;
  
  // Verification settings
  codeExpiryMinutes: number;
  maxVerificationAttempts: number;
  resendCooldownSeconds: number;
  maxResendPerHour: number;
}

/**
 * Load and validate email verification configuration from environment variables
 */
export function loadEmailVerificationConfig(): EmailVerificationConfig {
  const config: EmailVerificationConfig = {
    // Email service
    apiKey: process.env.RESEND_API_KEY || '',
    fromEmail: process.env.FROM_EMAIL || 'send.mail.fancy-planties.cloudagrapher.com',
    fromName: process.env.FROM_NAME || 'Fancy Planties',
    
    // Verification settings with defaults
    codeExpiryMinutes: parseInt(process.env.VERIFICATION_CODE_EXPIRY_MINUTES || '10'),
    maxVerificationAttempts: parseInt(process.env.MAX_VERIFICATION_ATTEMPTS || '5'),
    resendCooldownSeconds: parseInt(process.env.RESEND_COOLDOWN_SECONDS || '60'),
    maxResendPerHour: parseInt(process.env.MAX_RESEND_PER_HOUR || '5'),
  };

  // Validate required fields
  const errors: string[] = [];
  
  if (!config.apiKey || config.apiKey === 're_xxxxxxxxxx') {
    errors.push('RESEND_API_KEY is required and must be a valid API key');
  }
  
  if (!config.fromEmail) {
    errors.push('FROM_EMAIL is required');
  }
  
  if (config.codeExpiryMinutes < 1 || config.codeExpiryMinutes > 60) {
    errors.push('VERIFICATION_CODE_EXPIRY_MINUTES must be between 1 and 60');
  }
  
  if (config.maxVerificationAttempts < 1 || config.maxVerificationAttempts > 10) {
    errors.push('MAX_VERIFICATION_ATTEMPTS must be between 1 and 10');
  }
  
  if (config.resendCooldownSeconds < 30 || config.resendCooldownSeconds > 300) {
    errors.push('RESEND_COOLDOWN_SECONDS must be between 30 and 300');
  }
  
  if (config.maxResendPerHour < 1 || config.maxResendPerHour > 20) {
    errors.push('MAX_RESEND_PER_HOUR must be between 1 and 20');
  }

  if (errors.length > 0) {
    throw new Error(`Email verification configuration errors:\n${errors.join('\n')}`);
  }

  return config;
}

/**
 * Get configuration with safe defaults for development
 */
export function getEmailVerificationConfig(): EmailVerificationConfig {
  try {
    return loadEmailVerificationConfig();
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Email verification config error (using defaults):', error);
      
      // Return safe defaults for development
      return {
        apiKey: 're_development_key',
        fromEmail: 'send.mail.fancy-planties.cloudagrapher.com',
        fromName: 'Fancy Planties',
        codeExpiryMinutes: 10,
        maxVerificationAttempts: 5,
        resendCooldownSeconds: 60,
        maxResendPerHour: 5,
      };
    }
    
    throw error;
  }
}