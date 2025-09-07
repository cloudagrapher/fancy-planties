import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { OfflineService } from '@/lib/services/offline-service';
import { z } from 'zod';

const syncRequestSchema = z.object({
  pendingEntries: z.array(z.object({
    id: z.string(),
    plantInstanceId: z.number(),
    careType: z.enum(['fertilizer', 'repot', 'water', 'prune', 'inspect', 'other']),
    notes: z.string().optional(),
    timestamp: z.string(),
  })),
});

/**
 * POST /api/offline/sync
 * Sync pending offline entries when back online
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { pendingEntries } = syncRequestSchema.parse(body);

    const results = await OfflineService.processPendingCareEntries(user.id, pendingEntries);
    
    return NextResponse.json({
      success: true,
      results,
      syncedCount: results.filter(r => r.success).length,
      failedCount: results.filter(r => !r.success).length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error syncing offline data:', error);
    return NextResponse.json(
      { error: 'Failed to sync offline data' },
      { status: 500 }
    );
  }
}