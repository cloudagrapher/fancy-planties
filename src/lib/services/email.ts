import 'server-only';

import { Resend } from 'resend';
import { emailConfig } from '@/lib/config/email';

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

export class ResendEmailService implements EmailService {
  private resend: Resend;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.resend = new Resend(config.apiKey);
    this.config = config;
  }

  async sendVerificationEmail(email: string, code: string, name: string): Promise<boolean> {
    return await this.sendEmailWithRetry(email, code, name, 3);
  }

  private async sendEmailWithRetry(
    email: string,
    code: string,
    name: string,
    maxRetries: number
  ): Promise<boolean> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await this.resend.emails.send({
          from: `${this.config.fromName} <${this.config.fromEmail}>`,
          to: [email],
          subject: 'Verify your email address',
          html: this.generateVerificationEmailTemplate(code, name),
        });

        if (error) {
          throw new EmailServiceError(
            `Resend API error: ${error.message}`,
            this.mapResendErrorCode(error)
          );
        }

        if (data?.id) {
          // Log success in development
          if (emailConfig.logEmailCodes) {
            console.log(`✅ Verification email sent to ${email} with code: ${code}`);
          }
          return true;
        }

        throw new EmailServiceError('No email ID returned from Resend', 'API_ERROR');

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Log attempt in development
        if (emailConfig.isDevelopment) {
          console.log(`❌ Email send attempt ${attempt}/${maxRetries} failed:`, lastError.message);
        }

        // Don't retry on certain errors
        if (error instanceof EmailServiceError && 
            (error.code === 'INVALID_EMAIL' || error.code === 'QUOTA_EXCEEDED')) {
          throw error;
        }

        // Wait before retry with exponential backoff
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new EmailServiceError('All retry attempts failed', 'API_ERROR');
  }

  private mapResendErrorCode(error: any): EmailServiceError['code'] {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('quota') || message.includes('limit')) {
      return 'QUOTA_EXCEEDED';
    }
    if (message.includes('invalid') && message.includes('email')) {
      return 'INVALID_EMAIL';
    }
    if (message.includes('network') || message.includes('timeout')) {
      return 'NETWORK_ERROR';
    }
    
    return 'API_ERROR';
  }

  private generateVerificationEmailTemplate(code: string, name: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #22c55e;
            margin-bottom: 10px;
          }
          .code-container {
            background: #f8f9fa;
            border: 2px dashed #22c55e;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
          }
          .verification-code {
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #22c55e;
            font-family: 'Courier New', monospace;
          }
          .instructions {
            background: #e7f3ff;
            border-left: 4px solid #2196f3;
            padding: 15px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 12px;
            margin: 20px 0;
            color: #856404;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🌱 Fancy Planties</div>
            <h1>Verify Your Email Address</h1>
          </div>
          
          <p>Hi ${name},</p>
          
          <p>Welcome to Fancy Planties! To complete your account setup and start tracking your plants, please verify your email address using the code below:</p>
          
          <div class="code-container">
            <div class="verification-code">${code}</div>
          </div>
          
          <div class="instructions">
            <strong>How to verify:</strong>
            <ol>
              <li>Return to the Fancy Planties verification page</li>
              <li>Enter the 6-digit code above</li>
              <li>Click "Verify Email" to complete your registration</li>
            </ol>
          </div>
          
          <div class="warning">
            <strong>⏰ Important:</strong> This verification code will expire in ${emailConfig.codeExpiryMinutes} minutes for security reasons. If you need a new code, you can request one on the verification page.
          </div>
          
          <p>If you didn't create an account with Fancy Planties, you can safely ignore this email.</p>
          
          <div class="footer">
            <p>Happy planting! 🌿</p>
            <p><strong>The Fancy Planties Team</strong></p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #999;">
              This is an automated message. Please do not reply to this email.<br>
              If you have questions, visit our support page or contact us through the app.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// Factory function to create email service instance
export function createEmailService(): EmailService {
  const config: EmailConfig = {
    apiKey: process.env.RESEND_API_KEY!,
    fromEmail: emailConfig.fromEmail,
    fromName: emailConfig.fromName,
  };

  if (!config.apiKey) {
    throw new Error('RESEND_API_KEY environment variable is required');
  }

  return new ResendEmailService(config);
}