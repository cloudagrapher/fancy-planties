import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateRequest } from '@/lib/auth/server';
import { advancedSearchService } from '@/lib/services/advanced-search';
import { multiFieldSearchSchema } from '@/lib/validation/plant-schemas';

// POST /api/search/advanced - Multi-field advanced search
export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate request body
    const searchSchema = z.object({
      criteria: multiFieldSearchSchema,
      options: z.object({
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
        sortBy: z.enum(['nickname', 'location', 'created_at', 'last_fertilized', 'fertilizer_due', 'care_urgency', 'plant_name']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
      }).optional(),
    });

    const { criteria, options = {} } = searchSchema.parse(body);

    // Perform advanced search
    const result = await advancedSearchService.multiFieldSearch(
      criteria,
      user.id,
      options
    );

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Advanced search error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}