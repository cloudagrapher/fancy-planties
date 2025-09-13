import { NextRequest, NextResponse } from 'next/server';
import { validateApiPermission, logAdminAction } from '@/lib/auth/admin-auth';
import { AdminUserQueries, type UserFilters, type UserSortConfig } from '@/lib/db/queries/admin-users';
import { safeValidate, paginationSchema, userFiltersSchema, userSortSchema } from '@/lib/validation/admin-schemas';

export async function GET(request: NextRequest) {
  try {
    // Validate admin permission
    const authResult = await validateApiPermission('manage_users');
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error.message },
        { status: authResult.status }
      );
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    
    // Validate pagination
    const paginationValidation = safeValidate(paginationSchema, params);
    if (!paginationValidation.success) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters', details: paginationValidation.errors },
        { status: 400 }
      );
    }
    
    // Validate filters
    const filtersValidation = safeValidate(userFiltersSchema, {
      ...params,
      emailVerified: params.emailVerified ? params.emailVerified === 'true' : undefined,
    });
    if (!filtersValidation.success) {
      return NextResponse.json(
        { error: 'Invalid filter parameters', details: filtersValidation.errors },
        { status: 400 }
      );
    }
    
    // Validate sort
    const sortValidation = safeValidate(userSortSchema, params);
    if (!sortValidation.success) {
      return NextResponse.json(
        { error: 'Invalid sort parameters', details: sortValidation.errors },
        { status: 400 }
      );
    }
    
    // Get paginated users
    const result = await AdminUserQueries.getPaginatedUsers(
      paginationValidation.data.page,
      paginationValidation.data.pageSize,
      filtersValidation.data,
      sortValidation.data
    );
    
    // Log the action
    await logAdminAction('list_users', 'user', undefined, {
      filters: filtersValidation.data,
      sort: sortValidation.data,
      resultCount: result.users.length,
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get users:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to get users';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}