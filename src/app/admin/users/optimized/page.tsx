import 'server-only';
import { AdminUserQueries } from '@/lib/db/queries/admin-users';
import OptimizedUserManagement from '@/components/admin/OptimizedUserManagement';
import { AdminUserErrorBoundary } from '@/components/admin/AdminErrorBoundary';
import { requirePermission } from '@/lib/auth/admin-auth';
import { safeValidate, paginationSchema, userFiltersSchema, userSortSchema } from '@/lib/validation/admin-schemas';

// Force dynamic rendering for search params
export const dynamic = 'force-dynamic';

interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  curatorStatus?: 'all' | 'curators' | 'users';
  emailVerified?: string;
  sortField?: 'name' | 'email' | 'createdAt' | 'plantCount' | 'lastActive';
  sortDirection?: 'asc' | 'desc';
}

export default async function OptimizedUserManagementPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Require user management permission
  await requirePermission('manage_users');
  
  const params = await searchParams;
  
  // Validate filter parameters with defaults for optimization
  const filtersValidation = safeValidate(userFiltersSchema, {
    search: params.search,
    curatorStatus: params.curatorStatus || 'all',
    emailVerified: params.emailVerified ? params.emailVerified === 'true' : undefined,
  });
  
  if (!filtersValidation.success) {
    throw new Error('Invalid filter parameters');
  }
  
  // Validate sort parameters with defaults for optimization
  const sortValidation = safeValidate(userSortSchema, {
    field: params.sortField || 'createdAt',
    direction: params.sortDirection || 'desc',
  });
  
  if (!sortValidation.success) {
    throw new Error('Invalid sort parameters');
  }
  
  return (
    <AdminUserErrorBoundary>
      <div className="optimized-user-management-page">
        <OptimizedUserManagement 
          initialFilters={filtersValidation.data}
          initialSort={sortValidation.data}
        />
      </div>
    </AdminUserErrorBoundary>
  );
}