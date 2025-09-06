import { NextRequest, NextResponse } from 'next/server';
import { requireAuthSession } from '@/lib/auth/session';
import { CareService } from '@/lib/services/care-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { plantInstanceId: string } }
) {
  try {
    const { user } = await requireAuthSession();
    const plantInstanceId = parseInt(params.plantInstanceId);
    
    if (isNaN(plantInstanceId)) {
      return NextResponse.json(
        { error: 'Invalid plant instance ID' },
        { status: 400 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const careType = searchParams.get('careType') || undefined;
    
    const filters = {
      limit,
      offset,
      careType: careType as 'fertilizer' | 'water' | 'repot' | 'prune' | 'inspect' | 'other' | undefined,
    };
    
    const careHistory = await CareService.getPlantCareHistory(
      plantInstanceId,
      user.id,
      filters
    );
    
    return NextResponse.json(careHistory);
  } catch (error) {
    console.error('Error fetching care history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch care history' },
      { status: 500 }
    );
  }
}