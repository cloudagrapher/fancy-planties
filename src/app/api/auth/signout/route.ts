import { NextRequest, NextResponse } from 'next/server';
import { validateRequest, signOut, clearSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
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