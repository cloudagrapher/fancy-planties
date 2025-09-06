import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { plantSearchService } from '@/lib/services/plant-search';
import { plantSearchSchema } from '@/lib/validation/plant-schemas';
import { ZodError } from 'zod';

// GET /api/plants/search - Search plants with fuzzy matching
export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchData = {
      query: searchParams.get('q') || searchParams.get('query') || '',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
      includeUnverified: searchParams.get('includeUnverified') !== 'false',
      familyFilter: searchParams.get('family') || undefined,
      genusFilter: searchParams.get('genus') || undefined,
    };

    if (!searchData.query) {
      return NextResponse.json(
        { error: 'Search query is required' }, 
        { status: 400 }
      );
    }

    const validatedSearch = plantSearchSchema.parse(searchData);
    
    const options = {
      filters: {
        family: searchData.familyFilter,
        genus: searchData.genusFilter,
        isVerified: searchParams.get('verified') === 'true' ? true : undefined,
      },
      userContext: {
        userId: user.id,
        includeUserPlants: searchParams.get('includeUserPlants') !== 'false',
      },
    };

    const results = await plantSearchService.hybridSearch(validatedSearch, options);

    return NextResponse.json({
      success: true,
      data: results,
      metadata: {
        operation: 'search',
        timestamp: new Date(),
        userId: user.id,
        performance: {
          queryTime: results.searchTime,
          cacheHit: !plantSearchService.getCacheStats().needsRefresh,
        },
      },
    });
  } catch (error) {
    console.error('Error searching plants:', error);
    
    if (error instanceof ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid search parameters', 
          details: error.issues 
        }, 
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// POST /api/plants/search - Advanced search with multiple criteria
export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const results = await plantSearchService.advancedSearch({
      ...body,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      data: results,
      metadata: {
        operation: 'advanced_search',
        timestamp: new Date(),
        userId: user.id,
        performance: {
          queryTime: results.searchTime,
          cacheHit: !plantSearchService.getCacheStats().needsRefresh,
        },
      },
    });
  } catch (error) {
    console.error('Error in advanced search:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}