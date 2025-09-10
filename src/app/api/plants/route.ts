import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { 
  createPlant, 
  getPlantsWithStats, 
  validatePlantTaxonomy 
} from '@/lib/db/queries/plant-taxonomy';
import { 
  createPlantSchema, 
  plantFilterSchema 
} from '@/lib/validation/plant-schemas';
import { ZodError } from 'zod';

// GET /api/plants - Get plants with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterParams = {
      family: searchParams.get('family') || undefined,
      genus: searchParams.get('genus') || undefined,
      isVerified: searchParams.get('isVerified') ? searchParams.get('isVerified') === 'true' : undefined,
      createdBy: searchParams.get('createdBy') ? parseInt(searchParams.get('createdBy')!, 10) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0,
    };

    const validatedFilter = plantFilterSchema.parse(filterParams);
    const plants = await getPlantsWithStats(validatedFilter, user.id);

    return NextResponse.json({
      success: true,
      data: plants,
      metadata: {
        operation: 'search',
        timestamp: new Date(),
        userId: user.id,
      },
    });
  } catch (error) {
    console.error('Error fetching plants:', error);
    
    if (error instanceof ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid filter parameters', 
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

// POST /api/plants - Create a new plant taxonomy entry
export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createPlantSchema.parse(body);

    // Validate taxonomy for duplicates
    const validation = await validatePlantTaxonomy(validatedData);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validation.errors,
          duplicates: validation.duplicates 
        }, 
        { status: 409 }
      );
    }

    const newPlant = await createPlant(validatedData, user.id);

    return NextResponse.json({
      success: true,
      data: newPlant,
      metadata: {
        operation: 'create',
        timestamp: new Date(),
        userId: user.id,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating plant:', error);
    
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