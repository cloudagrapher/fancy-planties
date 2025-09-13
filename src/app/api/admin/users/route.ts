import { NextRequest, NextResponse } from 'next/server';
import { validateCuratorRequest } from '@/lib/auth/server';
import { AdminUserQueries, type UserFilters, type UserSortConfig } from '@/lib/db/queries/admin-users';
import { z } from 'zod';

const getUsersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  curatorStatus: z.enum(['all', 'curators', 'users']).default('all'),
  emailVerified: z.coerce.boolean().optional(),
  sortField: z.enum(['name', 'email', 'createdAt', 'plantCount', 'lastActive']).default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
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
    
    const validatedParams = getUsersSchema.parse(params);
    
    // Build filters
    const filters: UserFilters = {
      search: validatedParams.search,
      curatorStatus: validatedParams.curatorStatus,
      emailVerified: validatedParams.emailVerified,
    };
    
    // Build sort config
    const sort: UserSortConfig = {
      field: validatedParams.sortField,
      direction: validatedParams.sortDirection,
    };
    
    // Get paginated users
    const result = await AdminUserQueries.getPaginatedUsers(
      validatedParams.page,
      validatedParams.pageSize,
      filters,
      sort
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get users:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to get users' },
      { status: 500 }
    );
  }
}