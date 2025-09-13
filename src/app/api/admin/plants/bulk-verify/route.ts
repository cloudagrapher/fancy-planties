import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireCuratorSession } from '@/lib/auth/server';
import { AdminPlantQueries } from '@/lib/db/queries/admin-plants';
import { z } from 'zod';

const bulkVerifySchema = z.object({
  plantIds: z.array(z.number()).min(1),
  isVerified: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    // Ensure user is a curator
    await requireCuratorSession();

    const body = await request.json();
    const { plantIds, isVerified } = bulkVerifySchema.parse(body);

    const updatedCount = await AdminPlantQueries.bulkUpdateVerification(plantIds, isVerified);

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `${updatedCount} plants ${isVerified ? 'verified' : 'unverified'} successfully`,
    });
  } catch (error) {
    console.error('Failed to bulk update plants:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update plants' },
      { status: 500 }
    );
  }
}