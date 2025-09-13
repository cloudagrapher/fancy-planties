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

    // Get pending approval count
    const count = await AdminAnalyticsQueries.getPendingApprovalCount();

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Failed to get pending approval count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}