import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateRequest } from '@/lib/auth/server';
import { advancedSearchService } from '@/lib/services/advanced-search';
import { smartSearchSchema } from '@/lib/validation/plant-schemas';

// POST /api/search/smart - Smart search with intent detection
export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const searchParams = smartSearchSchema.parse(body);

    // Perform smart search
    const result = await advancedSearchService.smartSearch(
      searchParams.query,
      user.id,
      {
        limit: searchParams.limit,
        offset: searchParams.offset,
        autoCorrect: searchParams.autoCorrect,
        includeInactive: searchParams.includeInactive,
      }
    );

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Smart search error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Smart search failed' },
      { status: 500 }
    );
  }
}