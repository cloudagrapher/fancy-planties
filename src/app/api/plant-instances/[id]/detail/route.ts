import { type NextRequest, NextResponse } from 'next/server';
import { PlantInstanceQueries } from '@/lib/db/queries/plant-instances';
import { CareHistoryQueries } from '@/lib/db/queries/care-history';
import { PropagationQueries } from '@/lib/db/queries/propagations';
import { validateRequest } from '@/lib/auth/server';
import { S3ImageService } from '@/lib/services/s3-image-service';

/**
 * GET /api/plant-instances/[id]/detail
 *
 * Consolidated endpoint that returns a plant instance together with its
 * care history, propagations, and (optionally) parent plant — all in a
 * single round-trip.
 *
 * Previously PlantDetailModal made 1 sequential + 3 parallel requests.
 * This endpoint eliminates the waterfall and reduces total latency.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid plant instance ID' }, { status: 400 });
    }

    // Fetch the plant instance first (needed to check ownership + get parentInstanceId)
    const plantInstance = await PlantInstanceQueries.getEnhancedById(id);

    if (!plantInstance) {
      return NextResponse.json({ error: 'Plant instance not found' }, { status: 404 });
    }

    if (plantInstance.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Transform S3 keys to CloudFront URLs for the main plant
    S3ImageService.transformS3KeysToUrls(plantInstance);

    // Fetch care history and propagations in parallel
    const [careHistory, propagations] = await Promise.all([
      CareHistoryQueries.getCareHistoryForPlant(id, user.id, {
        limit: 50,
        offset: 0,
        sortBy: 'care_date',
        sortOrder: 'desc',
      }).catch(() => []),

      PropagationQueries.getByParentInstance(id, user.id).catch(() => []),
    ]);

    return NextResponse.json(
      {
        plant: plantInstance,
        careHistory,
        propagations,
        // parentPlant is not currently tracked on plantInstances — the
        // relationship lives on the propagations table.  Included as
        // undefined for PlantDetailData compatibility.
        parentPlant: undefined,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=5, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    console.error('Failed to get plant detail:', error);
    return NextResponse.json(
      { error: 'Failed to get plant detail' },
      { status: 500 }
    );
  }
}
