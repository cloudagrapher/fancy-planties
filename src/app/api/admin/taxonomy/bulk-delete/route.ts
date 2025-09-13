import { NextRequest, NextResponse } from 'next/server';
import { requireCuratorSession } from '@/lib/auth/server';
import { bulkDeletePlants } from '@/lib/db/queries/admin-taxonomy';
import { z } from 'zod';

const bulkDeleteSchema = z.object({
  plantIds: z.array(z.number()).min(1),
});

export async function POST(request: NextRequest) {
  try {
    await requireCuratorSession();

    const body = await request.json();
    const { plantIds } = bulkDeleteSchema.parse(body);

    const result = await bulkDeletePlants(plantIds);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Failed to bulk delete plants:', error);
    return NextResponse.json(
      { error: 'Failed to delete plants' },
      { status: 500 }
    );
  }
}