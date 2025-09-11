import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/lib/auth';
import { setSessionCookie } from '@/lib/auth/server';
import { signInSchema, validateInput } from '@/lib/auth/validation';
import { withRateLimit } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  return withRateLimit(request, async (req) => {
    try {
      const body = await req.json();

      // Validate input
      const validation = validateInput(signInSchema, body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', errors: validation.errors },
          { status: 400 }
        );
      }

      const { email, password } = validation.data;

      // Attempt to sign in
      const result = await signIn(email, password);

      if (!result) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      // Set session cookie
      await setSessionCookie(result.session.id);

      // Check if email verification is required
      if (!result.user.isEmailVerified) {
        return NextResponse.json({
          success: true,
          requiresVerification: true,
          user: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            isEmailVerified: result.user.isEmailVerified,
          },
        });
      }

      return NextResponse.json({
        success: true,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          isEmailVerified: result.user.isEmailVerified,
        },
      });

    } catch (error) {
      console.error('Sign in error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}