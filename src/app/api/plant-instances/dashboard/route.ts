import { NextRequest, NextResponse } from 'next/server';
import { PlantInstanceQueries } from '@/lib/db/queries/plant-instances';
import { validateRequest } from '@/lib/auth/server';
import { S3ImageService } from '@/lib/services/s3-image-service';

// GET /api/plant-instances/dashboard - Get care dashboard data
export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get care dashboard data
    const dashboardData = await PlantInstanceQueries.getCareDashboardData(user.id);

    // Transform S3 keys to CloudFront URLs
    const plantArrays = [
      dashboardData.overdue,
      dashboardData.dueToday,
      dashboardData.dueSoon,
      dashboardData.recentlyCared,
    ];

    plantArrays.forEach(instances =>
      instances.forEach(S3ImageService.transformS3KeysToUrls)
    );

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Failed to get care dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to get care dashboard data' },
      { status: 500 }
    );
  }
}