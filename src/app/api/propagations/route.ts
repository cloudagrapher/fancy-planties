import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { PropagationQueries } from '@/lib/db/queries/propagations';
import { z } from 'zod';

const VALID_STATUSES = ['started', 'rooting', 'ready', 'planted'] as const;

// Validation schema for creating propagations
const createPropagationSchema = z.object({
  plantId: z.number().int().positive(),
  parentInstanceId: z.number().int().positive().optional().nullable(),
  nickname: z.string().min(1).max(100),
  location: z.string().min(1).max(100),
  dateStarted: z.string().datetime().transform(str => new Date(str)),
  status: z.enum(VALID_STATUSES).default('started'),
  sourceType: z.enum(['internal', 'external']).default('internal'),
  externalSource: z.enum(['gift', 'trade', 'purchase', 'other']).optional().nullable(),
  externalSourceDetails: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  images: z.array(z.string()).max(10).default([]),
}).refine(
  (data) => {
    // externalSource is required when sourceType is 'external'
    if (data.sourceType === 'external' && !data.externalSource) {
      return false;
    }
    return true;
  },
  { message: 'External source is required when source type is external', path: ['externalSource'] }
).refine(
  (data) => {
    // parentInstanceId should not be set for external propagations
    if (data.sourceType === 'external' && data.parentInstanceId) {
      return false;
    }
    return true;
  },
  { message: 'Parent instance should not be set for external propagations', path: ['parentInstanceId'] }
);

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
      // Validate status filter value
      if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
        return NextResponse.json(
          { error: `Invalid status filter: '${status}'. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      // Get propagations by status
      propagations = await PropagationQueries.getByStatus(
        user.id, 
        status as typeof VALID_STATUSES[number]
      );
    } else if (parentInstanceId) {
      // Get propagations from a specific parent plant
      propagations = await PropagationQueries.getByParentInstance(parseInt(parentInstanceId, 10), user.id);
    } else {
      // Get all propagations for user
      propagations = await PropagationQueries.getByUserId(user.id);
    }

    const response = NextResponse.json(propagations);
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    return response;
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
      sourceType: validatedData.sourceType,
      externalSource: validatedData.externalSource,
      externalSourceDetails: validatedData.externalSourceDetails,
      notes: validatedData.notes,
      images: validatedData.images,
    });

    return NextResponse.json(propagation, { status: 201 });
  } catch (error) {
    console.error('Error creating propagation:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: error.issues
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to create propagation'
      },
      { status: 500 }
    );
  }
}