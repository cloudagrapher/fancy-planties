import { NextRequest, NextResponse } from 'next/server';
import { passwordResetRequestSchema, validateInput } from '@/lib/auth/validation';
import { withRateLimit } from '@/lib/auth/middleware';
import { passwordResetService } from '@/lib/services/password-reset-service';
import { sendPasswordResetEmailWithRetry, EmailServiceError } from '@/lib/services/email-service';
import { createEmailService } from '@/lib/services/resend-email-service';

export async function POST(request: NextRequest) {
  return withRateLimit(request, async (req) => {
    try {
      const body = await req.json();
      
      // Validate input
      const validation = validateInput(passwordResetRequestSchema, body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', errors: validation.errors },
          { status: 400 }
        );
      }
      
      const { email } = validation.data;
      
      // Find user by email
      const user = await passwordResetService.findUserByEmail(email);
      
      // Always return success to prevent email enumeration attacks
      const successResponse = {
        success: true,
        message: 'If an account with that email exists, we\'ve sent you a password reset link.',
      };
      
      if (!user) {
        // User doesn't exist, but still return success
        return NextResponse.json(successResponse);
      }
      
      try {
        // Generate password reset token
        const resetToken = await passwordResetService.generateToken(user.id);
        
        // Send password reset email
        const emailService = createEmailService();
        await sendPasswordResetEmailWithRetry(emailService, email, resetToken, user.name);
        
        if (process.env.NODE_ENV === 'development') {
          if (process.env.NODE_ENV === 'development') console.log(`Password reset email sent to ${email} for user ${user.id}`);
        }
        
        return NextResponse.json(successResponse);
        
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        
        // If email sending fails, still return success but log the error
        if (emailError instanceof EmailServiceError) {
          console.error(`Email service error for password reset: ${emailError.code} - ${emailError.message}`);
        }
        
        // Always return success for security (prevents email enumeration)
        return NextResponse.json(successResponse);
      }
      
    } catch (error) {
      console.error('Forgot password error:', error);
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}