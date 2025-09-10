import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { PropagationQueries } from '@/lib/db/queries/propagations';
import { z } from 'zod';

// Validation schema for creating propagations
const createPropagationSchema = z.object({
  plantId: z.number().int().positive(),
  parentInstanceId: z.number().int().positive().optional().nullable(),
  nickname: z.string().min(1).max(100),
  location: z.string().min(1).max(100),
  dateStarted: z.string().datetime().transform(str => new Date(str)),
  status: z.enum(['started', 'rooting', 'planted', 'established']).default('started'),
  notes: z.string().max(2000).optional().nullable(),
  images: z.array(z.string()).max(10).default([]),
});

// GET /api/propagations - Get all propagations for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const parentInstanceId = searchParams.get('parentInstanceId');

    let propagations;

    if (status) {
      // Get propagations by status
      propagations = await PropagationQueries.getByStatus(
        user.id, 
        status as 'started' | 'rooting' | 'planted' | 'established'
      );
    } else if (parentInstanceId) {
      // Get propagations from a specific parent plant
      propagations = await PropagationQueries.getByParentInstance(parseInt(parentInstanceId, 10));
    } else {
      // Get all propagations for user
      propagations = await PropagationQueries.getByUserId(user.id);
    }

    return NextResponse.json(propagations);
  } catch (error) {
    console.error('Error fetching propagations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch propagations' },
      { status: 500 }
    );
  }
}

// POST /api/propagations - Create a new propagation
export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createPropagationSchema.parse(body);

    const propagation = await PropagationQueries.create({
      userId: user.id,
      plantId: validatedData.plantId,
      parentInstanceId: validatedData.parentInstanceId,
      nickname: validatedData.nickname,
      location: validatedData.location,
      dateStarted: validatedData.dateStarted,
      status: validatedData.status,
      notes: validatedData.notes,
      images: validatedData.images,
    });

    return NextResponse.json(propagation, { status: 201 });
  } catch (error) {
    console.error('Error creating propagation:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create propagation' },
      { status: 500 }
    );
  }
}