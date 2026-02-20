import 'server-only';
import { Resend } from 'resend';
import { EmailService, EmailConfig, EmailServiceError } from './email-service';
import { emailServiceMonitor } from './email-service-monitor';

// Escape HTML special characters to prevent injection in email templates
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class ResendEmailService implements EmailService {
  private resend: Resend;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.resend = new Resend(config.apiKey);
    this.config = config;
  }

  async sendPasswordResetEmail(email: string, resetToken: string, name: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`;
      
      const { data, error } = await this.resend.emails.send({
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to: [email],
        subject: 'Reset your password',
        html: this.generatePasswordResetEmailTemplate(resetUrl, name),
        text: this.generatePasswordResetEmailText(resetUrl, name),
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
      
      if (process.env.NODE_ENV === 'development') console.log('Password reset email sent successfully:', data?.id);
      return true;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      if (error instanceof EmailServiceError) {
        // Already recorded in monitor above
        throw error;
      }
      
      console.error('Network error sending password reset email:', error);
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
      
      if (process.env.NODE_ENV === 'development') console.log('Verification email sent successfully:', data?.id);
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
    const safeName = escapeHtml(name);
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
        
        <p>Hi ${safeName},</p>
        
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

  private generatePasswordResetEmailTemplate(resetUrl: string, name: string): string {
    const safeName = escapeHtml(name);
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
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
          .reset-button {
            display: inline-block;
            background: #22c55e;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
          }
          .reset-link {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
            word-break: break-all;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            font-size: 14px;
            color: #6c757d;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🌱 Fancy Planties</div>
          <h1>Password Reset Request</h1>
        </div>
        
        <p>Hi ${safeName},</p>
        
        <p>We received a request to reset your password for your Fancy Planties account. If you made this request, click the button below to reset your password:</p>
        
        <div style="text-align: center;">
          <a href="${resetUrl}" class="reset-button">Reset Your Password</a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        
        <div class="reset-link">
          <a href="${resetUrl}">${resetUrl}</a>
        </div>
        
        <div class="warning">
          <strong>Security Notice:</strong> This password reset link will expire in 1 hour for your security. If you didn't request this password reset, you can safely ignore this email.
        </div>
        
        <p>If you're having trouble or didn't request this reset, please contact our support team.</p>
        
        <div class="footer">
          <p>This is an automated message from Fancy Planties. Please do not reply to this email.</p>
          <p>Need help? Contact us at support@fancy-planties.cloudagrapher.com</p>
        </div>
      </body>
      </html>
    `;
  }

  private generatePasswordResetEmailText(resetUrl: string, name: string): string {
    return `
Hi ${name},

We received a request to reset your password for your Fancy Planties account.

To reset your password, click this link or copy it into your browser:
${resetUrl}

This link will expire in 1 hour for your security.

If you didn't request this password reset, you can safely ignore this email.

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