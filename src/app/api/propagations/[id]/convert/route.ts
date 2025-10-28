import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { PropagationQueries } from '@/lib/db/queries/propagations';
import { z } from 'zod';

// Validation schema for conversion
const convertSchema = z.object({
  nickname: z.string().min(1).max(100).optional(),
  location: z.string().min(1).max(100).optional(),
});

// POST /api/propagations/[id]/convert - Convert propagation to plant instance
export async function POST(
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

    // Check if propagation is ready to be converted (should be ready)
    if (existingPropagation.status !== 'ready') {
      return NextResponse.json(
        { error: 'Propagation must be ready before converting to plant instance' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { nickname, location } = convertSchema.parse(body);

    const result = await PropagationQueries.convertToPlantInstance(propagationId, {
      nickname: nickname || existingPropagation.nickname,
      location: location || existingPropagation.location,
    });

    return NextResponse.json({
      success: true,
      plantInstanceId: result.plantInstanceId,
      propagation: result.propagation,
    });
  } catch (error) {
    console.error('Error converting propagation:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to convert propagation to plant instance' },
      { status: 500 }
    );
  }
}