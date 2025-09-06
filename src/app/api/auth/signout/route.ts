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
    
    return NextResponse.json({
      success: true,
      message: 'Signed out successfully',
    });
    
  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}