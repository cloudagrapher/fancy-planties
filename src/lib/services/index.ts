import 'server-only';

// Re-export email service types and functions
export type { EmailService, EmailConfig } from './email-service';
export { EmailServiceError, sendEmailWithRetry } from './email-service';
export { ResendEmailService, createEmailService } from './resend-email-service';

// Re-export configuration types and functions
export type { EmailVerificationConfig } from './email-config';
export { loadEmailVerificationConfig, getEmailVerificationConfig } from './email-config';