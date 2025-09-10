import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateRequest } from '@/lib/auth/server';
import { advancedSearchService } from '@/lib/services/advanced-search';
import { plantInstanceFilterSchema } from '@/lib/validation/plant-schemas';

// GET /api/search/presets/[presetId] - Search with a saved preset
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ presetId: string }> }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { presetId } = await context.params;
    const { searchParams } = new URL(request.url);
    
    // Parse any filter overrides from query params
    const overrides: any = {};
    
    if (searchParams.get('location')) {
      overrides.location = searchParams.get('location')!;
    }
    
    if (searchParams.get('overdueOnly')) {
      overrides.overdueOnly = searchParams.get('overdueOnly') === 'true';
    }
    
    if (searchParams.get('limit')) {
      overrides.limit = parseInt(searchParams.get('limit')!, 10);
    }
    
    if (searchParams.get('offset')) {
      overrides.offset = parseInt(searchParams.get('offset')!, 10);
    }

    // Search with preset
    const result = await advancedSearchService.searchWithPreset(
      presetId,
      user.id,
      overrides
    );

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Search with preset error:', error);
    
    if (error instanceof Error && error.message === 'Search preset not found') {
      return NextResponse.json(
        { error: 'Search preset not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Search with preset failed' },
      { status: 500 }
    );
  }
}