import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { CareService } from '@/lib/services/care-service';
import { careValidation } from '@/lib/validation/care-schemas';

/**
 * POST /api/care/bulk - Log care for multiple plants in a single request
 * Replaces N individual quick-log calls with one batch operation
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Parse careDate string to Date if provided
    const parsedBody = {
      ...body,
      careDate: body.careDate ? new Date(body.careDate) : new Date(),
    };

    const validation = careValidation.validateBulkCare(parsedBody);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid bulk care data' },
        { status: 400 }
      );
    }

    const result = await CareService.bulkCareOperation(user.id, validation.data);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error with bulk care:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk care operation' },
      { status: 500 }
    );
  }
}
