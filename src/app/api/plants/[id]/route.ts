import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth';
import { 
  getPlantById, 
  updatePlant, 
  deletePlant 
} from '@/lib/db/queries/plant-taxonomy';
import { updatePlantSchema } from '@/lib/validation/plant-schemas';
import { ZodError } from 'zod';

// GET /api/plants/[id] - Get plant by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const plantId = parseInt(id);
    if (isNaN(plantId)) {
      return NextResponse.json({ error: 'Invalid plant ID' }, { status: 400 });
    }

    const plant = await getPlantById(plantId);
    if (!plant) {
      return NextResponse.json({ error: 'Plant not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: plant,
      metadata: {
        operation: 'get',
        timestamp: new Date(),
        userId: user.id,
      },
    });
  } catch (error) {
    console.error('Error fetching plant:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// PUT /api/plants/[id] - Update plant
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const plantId = parseInt(id);
    if (isNaN(plantId)) {
      return NextResponse.json({ error: 'Invalid plant ID' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updatePlantSchema.parse({
      ...body,
      id: plantId,
    });

    const updatedPlant = await updatePlant(validatedData);
    if (!updatedPlant) {
      return NextResponse.json({ error: 'Plant not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updatedPlant,
      metadata: {
        operation: 'update',
        timestamp: new Date(),
        userId: user.id,
      },
    });
  } catch (error) {
    console.error('Error updating plant:', error);
    
    if (error instanceof ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid plant data', 
          details: error.issues 
        }, 
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// DELETE /api/plants/[id] - Delete plant (only if no instances exist)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const plantId = parseInt(id);
    if (isNaN(plantId)) {
      return NextResponse.json({ error: 'Invalid plant ID' }, { status: 400 });
    }

    const deleted = await deletePlant(plantId, user.id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Plant not found or cannot be deleted' }, 
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: plantId, deleted: true },
      metadata: {
        operation: 'delete',
        timestamp: new Date(),
        userId: user.id,
      },
    });
  } catch (error) {
    console.error('Error deleting plant:', error);
    
    if (error instanceof Error && error.message?.includes('Cannot delete plant')) {
      return NextResponse.json(
        { error: error.message }, 
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}