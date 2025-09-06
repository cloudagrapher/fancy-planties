import { NextRequest, NextResponse } from 'next/server';
import { PlantInstanceQueries } from '@/lib/db/queries/plant-instances';
import { plantInstanceSearchSchema } from '@/lib/validation/plant-schemas';
import { validateRequest } from '@/lib/auth';

// GET /api/plant-instances/search - Search plant instances
export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('query');
    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    // Parse search parameters
    const searchData = {
      query,
      userId: user.id,
      activeOnly: searchParams.get('activeOnly') !== 'false', // Default to true
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    // Validate search parameters
    const validatedSearch = plantInstanceSearchSchema.parse(searchData);
    
    // Perform search
    const result = await PlantInstanceQueries.searchWithFilters(validatedSearch);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to search plant instances:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to search plant instances' },
      { status: 500 }
    );
  }
}