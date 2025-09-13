import 'server-only';
import { AdminUserQueries } from '@/lib/db/queries/admin-users';
import UserManagementClient from '@/components/admin/UserManagementClient';

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
  try {
    const params = await searchParams;
    
    // Parse search parameters with defaults
    const page = parseInt(params.page || '1');
    const pageSize = parseInt(params.pageSize || '20');
    const search = params.search;
    const curatorStatus = params.curatorStatus || 'all';
    const emailVerified = params.emailVerified ? params.emailVerified === 'true' : undefined;
    const sortField = params.sortField || 'createdAt';
    const sortDirection = params.sortDirection || 'desc';
    
    // Build filters
    const filters = {
      search,
      curatorStatus,
      emailVerified,
    };
    
    // Build sort config
    const sort = {
      field: sortField,
      direction: sortDirection,
    };
    
    // Get paginated users
    const usersData = await AdminUserQueries.getPaginatedUsers(
      page,
      pageSize,
      filters,
      sort
    );
    
    return (
      <UserManagementClient 
        initialData={usersData}
        initialFilters={filters}
        initialSort={sort}
      />
    );
  } catch (error) {
    console.error('Failed to load user management page:', error);
    
    return (
      <div className="user-management-error">
        <h1>User Management</h1>
        <div className="error-message">
          <p>Failed to load user data. Please try refreshing the page.</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
}