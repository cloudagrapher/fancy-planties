import { NextRequest, NextResponse } from 'next/server';
import { PlantInstanceQueries } from '@/lib/db/queries/plant-instances';
import { updatePlantInstanceSchema } from '@/lib/validation/plant-schemas';
import { validateRequest } from '@/lib/auth/server';

// GET /api/plant-instances/[id] - Get a specific plant instance
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid plant instance ID' }, { status: 400 });
    }

    const plantInstance = await PlantInstanceQueries.getEnhancedById(id);
    
    if (!plantInstance) {
      return NextResponse.json({ error: 'Plant instance not found' }, { status: 404 });
    }

    // Check if the plant instance belongs to the current user
    if (plantInstance.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(plantInstance);
  } catch (error) {
    console.error('Failed to get plant instance:', error);
    return NextResponse.json(
      { error: 'Failed to get plant instance' },
      { status: 500 }
    );
  }
}

// PUT /api/plant-instances/[id] - Update a plant instance
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid plant instance ID' }, { status: 400 });
    }

    // Check if the plant instance exists and belongs to the user
    const existingInstance = await PlantInstanceQueries.getEnhancedById(id);
    if (!existingInstance) {
      return NextResponse.json({ error: 'Plant instance not found' }, { status: 404 });
    }

    if (existingInstance.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate the update data
    const updateData = updatePlantInstanceSchema.parse({
      ...body,
      id,
      userId: user.id,
    });

    // Remove id and userId from update data as they shouldn't be updated
    const { id: _, userId: __, ...dataToUpdate } = updateData;

    // Update the plant instance
    const updatedInstance = await PlantInstanceQueries.update(id, dataToUpdate);
    
    // Get the enhanced plant instance with plant data
    const enhancedInstance = await PlantInstanceQueries.getEnhancedById(updatedInstance.id);
    
    return NextResponse.json(enhancedInstance);
  } catch (error) {
    console.error('Failed to update plant instance:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid plant instance data', details: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update plant instance' },
      { status: 500 }
    );
  }
}

// DELETE /api/plant-instances/[id] - Delete a plant instance
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid plant instance ID' }, { status: 400 });
    }

    // Check if the plant instance exists and belongs to the user
    const existingInstance = await PlantInstanceQueries.getEnhancedById(id);
    if (!existingInstance) {
      return NextResponse.json({ error: 'Plant instance not found' }, { status: 404 });
    }

    if (existingInstance.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the plant instance
    const deleted = await PlantInstanceQueries.delete(id);
    
    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete plant instance' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Plant instance deleted successfully' });
  } catch (error) {
    console.error('Failed to delete plant instance:', error);
    return NextResponse.json(
      { error: 'Failed to delete plant instance' },
      { status: 500 }
    );
  }
}