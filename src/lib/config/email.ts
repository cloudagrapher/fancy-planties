export const emailConfig = {
  // Verification code settings
  codeExpiryMinutes: parseInt(process.env.VERIFICATION_CODE_EXPIRY_MINUTES || '10'),
  maxVerificationAttempts: parseInt(process.env.MAX_VERIFICATION_ATTEMPTS || '5'),
  
  // Resend settings  
  resendCooldownSeconds: parseInt(process.env.RESEND_COOLDOWN_SECONDS || '60'),
  maxResendPerHour: parseInt(process.env.MAX_RESEND_PER_HOUR || '5'),
  
  // Email service settings
  fromEmail: process.env.FROM_EMAIL || 'send.mail.fancy-planties.cloudagrapher.com',
  fromName: process.env.FROM_NAME || 'Fancy Planties',
  
  // Development settings
  isDevelopment: process.env.NODE_ENV === 'development',
  logEmailCodes: process.env.NODE_ENV === 'development',
} as const;

export type EmailConfig = typeof emailConfig;