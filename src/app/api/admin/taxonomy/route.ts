import { NextRequest, NextResponse } from 'next/server';
import { validateCuratorRequest } from '@/lib/auth/server';
import { AdminTaxonomyQueries, type TaxonomyFilters } from '@/lib/db/queries/admin-taxonomy';
import { z } from 'zod';

const getTaxonomySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(50),
  family: z.string().optional(),
  genus: z.string().optional(),
  search: z.string().optional(),
  sortField: z.enum(['family', 'genus', 'species', 'instanceCount']).default('family'),
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
});

export async function GET(request: NextRequest) {
  try {
    // Validate curator access
    const authResult = await validateCuratorRequest();
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.error === 'Unauthorized' ? 401 : 403 }
      );
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    
    const validatedParams = getTaxonomySchema.parse(params);
    
    // Build filters
    const filters: TaxonomyFilters = {
      family: validatedParams.family,
      genus: validatedParams.genus,
      search: validatedParams.search,
    };
    
    // Get taxonomy hierarchy with usage statistics
    const hierarchy = await AdminTaxonomyQueries.getTaxonomyHierarchy();
    const stats = await AdminTaxonomyQueries.getTaxonomyStats();
    
    // Apply filters if provided
    let filteredHierarchy = hierarchy;
    if (filters.family) {
      filteredHierarchy = hierarchy.filter(node => 
        node.name.toLowerCase().includes(filters.family!.toLowerCase())
      );
    }
    if (filters.genus) {
      filteredHierarchy = filteredHierarchy.map(familyNode => ({
        ...familyNode,
        children: familyNode.children?.filter(genusNode =>
          genusNode.name.toLowerCase().includes(filters.genus!.toLowerCase())
        ) || []
      })).filter(familyNode => familyNode.children!.length > 0);
    }
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredHierarchy = filteredHierarchy.map(familyNode => ({
        ...familyNode,
        children: familyNode.children?.map(genusNode => ({
          ...genusNode,
          children: genusNode.children?.filter(speciesNode =>
            speciesNode.name.toLowerCase().includes(searchTerm) ||
            speciesNode.plants?.some(plant => 
              plant.commonName.toLowerCase().includes(searchTerm)
            )
          ) || []
        })).filter(genusNode => genusNode.children!.length > 0) || []
      })).filter(familyNode => familyNode.children!.length > 0);
    }
    
    return NextResponse.json({
      hierarchy: filteredHierarchy,
      stats,
      page: validatedParams.page,
      pageSize: validatedParams.pageSize,
    });
  } catch (error) {
    console.error('Failed to get taxonomy hierarchy:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to get taxonomy hierarchy' },
      { status: 500 }
    );
  }
}