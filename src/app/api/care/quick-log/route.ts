import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { CareService } from '@/lib/services/care-service';
import { careValidation } from '@/lib/validation/care-schemas';

export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    
    // Validate the quick care log data
    const validation = careValidation.validateQuickCareLog({
      ...body,
      careDate: new Date(body.careDate || new Date()),
    });
    
    if (!validation.success) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Quick care validation error:', validation.error.issues);
      }
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid quick care data' },
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