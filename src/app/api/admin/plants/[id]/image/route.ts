import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireCuratorSession } from '@/lib/auth/server';
import { AdminPlantQueries } from '@/lib/db/queries/admin-plants';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Ensure user is a curator
    await requireCuratorSession();

    const { id } = await params;
    const plantId = parseInt(id);
    if (isNaN(plantId)) {
      return NextResponse.json(
        { error: 'Invalid plant ID' },
        { status: 400 }
      );
    }

    const plant = await AdminPlantQueries.getPlantById(plantId);
    if (!plant) {
      return NextResponse.json(
        { error: 'Plant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      defaultImage: plant.defaultImage,
    });
  } catch (error) {
    console.error('Failed to get plant image:', error);
    return NextResponse.json(
      { error: 'Failed to get plant image' },
      { status: 500 }
    );
  }
}