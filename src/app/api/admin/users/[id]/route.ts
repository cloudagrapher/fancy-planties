import { NextRequest, NextResponse } from 'next/server';
import { validateCuratorRequest } from '@/lib/auth/server';
import { AdminUserQueries } from '@/lib/db/queries/admin-users';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Validate curator access
    const authResult = await validateCuratorRequest();
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.error === 'Unauthorized' ? 401 : 403 }
      );
    }

    const { id } = await context.params;
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    // Get user details
    const userDetails = await AdminUserQueries.getUserDetails(userId);
    
    if (!userDetails) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get user activity summary
    const activitySummary = await AdminUserQueries.getUserActivitySummary(userId);
    
    return NextResponse.json({
      user: userDetails,
      activity: activitySummary,
    });
  } catch (error) {
    console.error('Failed to get user details:', error);
    return NextResponse.json(
      { error: 'Failed to get user details' },
      { status: 500 }
    );
  }
}