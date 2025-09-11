import 'server-only';
import { Resend } from 'resend';
import { EmailService, EmailConfig, EmailServiceError } from './email-service';
import { emailServiceMonitor } from './email-service-monitor';

export class ResendEmailService implements EmailService {
  private resend: Resend;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.resend = new Resend(config.apiKey);
    this.config = config;
  }

  async sendVerificationEmail(email: string, code: string, name: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const { data, error } = await this.resend.emails.send({
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to: [email],
        subject: 'Verify your email address',
        html: this.generateVerificationEmailTemplate(code, name),
        text: this.generateVerificationEmailText(code, name),
      });

      const responseTime = Date.now() - startTime;

      if (error) {
        console.error('Resend API error:', error);
        
        // Map Resend errors to our error types
        let emailError: EmailServiceError;
        if (error.message?.includes('quota') || error.message?.includes('limit')) {
          emailError = new EmailServiceError('Email quota exceeded', 'QUOTA_EXCEEDED');
        } else if (error.message?.includes('invalid') && error.message?.includes('email')) {
          emailError = new EmailServiceError('Invalid email address', 'INVALID_EMAIL');
        } else {
          emailError = new EmailServiceError(`Resend API error: ${error.message}`, 'API_ERROR');
        }
        
        // Record failure in monitor
        emailServiceMonitor.recordFailure(
          { message: emailError.message, code: emailError.code },
          responseTime
        );
        
        throw emailError;
      }

      // Record success in monitor
      emailServiceMonitor.recordSuccess(responseTime);
      
      console.log('Verification email sent successfully:', data?.id);
      return true;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      if (error instanceof EmailServiceError) {
        // Already recorded in monitor above
        throw error;
      }
      
      console.error('Network error sending email:', error);
      const networkError = new EmailServiceError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NETWORK_ERROR'
      );
      
      // Record network error in monitor
      emailServiceMonitor.recordFailure(
        { message: networkError.message, code: networkError.code },
        responseTime
      );
      
      throw networkError;
    }
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
          .verification-code {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
          }
          .code {
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 4px;
            color: #22c55e;
            font-family: 'Courier New', monospace;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            font-size: 14px;
            color: #6c757d;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🌱 Fancy Planties</div>
          <h1>Verify Your Email Address</h1>
        </div>
        
        <p>Hi ${name},</p>
        
        <p>Welcome to Fancy Planties! To complete your account setup, please verify your email address by entering the verification code below:</p>
        
        <div class="verification-code">
          <div class="code">${code}</div>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #6c757d;">
            This code expires in 10 minutes
          </p>
        </div>
        
        <p>If you didn't create an account with Fancy Planties, you can safely ignore this email.</p>
        
        <div class="footer">
          <p>This is an automated message from Fancy Planties. Please do not reply to this email.</p>
          <p>Need help? Contact us at support@fancy-planties.cloudagrapher.com</p>
        </div>
      </body>
      </html>
    `;
  }

  private generateVerificationEmailText(code: string, name: string): string {
    return `
Hi ${name},

Welcome to Fancy Planties! To complete your account setup, please verify your email address by entering the verification code below:

Verification Code: ${code}

This code expires in 10 minutes.

If you didn't create an account with Fancy Planties, you can safely ignore this email.

---
This is an automated message from Fancy Planties. Please do not reply to this email.
Need help? Contact us at support@fancy-planties.cloudagrapher.com
    `.trim();
  }
}

// Factory function to create email service instance
export function createEmailService(): EmailService {
  const config: EmailConfig = {
    apiKey: process.env.RESEND_API_KEY!,
    fromEmail: process.env.FROM_EMAIL || 'send.mail.fancy-planties.cloudagrapher.com',
    fromName: process.env.FROM_NAME || 'Fancy Planties',
  };

  if (!config.apiKey) {
    throw new Error('RESEND_API_KEY environment variable is required');
  }

  return new ResendEmailService(config);
}