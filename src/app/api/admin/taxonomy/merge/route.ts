import { NextRequest, NextResponse } from 'next/server';
import { requireCuratorSession } from '@/lib/auth/server';
import { mergePlants } from '@/lib/db/queries/admin-taxonomy';
import { z } from 'zod';

const mergeSchema = z.object({
  sourceId: z.number(),
  targetId: z.number(),
  reason: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    await requireCuratorSession();

    const body = await request.json();
    const { sourceId, targetId, reason } = mergeSchema.parse(body);

    if (sourceId === targetId) {
      return NextResponse.json(
        { error: 'Cannot merge a plant with itself' },
        { status: 400 }
      );
    }

    await mergePlants({ sourceId, targetId, reason });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Failed to merge plants:', error);
    return NextResponse.json(
      { error: 'Failed to merge plants' },
      { status: 500 }
    );
  }
}