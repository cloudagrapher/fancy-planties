import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PlantInstanceQueries } from '@/lib/db/queries/plant-instances';
import { enhancedPlantInstanceFilterSchema } from '@/lib/validation/plant-schemas';
import { validateVerifiedRequest } from '@/lib/auth/server';

// GET /api/plant-instances/enhanced-search - Enhanced search with advanced filtering
export async function GET(request: NextRequest) {
  try {
    const authResult = await validateVerifiedRequest();
    if (!authResult.user) {
      return NextResponse.json({ 
        success: false,
        error: authResult.error 
      }, { status: authResult.error === 'Email verification required' ? 403 : 401 });
    }
    
    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    
    // Parse enhanced filter parameters
    const filterParams = {
      userId: user.id,
      // Basic filters
      location: searchParams.get('location') || undefined,
      plantId: searchParams.get('plantId') ? parseInt(searchParams.get('plantId')!, 10) : undefined,
      isActive: searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined,
      overdueOnly: searchParams.get('overdueOnly') === 'true',
      dueSoonDays: searchParams.get('dueSoonDays') ? parseInt(searchParams.get('dueSoonDays')!, 10) : undefined,
      
      // Date filters
      createdAfter: searchParams.get('createdAfter') ? new Date(searchParams.get('createdAfter')!) : undefined,
      createdBefore: searchParams.get('createdBefore') ? new Date(searchParams.get('createdBefore')!) : undefined,
      lastFertilizedAfter: searchParams.get('lastFertilizedAfter') ? new Date(searchParams.get('lastFertilizedAfter')!) : undefined,
      lastFertilizedBefore: searchParams.get('lastFertilizedBefore') ? new Date(searchParams.get('lastFertilizedBefore')!) : undefined,
      
      // Enhanced search features
      searchQuery: searchParams.get('searchQuery') || undefined,
      searchFields: searchParams.get('searchFields') ? JSON.parse(searchParams.get('searchFields')!) : undefined,
      hasImages: searchParams.get('hasImages') ? searchParams.get('hasImages') === 'true' : undefined,
      imageCount: searchParams.get('imageCount') ? JSON.parse(searchParams.get('imageCount')!) : undefined,
      fertilizerFrequency: searchParams.get('fertilizerFrequency') ? JSON.parse(searchParams.get('fertilizerFrequency')!) : undefined,
      datePreset: searchParams.get('datePreset') as any || undefined,
      
      // Sorting and pagination
      sortBy: (searchParams.get('sortBy') as any) || 'created_at',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0,
      
      // Result options
      includeStats: searchParams.get('includeStats') === 'true',
      includeFacets: searchParams.get('includeFacets') === 'true',
    };

    // Apply date presets
    if (filterParams.datePreset) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (filterParams.datePreset) {
        case 'today':
          filterParams.createdAfter = today;
          break;
        case 'this_week':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          filterParams.createdAfter = weekStart;
          break;
        case 'this_month':
          filterParams.createdAfter = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'last_month':
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
          filterParams.createdAfter = lastMonth;
          filterParams.createdBefore = lastMonthEnd;
          break;
        case 'last_3_months':
          const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          filterParams.createdAfter = threeMonthsAgo;
          break;
      }
    }

    // Validate enhanced filter parameters
    const validatedFilters = enhancedPlantInstanceFilterSchema.parse(filterParams);
    
    // Use enhanced search if we have advanced features
    const hasAdvancedFeatures = validatedFilters.searchQuery || 
                                validatedFilters.hasImages !== undefined ||
                                validatedFilters.imageCount ||
                                validatedFilters.fertilizerFrequency ||
                                validatedFilters.datePreset;

    let result;
    if (hasAdvancedFeatures) {
      // Use enhanced search functionality
      result = await PlantInstanceQueries.enhancedSearch(validatedFilters);
    } else {
      // Fall back to regular filtering
      result = await PlantInstanceQueries.getWithFilters(validatedFilters);
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to perform enhanced search:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid search parameters',
          details: error.issues
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}