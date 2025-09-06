import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { validatePlantTaxonomy } from '@/lib/db/queries/plant-taxonomy';
import { plantTaxonomySchema } from '@/lib/validation/plant-schemas';
import { ZodError } from 'zod';

// POST /api/plants/validate - Validate plant taxonomy for duplicates and conflicts
export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = plantTaxonomySchema.parse(body);

    const validation = await validatePlantTaxonomy(validatedData);

    return NextResponse.json({
      success: true,
      data: validation,
      metadata: {
        operation: 'validate',
        timestamp: new Date(),
        userId: user.id,
      },
    });
  } catch (error) {
    console.error('Error validating plant taxonomy:', error);
    
    if (error instanceof ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid taxonomy data', 
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