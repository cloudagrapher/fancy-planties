import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateRequest } from '@/lib/auth/server';
import { advancedSearchService } from '@/lib/services/advanced-search';
import { searchPresetSchema } from '@/lib/validation/plant-schemas';

// GET /api/search/presets - Get user's search presets
export async function GET() {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's search presets
    const presets = await advancedSearchService.getUserSearchPresets(user.id);

    return NextResponse.json({
      success: true,
      data: { presets },
    });

  } catch (error) {
    console.error('Get search presets error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get search presets' },
      { status: 500 }
    );
  }
}

// POST /api/search/presets - Save a new search preset
export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const presetData = searchPresetSchema.parse({
      ...body,
      userId: user.id,
    });

    // Save search preset
    const preset = await advancedSearchService.saveSearchPreset(
      presetData.name,
      presetData.description || '',
      presetData.filters,
      presetData.sortBy,
      presetData.sortOrder,
      user.id,
      presetData.isDefault
    );

    return NextResponse.json({
      success: true,
      data: { preset },
    });

  } catch (error) {
    console.error('Save search preset error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid preset data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to save search preset' },
      { status: 500 }
    );
  }
}