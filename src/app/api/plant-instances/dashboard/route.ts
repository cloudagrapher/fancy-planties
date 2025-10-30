import { NextRequest, NextResponse } from 'next/server';
import { PlantInstanceQueries } from '@/lib/db/queries/plant-instances';
import { validateRequest } from '@/lib/auth/server';

// Helper function to transform S3 keys to CloudFront URLs
function transformS3KeysToCloudFrontUrls(instance: any): void {
  if (instance.s3ImageKeys && instance.s3ImageKeys.length > 0) {
    const cloudFrontDomain = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;
    if (cloudFrontDomain) {
      instance.images = instance.s3ImageKeys.map(
        (key: string) => `https://${cloudFrontDomain}/${key}`
      );
      instance.primaryImage = instance.images[0];
    }
  }
}

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
      instances.forEach(transformS3KeysToCloudFrontUrls)
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