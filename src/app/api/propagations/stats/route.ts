import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { PropagationQueries } from '@/lib/db/queries/propagations';

// GET /api/propagations/stats - Get propagation statistics for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await PropagationQueries.getStats(user.id);

    const response = NextResponse.json(stats);
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    return response;
  } catch (error) {
    console.error('Error fetching propagation stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch propagation statistics' },
      { status: 500 }
    );
  }
}