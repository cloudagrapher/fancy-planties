import { NextRequest, NextResponse } from 'next/server';
import { requireAuthSession } from '@/lib/auth/server';
import { CareService } from '@/lib/services/care-service';
import { careValidation } from '@/lib/validation/care-schemas';

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuthSession();
    const body = await request.json();
    
    // Validate the care form data
    const validation = careValidation.validateCareForm({
      ...body,
      careDate: new Date(body.careDate),
    });
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid care data' },
        { status: 400 }
      );
    }
    
    const result = await CareService.logCareEvent(user.id, validation.data);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json(result.careHistory);
  } catch (error) {
    console.error('Error logging care:', error);
    return NextResponse.json(
      { error: 'Failed to log care event' },
      { status: 500 }
    );
  }
}