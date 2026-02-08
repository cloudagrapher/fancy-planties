import { NextRequest, NextResponse } from 'next/server';
import { CareHistoryQueries } from '@/lib/db/queries/care-history';
import { validateRequest } from '@/lib/auth/server';

const VALID_CARE_TYPES = ['fertilizer', 'water', 'repot', 'prune', 'inspect', 'flush', 'other'] as const;
type ValidCareType = typeof VALID_CARE_TYPES[number];

// GET /api/care/history/[plantInstanceId] - Get care history for a plant instance
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ plantInstanceId: string }> }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const plantInstanceId = parseInt(resolvedParams.plantInstanceId, 10);
    if (isNaN(plantInstanceId)) {
      return NextResponse.json({ error: 'Invalid plant instance ID' }, { status: 400 });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const rawCareType = searchParams.get('careType') || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;
    const sortBy = searchParams.get('sortBy') as 'care_date' | 'care_type' | 'created_at' || 'care_date';
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';

    // Validate careType instead of using `as any` cast
    let careType: ValidCareType | undefined;
    if (rawCareType) {
      if (!VALID_CARE_TYPES.includes(rawCareType as ValidCareType)) {
        return NextResponse.json(
          { error: `Invalid care type: '${rawCareType}'. Must be one of: ${VALID_CARE_TYPES.join(', ')}` },
          { status: 400 }
        );
      }
      careType = rawCareType as ValidCareType;
    }

    // Validate date range
    if (startDate && endDate && startDate > endDate) {
      return NextResponse.json(
        { error: 'startDate must be before endDate' },
        { status: 400 }
      );
    }

    const filters = {
      careType,
      startDate,
      endDate,
      limit: Math.min(Math.max(limit, 1), 100), // Clamp to 1-100
      offset: Math.max(offset, 0),
      sortBy,
      sortOrder,
    };

    const careHistory = await CareHistoryQueries.getCareHistoryForPlant(
      plantInstanceId,
      user.id,
      filters
    );

    return NextResponse.json(careHistory);
  } catch (error) {
    console.error('Failed to get care history:', error);
    return NextResponse.json(
      { error: 'Failed to get care history' },
      { status: 500 }
    );
  }
}