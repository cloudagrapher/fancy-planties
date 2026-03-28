import 'server-only';

import { NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { PropagationQueries } from '@/lib/db/queries/propagations';

/**
 * GET /api/propagations/dashboard
 *
 * Combined endpoint that returns both the propagation list and stats
 * in a single request, eliminating the waterfall of two separate fetches
 * that the PropagationDashboard component previously made.
 */
export async function GET() {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run both queries in parallel — they're independent
    const [propagations, stats] = await Promise.all([
      PropagationQueries.getByUserId(user.id),
      PropagationQueries.getStats(user.id),
    ]);

    return NextResponse.json(
      { propagations, stats },
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching propagation dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch propagation dashboard' },
      { status: 500 }
    );
  }
}
