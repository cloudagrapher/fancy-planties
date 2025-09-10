import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { advancedSearchService } from '@/lib/services/advanced-search';

// GET /api/search/history - Get user's search history
export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Get search history
    const history = await advancedSearchService.getSearchHistory(user.id, limit);

    return NextResponse.json({
      success: true,
      data: { history },
    });

  } catch (error) {
    console.error('Get search history error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get search history' },
      { status: 500 }
    );
  }
}

// DELETE /api/search/history - Clear user's search history
export async function DELETE(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clear search history
    await advancedSearchService.clearSearchHistory(user.id);

    return NextResponse.json({
      success: true,
      message: 'Search history cleared',
    });

  } catch (error) {
    console.error('Clear search history error:', error);
    
    return NextResponse.json(
      { error: 'Failed to clear search history' },
      { status: 500 }
    );
  }
}