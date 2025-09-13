import { NextRequest, NextResponse } from 'next/server';
import { validateCuratorRequest } from '@/lib/auth/server';
import { AdminPlantQueries } from '@/lib/db/queries/admin-plants';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Validate curator access
    const authResult = await validateCuratorRequest();
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.error === 'Unauthorized' ? 401 : 403 }
      );
    }

    const { id } = await context.params;
    const plantId = parseInt(id);

    if (isNaN(plantId)) {
      return NextResponse.json(
        { error: 'Invalid plant ID' },
        { status: 400 }
      );
    }

    // Approve the plant by setting isVerified to true
    const updatedPlant = await AdminPlantQueries.updatePlant(plantId, {
      isVerified: true,
    });

    return NextResponse.json({
      success: true,
      plant: updatedPlant,
    });
  } catch (error) {
    console.error('Failed to approve plant:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}