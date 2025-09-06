import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { PropagationQueries } from '@/lib/db/queries/propagations';
import { z } from 'zod';

// Validation schema for status updates
const updateStatusSchema = z.object({
  status: z.enum(['started', 'rooting', 'planted', 'established']),
  notes: z.string().max(500).optional(),
});

// PATCH /api/propagations/[id]/status - Update propagation status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const propagationId = parseInt(id);
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
    const { status, notes } = updateStatusSchema.parse(body);

    const updatedPropagation = await PropagationQueries.updateStatus(
      propagationId,
      status,
      notes
    );

    return NextResponse.json(updatedPropagation);
  } catch (error) {
    console.error('Error updating propagation status:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update propagation status' },
      { status: 500 }
    );
  }
}