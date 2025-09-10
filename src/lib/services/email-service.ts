import 'server-only';

export interface EmailService {
  sendVerificationEmail(email: string, code: string, name: string): Promise<boolean>;
}

export interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export class EmailServiceError extends Error {
  constructor(
    message: string,
    public code: 'QUOTA_EXCEEDED' | 'API_ERROR' | 'NETWORK_ERROR' | 'INVALID_EMAIL'
  ) {
    super(message);
    this.name = 'EmailServiceError';
  }
}

/**
 * Send email with retry logic and exponential backoff
 */
export async function sendEmailWithRetry(
  emailService: EmailService,
  email: string,
  code: string,
  name: string,
  maxRetries = 3
): Promise<boolean> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const success = await emailService.sendVerificationEmail(email, code, name);
      if (success) {
        return true;
      }
      throw new Error('Email service returned false');
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (error instanceof EmailServiceError && 
          (error.code === 'INVALID_EMAIL' || error.code === 'QUOTA_EXCEEDED')) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}