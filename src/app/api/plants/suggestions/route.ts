import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth';
import { getQuickSelectPlants } from '@/lib/db/queries/plant-taxonomy';
import { plantSearchService } from '@/lib/services/plant-search';

// GET /api/plants/suggestions - Get search suggestions and quick select plants
export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query');
    const type = searchParams.get('type') || 'all'; // 'suggestions', 'quick', or 'all'

    const response: {
      success: boolean;
      data: Record<string, unknown>;
      metadata: {
        operation: string;
        timestamp: Date;
        userId: number;
      };
    } = {
      success: true,
      data: {},
      metadata: {
        operation: 'suggestions',
        timestamp: new Date(),
        userId: user.id,
      },
    };

    // Get search suggestions if query provided
    if (query && (type === 'suggestions' || type === 'all')) {
      const suggestions = await plantSearchService.getSearchSuggestions(query, 5);
      response.data.suggestions = suggestions;
    }

    // Get quick select plants if requested
    if (type === 'quick' || type === 'all') {
      const quickSelect = await getQuickSelectPlants(user.id);
      response.data.quickSelect = quickSelect;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting suggestions:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}