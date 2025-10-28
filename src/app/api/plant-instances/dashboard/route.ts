import { NextRequest, NextResponse } from 'next/server';
import { PlantInstanceQueries } from '@/lib/db/queries/plant-instances';
import { validateRequest } from '@/lib/auth/server';
import { S3UrlGenerator } from '@/lib/utils/s3-url-generator';

// GET /api/plant-instances/dashboard - Get care dashboard data
export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get care dashboard data
    const dashboardData = await PlantInstanceQueries.getCareDashboardData(user.id);

    // Transform S3 keys to presigned URLs if S3 is configured
    if (S3UrlGenerator.isConfigured()) {
      try {
        // Transform all plant instance arrays in the dashboard data
        const plantArrays = [
          dashboardData.overdue,
          dashboardData.dueToday,
          dashboardData.dueSoon,
          dashboardData.recentlyCared,
        ];

        await Promise.all(
          plantArrays.flatMap(instances =>
            instances.map(async (instance) => {
              if (instance.s3ImageKeys && instance.s3ImageKeys.length > 0) {
                try {
                  const presignedUrls = await S3UrlGenerator.transformS3KeysToUrls(instance.s3ImageKeys);
                  const validUrls = presignedUrls.filter(url => url);
                  instance.images = validUrls;
                  if (validUrls.length > 0) {
                    instance.primaryImage = validUrls[0];
                  }
                } catch (error) {
                  console.error(`Failed to generate presigned URLs for instance ${instance.id}:`, error);
                }
              }
            })
          )
        );
      } catch (error) {
        console.error('Error transforming S3 keys:', error);
      }
    }

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Failed to get care dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to get care dashboard data' },
      { status: 500 }
    );
  }
}