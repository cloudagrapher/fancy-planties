import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { signOut } from '@/lib/auth';
import { clearSessionCookie } from '@/lib/auth/server';

export async function POST(_request: NextRequest) {
  try {
    const { session } = await validateRequest();
    
    if (!session) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
    }
    
    // Sign out and clear session
    await signOut(session.id);
    await clearSessionCookie();
    
    const response = NextResponse.json({
      success: true,
      message: 'Signed out successfully',
    });
    // Clear email-verified cookie
    response.cookies.set('ev', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
    
  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}