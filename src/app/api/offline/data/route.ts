import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { OfflineService } from '@/lib/services/offline-service';

/**
 * GET /api/offline/data
 * Get user's data for offline caching
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const offlineData = await OfflineService.getOfflineData(user.id);
    
    return NextResponse.json(offlineData);
  } catch (error) {
    console.error('Error getting offline data:', error);
    return NextResponse.json(
      { error: 'Failed to get offline data' },
      { status: 500 }
    );
  }
}