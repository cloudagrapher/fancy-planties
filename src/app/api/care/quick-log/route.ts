import { NextRequest, NextResponse } from 'next/server';
import { requireAuthSession } from '@/lib/auth/session';
import { CareService } from '@/lib/services/care-service';
import { careValidation } from '@/lib/validation/care-schemas';

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuthSession();
    const body = await request.json();
    
    // Validate the quick care log data
    const validation = careValidation.validateQuickCareLog({
      ...body,
      careDate: new Date(body.careDate || new Date()),
    });
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || 'Invalid quick care data' },
        { status: 400 }
      );
    }
    
    const result = await CareService.quickCareLog(user.id, validation.data);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json(result.careHistory);
  } catch (error) {
    console.error('Error with quick care log:', error);
    return NextResponse.json(
      { error: 'Failed to log quick care' },
      { status: 500 }
    );
  }
}