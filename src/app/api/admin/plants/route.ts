import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireCuratorSession } from '@/lib/auth/server';
import { AdminPlantQueries } from '@/lib/db/queries/admin-plants';
import type { PlantFilters, PlantSortConfig } from '@/lib/db/queries/admin-plants';

export async function GET(request: NextRequest) {
  try {
    // Ensure user is a curator
    await requireCuratorSession();

    const { searchParams } = new URL(request.url);
    
    // Parse pagination
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;

    // Parse filters
    const filters: PlantFilters = {};
    if (searchParams.get('search')) filters.search = searchParams.get('search')!;
    if (searchParams.get('family')) filters.family = searchParams.get('family')!;
    if (searchParams.get('genus')) filters.genus = searchParams.get('genus')!;
    if (searchParams.get('species')) filters.species = searchParams.get('species')!;
    if (searchParams.get('isVerified')) {
      filters.isVerified = searchParams.get('isVerified') === 'true';
    }
    if (searchParams.get('createdBy')) {
      filters.createdBy = parseInt(searchParams.get('createdBy')!);
    }

    // Parse sorting
    const sort: PlantSortConfig = {
      field: (searchParams.get('sortField') as PlantSortConfig['field']) || 'updatedAt',
      direction: (searchParams.get('sortDirection') as 'asc' | 'desc') || 'desc',
    };

    const { plants, totalCount } = await AdminPlantQueries.getPlantsWithDetails(
      filters,
      sort,
      pageSize,
      offset
    );

    return NextResponse.json({
      plants,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  } catch (error) {
    console.error('Failed to get admin plants:', error);
    return NextResponse.json(
      { error: 'Failed to get plants' },
      { status: 500 }
    );
  }
}