import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireCuratorSession } from '@/lib/auth/server';
import { AdminPlantQueries } from '@/lib/db/queries/admin-plants';
import { z } from 'zod';

const updatePlantSchema = z.object({
  family: z.string().min(1).optional(),
  genus: z.string().min(1).optional(),
  species: z.string().min(1).optional(),
  cultivar: z.string().optional(),
  commonName: z.string().min(1).optional(),
  careInstructions: z.string().optional(),
  isVerified: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Ensure user is a curator
    await requireCuratorSession();

    const { id } = await context.params;
    const plantId = parseInt(id);

    if (isNaN(plantId)) {
      return NextResponse.json(
        { error: 'Invalid plant ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updatePlantSchema.parse(body);

    // Clean up empty strings for cultivar and careInstructions
    const updateData: any = { ...validatedData };
    if (updateData.cultivar === '') {
      updateData.cultivar = null;
    }
    if (updateData.careInstructions === '') {
      updateData.careInstructions = null;
    }

    const updatedPlant = await AdminPlantQueries.updatePlant(plantId, updateData);

    return NextResponse.json({ plant: updatedPlant });
  } catch (error) {
    console.error('Failed to update plant:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to update plant';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Ensure user is a curator
    await requireCuratorSession();

    const { id } = await context.params;
    const plantId = parseInt(id);

    if (isNaN(plantId)) {
      return NextResponse.json(
        { error: 'Invalid plant ID' },
        { status: 400 }
      );
    }

    const deleted = await AdminPlantQueries.deletePlant(plantId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Plant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete plant:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete plant';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}