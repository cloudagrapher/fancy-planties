import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { getUserCareGuideStats } from '@/lib/db/queries/care-guides';

// GET /api/care-guides/stats - Get care guide statistics for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await getUserCareGuideStats(user.id);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching care guide stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch care guide statistics' },
      { status: 500 }
    );
  }
}