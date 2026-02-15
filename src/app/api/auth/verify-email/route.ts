import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { emailVerificationCodeService, VerificationCodeError, VerificationError } from '@/lib/services/email-verification-code-service';
import { withVerificationRateLimit } from '@/lib/auth/email-verification-middleware';
import { getUserByEmail } from '@/lib/auth';
import { lucia } from '@/lib/auth/lucia';
import { setSessionCookie } from '@/lib/auth/server';

// Validation schema for email verification request
const verifyEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d{6}$/, 'Verification code must contain only digits'),
});

// Note: Rate limiting is handled by the withVerificationRateLimit middleware with enhanced email verification limits

export async function POST(request: NextRequest) {
  return withVerificationRateLimit(request, async (req) => {
    // Extract parsed body from middleware (set by withVerificationRateLimit)
    const body = (req as NextRequest & { _parsedBody?: unknown })._parsedBody || await req.json();
    try {
      // Validate input
      const validation = verifyEmailSchema.safeParse(body);
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
      
      const { email, code } = validation.data;
      
      try {
        // Validate the verification code
        const isValid = await emailVerificationCodeService.validateCode(email, code);

        if (isValid) {
          if (process.env.NODE_ENV === 'development') {
            if (process.env.NODE_ENV === 'development') console.log(`Email verification successful for ${email}`);
          }

          // Get the verified user
          const user = await getUserByEmail(email);
          if (!user) {
            return NextResponse.json(
              { error: 'User not found after verification' },
              { status: 404 }
            );
          }

          // Create a session for the verified user
          const session = await lucia.createSession(user.id.toString(), {});
          await setSessionCookie(session.id);

          if (process.env.NODE_ENV === 'development') {
            if (process.env.NODE_ENV === 'development') console.log(`Session created for verified user ${email}: ${session.id}`);
          }

          return NextResponse.json({
            success: true,
            message: 'Email verified successfully! You can now access your account.',
            redirectTo: '/dashboard'
          });
        }
        
        // This shouldn't happen if validateCode works correctly, but just in case
        return NextResponse.json(
          { error: 'Verification failed' },
          { status: 400 }
        );
        
      } catch (error) {
        if (error instanceof VerificationCodeError) {
          // Increment attempts for invalid codes (but not for other errors)
          if (error.code === VerificationError.CODE_INVALID) {
            try {
              await emailVerificationCodeService.incrementAttempts(email, code);
            } catch (incrementError) {
              console.error('Failed to increment verification attempts:', incrementError);
            }
          }
          
          // Map verification errors to user-friendly messages
          let errorMessage: string;
          let statusCode = 400;
          
          switch (error.code) {
            case VerificationError.CODE_EXPIRED:
              errorMessage = 'Verification code has expired. Please request a new one.';
              break;
            case VerificationError.CODE_INVALID:
              errorMessage = 'Invalid verification code. Please check and try again.';
              break;
            case VerificationError.TOO_MANY_ATTEMPTS:
              errorMessage = 'Too many verification attempts. Please request a new code.';
              statusCode = 429;
              break;
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
              errorMessage = 'Verification failed. Please try again.';
          }
          
          if (process.env.NODE_ENV === 'development') {
            if (process.env.NODE_ENV === 'development') console.log(`Email verification failed for ${email}: ${error.code} - ${errorMessage}`);
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
        console.error('Unexpected error during email verification:', error);
        
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
      
    } catch (error) {
      console.error('Email verification endpoint error:', error);
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}