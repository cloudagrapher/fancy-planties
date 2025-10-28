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
  status: z.enum(['started', 'rooting', 'ready', 'planted']).default('started'),
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
        status as 'started' | 'rooting' | 'ready' | 'planted'
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
  let body: any;
  
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    body = await request.json();
    console.log('Received propagation data:', JSON.stringify(body, null, 2));
    
    const validatedData = createPropagationSchema.parse(body);
    console.log('Validated propagation data:', JSON.stringify(validatedData, null, 2));

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

    console.log('Successfully created propagation:', propagation.id);
    return NextResponse.json(propagation, { status: 201 });
  } catch (error) {
    console.error('Error creating propagation:', error);
    console.error('Received data that caused error:', JSON.stringify(body, null, 2));
    
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', JSON.stringify(error.issues, null, 2));
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: error.issues,
          receivedData: body
        },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Database or server error:', errorMessage);
    
    return NextResponse.json(
      { 
        error: 'Failed to create propagation',
        message: errorMessage,
        receivedData: body
      },
      { status: 500 }
    );
  }
}