import { NextRequest, NextResponse } from 'next/server';
import { validateCuratorRequest } from '@/lib/auth/server';
import { AdminPlantQueries } from '@/lib/db/queries/admin-plants';
import { z } from 'zod';

const rejectSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Validate curator access
    const authResult = await validateCuratorRequest();
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.error === 'Unauthorized' ? 401 : 403 }
      );
    }

    const { id } = await context.params;
    const plantId = parseInt(id);

    if (isNaN(plantId)) {
      return NextResponse.json(
        { error: 'Invalid plant ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = rejectSchema.parse(body);

    // For now, we'll delete rejected plants
    // In a more sophisticated system, you might want to:
    // 1. Move to a rejected_plants table
    // 2. Add rejection reason to audit log
    // 3. Notify the submitter
    const deleted = await AdminPlantQueries.deletePlant(plantId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Plant not found or could not be deleted' },
        { status: 404 }
      );
    }

    // TODO: In a real system, you would:
    // 1. Log the rejection in an audit table
    // 2. Send notification to the plant submitter
    // 3. Store the rejection reason
    
    return NextResponse.json({
      success: true,
      message: 'Plant rejected and removed',
      reason: validatedData.reason,
    });
  } catch (error) {
    console.error('Failed to reject plant:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}