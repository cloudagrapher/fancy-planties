import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { emailVerificationCodeService, VerificationCodeError, VerificationError } from '@/lib/services/email-verification-code-service';
import { sendEmailWithRetry, EmailServiceError } from '@/lib/services/email-service';
import { createEmailService } from '@/lib/services/resend-email-service';
import { getUserByEmail } from '@/lib/auth';
import { withRateLimit } from '@/lib/auth/middleware';

// Validation schema for resend verification request
const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Note: Rate limiting is handled by the withRateLimit middleware with default settings
// Additional email-specific rate limiting is implemented with cooldown logic below

// Cooldown between resend requests (60 seconds)
const RESEND_COOLDOWN_MS = 60 * 1000;

// In-memory store for tracking last resend times (in production, use Redis)
const lastResendTimes = new Map<string, number>();

export async function POST(request: NextRequest) {
  return withRateLimit(request, async (req) => {
    try {
      const body = await req.json();
      
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
      
      // Check cooldown period
      const lastResendTime = lastResendTimes.get(normalizedEmail);
      const now = Date.now();
      
      if (lastResendTime && (now - lastResendTime) < RESEND_COOLDOWN_MS) {
        const remainingCooldown = Math.ceil((RESEND_COOLDOWN_MS - (now - lastResendTime)) / 1000);
        
        return NextResponse.json(
          { 
            error: 'Please wait before requesting another verification code.',
            cooldownSeconds: remainingCooldown
          },
          { status: 429 }
        );
      }
      
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
        
        // Update last resend time
        lastResendTimes.set(normalizedEmail, now);
        
        // Send verification email
        try {
          const emailService = createEmailService();
          await sendEmailWithRetry(emailService, normalizedEmail, verificationCode, user.name);
          
          console.log(`Verification code resent to ${normalizedEmail} for user ${user.id}`);
          
          return NextResponse.json({
            success: true,
            message: 'Verification code sent successfully. Please check your email.',
            cooldownSeconds: RESEND_COOLDOWN_MS / 1000
          });
          
        } catch (emailError) {
          console.error('Failed to resend verification email:', emailError);
          
          // Remove the resend time since email failed
          lastResendTimes.delete(normalizedEmail);
          
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
          
          console.log(`Resend verification failed for ${normalizedEmail}: ${error.code} - ${errorMessage}`);
          
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

// Cleanup function to remove old resend times (should be called periodically)
function cleanupResendTimes() {
  const now = Date.now();
  const cutoff = now - (24 * 60 * 60 * 1000); // 24 hours ago
  
  for (const [email, timestamp] of lastResendTimes.entries()) {
    if (timestamp < cutoff) {
      lastResendTimes.delete(email);
    }
  }
}

// Run cleanup periodically (every hour)
setInterval(cleanupResendTimes, 60 * 60 * 1000);