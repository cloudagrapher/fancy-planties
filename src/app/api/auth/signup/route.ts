import { NextRequest, NextResponse } from 'next/server';
import { signUp } from '@/lib/auth';
import { setSessionCookie } from '@/lib/auth/server';
import { signUpSchema, validateInput } from '@/lib/auth/validation';
import { withRateLimit } from '@/lib/auth/middleware';

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
      
      // Attempt to sign up
      const result = await signUp(email, password, name);
      
      // Set session cookie
      await setSessionCookie(result.session.id);
      
      return NextResponse.json({
        success: true,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
      });
      
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