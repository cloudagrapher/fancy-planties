import { NextRequest, NextResponse } from 'next/server';
import { CareHistoryQueries } from '@/lib/db/queries/care-history';
import { validateRequest } from '@/lib/auth/server';

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
    const careType = searchParams.get('careType') || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;
    const sortBy = searchParams.get('sortBy') as 'care_date' | 'care_type' | 'created_at' || 'care_date';
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';

    const filters = {
      careType: careType as any,
      startDate,
      endDate,
      limit,
      offset,
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