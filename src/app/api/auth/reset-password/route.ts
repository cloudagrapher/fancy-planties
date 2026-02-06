import { NextRequest, NextResponse } from 'next/server';
import { passwordResetSchema, validateInput } from '@/lib/auth/validation';
import { withRateLimit } from '@/lib/auth/middleware';
import { passwordResetService } from '@/lib/services/password-reset-service';
import { updateUserPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  return withRateLimit(request, async (req) => {
    try {
      const body = await req.json();
      
      // Validate input
      const validation = validateInput(passwordResetSchema, body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', errors: validation.errors },
          { status: 400 }
        );
      }
      
      const { token, password } = validation.data;
      
      // Validate the reset token
      const tokenValidation = await passwordResetService.validateToken(token);
      
      if (!tokenValidation.valid || !tokenValidation.userId || !tokenValidation.tokenId) {
        return NextResponse.json(
          { error: 'Invalid or expired reset token' },
          { status: 400 }
        );
      }
      
      try {
        // Update the user's password
        await updateUserPassword(tokenValidation.userId, password);
        
        // Mark the token as used
        await passwordResetService.markTokenAsUsed(tokenValidation.tokenId);
        
        // Clean up any other tokens for this user
        await passwordResetService.cleanupUserTokens(tokenValidation.userId);
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`Password reset successful for user ${tokenValidation.userId}`);
        }
        
        return NextResponse.json({
          success: true,
          message: 'Password reset successful. You can now sign in with your new password.',
        });
        
      } catch (error) {
        console.error('Error updating password:', error);
        
        return NextResponse.json(
          { error: 'Failed to update password. Please try again.' },
          { status: 500 }
        );
      }
      
    } catch (error) {
      console.error('Reset password error:', error);
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}