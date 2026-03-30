import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireCuratorSession } from '@/lib/auth/server';
import { AdminPlantQueries } from '@/lib/db/queries/admin-plants';

export async function GET(_request: NextRequest) {
  try {
    // Ensure user is a curator
    await requireCuratorSession();

    const taxonomyOptions = await AdminPlantQueries.getTaxonomyOptions();

    return NextResponse.json(taxonomyOptions, {
      headers: {
        // Taxonomy options change infrequently — cache for 5 minutes
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Failed to get taxonomy options:', error);
    return NextResponse.json(
      { error: 'Failed to get taxonomy options' },
      { status: 500 }
    );
  }
}