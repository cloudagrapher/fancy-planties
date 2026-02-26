import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { CareService } from '@/lib/services/care-service';

export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const dashboardData = await CareService.getCareDashboard(user.id);
    
    return NextResponse.json(dashboardData, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Error fetching care dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch care dashboard' },
      { status: 500 }
    );
  }
}