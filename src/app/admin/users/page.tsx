import 'server-only';
import { AdminUserQueries } from '@/lib/db/queries/admin-users';
import OptimizedUserManagement from '@/components/admin/OptimizedUserManagement';
import AdminErrorBoundary from '@/components/admin/AdminErrorBoundary';
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

export default async function UserManagementPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Require user management permission
  await requirePermission('manage_users');
  
  const params = await searchParams;
  
  // Validate pagination parameters
  const paginationValidation = safeValidate(paginationSchema, {
    page: params.page,
    pageSize: params.pageSize,
  });
  
  if (!paginationValidation.success) {
    throw new Error('Invalid pagination parameters');
  }
  
  // Validate filter parameters
  const filtersValidation = safeValidate(userFiltersSchema, {
    search: params.search,
    curatorStatus: params.curatorStatus,
    emailVerified: params.emailVerified ? params.emailVerified === 'true' : undefined,
  });
  
  if (!filtersValidation.success) {
    throw new Error('Invalid filter parameters');
  }
  
  // Validate sort parameters
  const sortValidation = safeValidate(userSortSchema, {
    field: params.sortField,
    direction: params.sortDirection,
  });
  
  if (!sortValidation.success) {
    throw new Error('Invalid sort parameters');
  }
  
  // Get paginated users with validated parameters
  const usersData = await AdminUserQueries.getPaginatedUsers(
    paginationValidation.data.page,
    paginationValidation.data.pageSize,
    filtersValidation.data,
    sortValidation.data
  );
  
  return (
    <AdminErrorBoundary>
      <OptimizedUserManagement 
        initialFilters={filtersValidation.data}
        initialSort={sortValidation.data}
      />
    </AdminErrorBoundary>
  );
}