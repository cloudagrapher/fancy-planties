import { NextRequest, NextResponse } from 'next/server';
import { signUpUnverified } from '@/lib/auth';
import { signUpSchema, validateInput } from '@/lib/auth/validation';
import { withRateLimit } from '@/lib/auth/middleware';
import { emailVerificationCodeService } from '@/lib/services/email-verification-code-service';
import { sendEmailWithRetry, EmailServiceError } from '@/lib/services/email-service';
import { createEmailService } from '@/lib/services/resend-email-service';

export async function POST(request: NextRequest) {
  return withRateLimit(request, async (req) => {
    try {
      const body = await req.json();
      
      // Validate input
      const validation = validateInput(signUpSchema, body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', errors: validation.errors },
          { status: 400 }
        );
      }
      
      const { email, password, name } = validation.data;
      
      // Create unverified user (or get existing unverified user)
      const user = await signUpUnverified(email, password, name);
      const isExistingUser = user.createdAt < new Date(Date.now() - 1000); // Created more than 1 second ago
      
      // Generate verification code
      const verificationCode = await emailVerificationCodeService.generateCode(user.id);
      
      // Send verification email
      try {
        const emailService = createEmailService();
        await sendEmailWithRetry(emailService, email, verificationCode, name);
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`Verification email sent to ${email} for user ${user.id}`);
        }
        
        const message = isExistingUser 
          ? 'Verification email resent. Please check your email for the new verification code.'
          : 'Account created successfully. Please check your email for a verification code.';
        
        return NextResponse.json({
          success: true,
          message,
          requiresVerification: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            isEmailVerified: user.isEmailVerified,
          },
        });
        
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        
        // If email sending fails, we still created the user, so let them know they can resend
        if (emailError instanceof EmailServiceError) {
          let errorMessage = 'Failed to send verification email. ';
          
          switch (emailError.code) {
            case 'QUOTA_EXCEEDED':
              errorMessage += 'Email service quota exceeded. Please try again later.';
              break;
            case 'INVALID_EMAIL':
              errorMessage += 'Invalid email address provided.';
              break;
            case 'API_ERROR':
              errorMessage += 'Email service error. Please try resending the verification code.';
              break;
            case 'NETWORK_ERROR':
              errorMessage += 'Network error. Please check your connection and try resending.';
              break;
            default:
              errorMessage += 'Please try resending the verification code.';
          }
          
          const message = isExistingUser 
            ? 'Account found. ' 
            : 'Account created successfully. ';
          
          return NextResponse.json({
            success: true,
            message,
            requiresVerification: true,
            emailError: errorMessage,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              isEmailVerified: user.isEmailVerified,
            },
          });
        }
        
        // For unknown email errors, still return success but mention the issue
        const message = isExistingUser 
          ? 'Account found. ' 
          : 'Account created successfully. ';
        
        return NextResponse.json({
          success: true,
          message,
          requiresVerification: true,
          emailError: 'Failed to send verification email. Please try resending the verification code.',
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            isEmailVerified: user.isEmailVerified,
          },
        });
      }
      
    } catch (error) {
      console.error('Sign up error:', error);
      
      if (error instanceof Error && error.message === 'User already exists') {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}