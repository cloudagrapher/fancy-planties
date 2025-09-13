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

    // Get curator activity summary
    const activityData = await AdminAnalyticsQueries.getCuratorActivity();

    return NextResponse.json({ data: activityData });
  } catch (error) {
    console.error('Failed to get curator activity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}