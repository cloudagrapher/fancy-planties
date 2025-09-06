import { NextRequest, NextResponse } from 'next/server';
import { PlantInstanceQueries } from '@/lib/db/queries/plant-instances';
import { bulkPlantInstanceOperationSchema } from '@/lib/validation/plant-schemas';
import { validateRequest } from '@/lib/auth/server';

// POST /api/plant-instances/bulk - Perform bulk operations on plant instances
export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate bulk operation data
    const validatedData = bulkPlantInstanceOperationSchema.parse(body);
    
    // Verify that all plant instances belong to the current user
    const plantInstances = await Promise.all(
      validatedData.plantInstanceIds.map(id => PlantInstanceQueries.getEnhancedById(id))
    );

    // Check for non-existent or unauthorized plant instances
    const unauthorizedIds: number[] = [];
    const notFoundIds: number[] = [];

    plantInstances.forEach((instance, index) => {
      const id = validatedData.plantInstanceIds[index];
      if (!instance) {
        notFoundIds.push(id);
      } else if (instance.userId !== user.id) {
        unauthorizedIds.push(id);
      }
    });

    if (notFoundIds.length > 0) {
      return NextResponse.json(
        { error: `Plant instances not found: ${notFoundIds.join(', ')}` },
        { status: 404 }
      );
    }

    if (unauthorizedIds.length > 0) {
      return NextResponse.json(
        { error: `Unauthorized access to plant instances: ${unauthorizedIds.join(', ')}` },
        { status: 403 }
      );
    }

    // Perform bulk operation
    const result = await PlantInstanceQueries.bulkOperation(validatedData);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to perform bulk operation:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid bulk operation data', details: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}