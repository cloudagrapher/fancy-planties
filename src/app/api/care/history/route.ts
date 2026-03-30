import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { CareHistoryQueries } from '@/lib/db/queries/care-history';

// GET /api/care/history - Get all care history for the authenticated user (for export)
export async function GET(_request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use high limit for export — getRecentCareHistory already joins plant data
    const careHistory = await CareHistoryQueries.getRecentCareHistory(user.id, 10000);

    return NextResponse.json(careHistory, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Failed to get care history:', error);
    return NextResponse.json(
      { error: 'Failed to get care history' },
      { status: 500 }
    );
  }
}
