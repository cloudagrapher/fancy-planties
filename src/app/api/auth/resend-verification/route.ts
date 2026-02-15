import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { emailVerificationCodeService, VerificationCodeError, VerificationError } from '@/lib/services/email-verification-code-service';
import { sendEmailWithRetry, EmailServiceError } from '@/lib/services/email-service';
import { createEmailService } from '@/lib/services/resend-email-service';
import { getUserByEmail } from '@/lib/auth';
import { withResendRateLimit } from '@/lib/auth/email-verification-middleware';

// Validation schema for resend verification request
const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Note: Rate limiting is handled by the withResendRateLimit middleware with enhanced email verification limits

export async function POST(request: NextRequest) {
  return withResendRateLimit(request, async (req) => {
    // Extract parsed body from middleware (set by withResendRateLimit)
    const body = (req as NextRequest & { _parsedBody?: unknown })._parsedBody || await req.json();
    try {
      // Validate input
      const validation = resendVerificationSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { 
            error: 'Validation failed', 
            details: validation.error.issues.map(issue => ({
              field: issue.path.join('.'),
              message: issue.message
            }))
          },
          { status: 400 }
        );
      }
      
      const { email } = validation.data;
      const normalizedEmail = email.toLowerCase();
      
      try {
        // Check if user exists
        const user = await getUserByEmail(normalizedEmail);
        
        if (!user) {
          return NextResponse.json(
            { error: 'User not found. Please sign up first.' },
            { status: 404 }
          );
        }
        
        // Check if user is already verified
        if (user.isEmailVerified) {
          return NextResponse.json(
            { 
              error: 'Email is already verified. You can sign in to your account.',
              redirectTo: '/auth/signin'
            },
            { status: 400 }
          );
        }
        
        // Generate new verification code (this will invalidate existing codes)
        const verificationCode = await emailVerificationCodeService.generateCode(user.id);
        
        // Send verification email
        try {
          const emailService = createEmailService();
          await sendEmailWithRetry(emailService, normalizedEmail, verificationCode, user.name);
          
          if (process.env.NODE_ENV === 'development') {
            if (process.env.NODE_ENV === 'development') console.log(`Verification code resent to ${normalizedEmail} for user ${user.id}`);
          }
          
          return NextResponse.json({
            success: true,
            message: 'Verification code sent successfully. Please check your email.',
            cooldownSeconds: 60 // 60 seconds cooldown
          });
          
        } catch (emailError) {
          console.error('Failed to resend verification email:', emailError);
          
          if (emailError instanceof EmailServiceError) {
            let errorMessage = 'Failed to send verification email. ';
            
            switch (emailError.code) {
              case 'QUOTA_EXCEEDED':
                errorMessage += 'Email service quota exceeded. Please try again later.';
                return NextResponse.json(
                  { error: errorMessage },
                  { status: 503 }
                );
              case 'INVALID_EMAIL':
                errorMessage += 'Invalid email address.';
                return NextResponse.json(
                  { error: errorMessage },
                  { status: 400 }
                );
              case 'API_ERROR':
                errorMessage += 'Email service error. Please try again.';
                break;
              case 'NETWORK_ERROR':
                errorMessage += 'Network error. Please check your connection and try again.';
                break;
              default:
                errorMessage += 'Please try again.';
            }
            
            return NextResponse.json(
              { error: errorMessage },
              { status: 500 }
            );
          }
          
          return NextResponse.json(
            { error: 'Failed to send verification email. Please try again.' },
            { status: 500 }
          );
        }
        
      } catch (error) {
        if (error instanceof VerificationCodeError) {
          let errorMessage: string;
          let statusCode = 400;
          
          switch (error.code) {
            case VerificationError.USER_NOT_FOUND:
              errorMessage = 'User not found. Please sign up first.';
              statusCode = 404;
              break;
            case VerificationError.ALREADY_VERIFIED:
              errorMessage = 'Email is already verified. You can sign in to your account.';
              return NextResponse.json({
                success: true,
                message: errorMessage,
                redirectTo: '/auth/signin'
              });
            default:
              errorMessage = 'Failed to generate verification code. Please try again.';
          }
          
          if (process.env.NODE_ENV === 'development') {
            if (process.env.NODE_ENV === 'development') console.log(`Resend verification failed for ${normalizedEmail}: ${error.code} - ${errorMessage}`);
          }
          
          return NextResponse.json(
            { 
              error: errorMessage,
              code: error.code
            },
            { status: statusCode }
          );
        }
        
        // Log unexpected errors
        console.error('Unexpected error during resend verification:', error);
        
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
      
    } catch (error) {
      console.error('Resend verification endpoint error:', error);
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

