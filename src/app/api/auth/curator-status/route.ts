import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getCuratorStatus } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  try {
    const status = await getCuratorStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error checking curator status:', error);
    return NextResponse.json(
      { isCurator: false, isAuthenticated: false, isVerified: false },
      { status: 200 }
    );
  }
}