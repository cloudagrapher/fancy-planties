import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateRequest } from '@/lib/auth/server';
import { advancedSearchService } from '@/lib/services/advanced-search';
import { searchSuggestionSchema } from '@/lib/validation/plant-schemas';

// GET /api/search/suggestions - Get search suggestions
export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '5');

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: { suggestions: [] },
      });
    }

    // Get search suggestions
    const suggestions = await advancedSearchService.getSearchSuggestions(
      query,
      user.id,
      limit
    );

    return NextResponse.json({
      success: true,
      data: { suggestions },
    });

  } catch (error) {
    console.error('Search suggestions error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get search suggestions' },
      { status: 500 }
    );
  }
}

// POST /api/search/suggestions - Get search suggestions with options
export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const params = searchSuggestionSchema.parse({
      ...body,
      userId: user.id,
    });

    // Get search suggestions
    const suggestions = await advancedSearchService.getSearchSuggestions(
      params.query,
      params.userId,
      params.limit
    );

    return NextResponse.json({
      success: true,
      data: { suggestions },
    });

  } catch (error) {
    console.error('Search suggestions error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get search suggestions' },
      { status: 500 }
    );
  }
}