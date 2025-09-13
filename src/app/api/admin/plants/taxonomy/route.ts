import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireCuratorSession } from '@/lib/auth/server';
import { AdminPlantQueries } from '@/lib/db/queries/admin-plants';

export async function GET(request: NextRequest) {
  try {
    // Ensure user is a curator
    await requireCuratorSession();

    // Get taxonomy options with caching
    const taxonomyOptions = await AdminPlantQueries.getTaxonomyOptions();

    return NextResponse.json(taxonomyOptions, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800', // 15 minutes cache
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