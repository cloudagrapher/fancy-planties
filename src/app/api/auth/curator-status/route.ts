import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getCuratorStatus } from '@/lib/auth/server';

export async function GET(_request: NextRequest) {
  try {
    const status = await getCuratorStatus();
    return NextResponse.json(status, {
      headers: {
        // Curator status rarely changes — cache aggressively to avoid per-page-load queries
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error checking curator status:', error);
    return NextResponse.json(
      { isCurator: false, isAuthenticated: false, isVerified: false },
      { status: 200 }
    );
  }
}