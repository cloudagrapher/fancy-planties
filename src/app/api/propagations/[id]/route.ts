import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { PropagationQueries } from '@/lib/db/queries/propagations';
import { z } from 'zod';

// Validation schema for updating propagations
const updatePropagationSchema = z.object({
  plantId: z.number().int().positive().optional(),
  parentInstanceId: z.number().int().positive().optional().nullable(),
  nickname: z.string().min(1).max(100).optional(),
  location: z.string().min(1).max(100).optional(),
  dateStarted: z.string().datetime().transform(str => new Date(str)).optional(),
  status: z.enum(['started', 'rooting', 'ready', 'planted', 'converted']).optional(),
  notes: z.string().max(2000).optional().nullable(),
  images: z.array(z.string()).max(10).optional(),
});

// GET /api/propagations/[id] - Get a specific propagation
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
    const propagationId = parseInt(id, 10);
    if (isNaN(propagationId)) {
      return NextResponse.json({ error: 'Invalid propagation ID' }, { status: 400 });
    }

    const propagation = await PropagationQueries.getById(propagationId);
    
    if (!propagation) {
      return NextResponse.json({ error: 'Propagation not found' }, { status: 404 });
    }

    // Check if the propagation belongs to the authenticated user
    if (propagation.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const response = NextResponse.json(propagation);
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    return response;
  } catch (error) {
    console.error('Error fetching propagation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch propagation' },
      { status: 500 }
    );
  }
}

// PUT /api/propagations/[id] - Update a propagation
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
    const propagationId = parseInt(id, 10);
    if (isNaN(propagationId)) {
      return NextResponse.json({ error: 'Invalid propagation ID' }, { status: 400 });
    }

    // Check if propagation exists and belongs to user
    const existingPropagation = await PropagationQueries.getById(propagationId);
    if (!existingPropagation) {
      return NextResponse.json({ error: 'Propagation not found' }, { status: 404 });
    }

    if (existingPropagation.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updatePropagationSchema.parse(body);

    const updatedPropagation = await PropagationQueries.update(propagationId, validatedData);

    return NextResponse.json(updatedPropagation);
  } catch (error) {
    console.error('Error updating propagation:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update propagation' },
      { status: 500 }
    );
  }
}

// DELETE /api/propagations/[id] - Delete a propagation
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
    const propagationId = parseInt(id, 10);
    if (isNaN(propagationId)) {
      return NextResponse.json({ error: 'Invalid propagation ID' }, { status: 400 });
    }

    // Check if propagation exists and belongs to user
    const existingPropagation = await PropagationQueries.getById(propagationId);
    if (!existingPropagation) {
      return NextResponse.json({ error: 'Propagation not found' }, { status: 404 });
    }

    if (existingPropagation.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const success = await PropagationQueries.delete(propagationId);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete propagation' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting propagation:', error);
    return NextResponse.json(
      { error: 'Failed to delete propagation' },
      { status: 500 }
    );
  }
}