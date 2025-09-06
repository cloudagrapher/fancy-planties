import { NextRequest, NextResponse } from 'next/server';
import { PlantInstanceQueries } from '@/lib/db/queries/plant-instances';
import { validateRequest } from '@/lib/auth';

// GET /api/plant-instances/dashboard - Get care dashboard data
export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get care dashboard data
    const dashboardData = await PlantInstanceQueries.getCareDashboardData(user.id);
    
    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Failed to get care dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to get care dashboard data' },
      { status: 500 }
    );
  }
}