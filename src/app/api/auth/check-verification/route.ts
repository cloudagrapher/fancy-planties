import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      isVerified: user.isEmailVerified,
      userId: user.id,
    });
  } catch (error) {
    console.error('Check verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}