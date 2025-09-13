import { NextRequest, NextResponse } from 'next/server';
import { validateCuratorRequest } from '@/lib/auth/server';
import { AdminAnalyticsQueries } from '@/lib/db/queries/admin-analytics';

export async function GET(request: NextRequest) {
  try {
    // Validate curator access
    const authResult = await validateCuratorRequest();
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.error === 'Unauthorized' ? 401 : 403 }
      );
    }

    // Get plant submission trends for the last 30 days
    const trendData = await AdminAnalyticsQueries.getPlantSubmissionTrends();

    return NextResponse.json({ data: trendData });
  } catch (error) {
    console.error('Failed to get plant submission trends:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}