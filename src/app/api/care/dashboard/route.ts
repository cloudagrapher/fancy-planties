import { NextRequest, NextResponse } from 'next/server';
import { requireAuthSession } from '@/lib/auth/server';
import { CareService } from '@/lib/services/care-service';

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuthSession();
    
    const dashboardData = await CareService.getCareDashboard(user.id);
    
    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching care dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch care dashboard' },
      { status: 500 }
    );
  }
}