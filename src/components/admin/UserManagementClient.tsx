'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  type UserWithStats, 
  type UserFilters, 
  type UserSortConfig, 
  type PaginatedUsers 
} from '@/lib/db/queries/admin-users';
import { useBulkOperations } from '@/hooks/useBulkOperations';
import BulkOperationsToolbar from './BulkOperationsToolbar';

export interface UserManagementClientProps {
  initialData: PaginatedUsers;
  initialFilters: UserFilters;
  initialSort: UserSortConfig;
}

export default function UserManagementClient({
  initialData,
  initialFilters,
  initialSort,
}: UserManagementClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSort] = useState(initialSort);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Bulk operations
  const {
    selectedItems: selectedUsers,
    selectItem: selectUser,
    selectAll: selectAllUsers,
    clearSelection,
    isSelected,
    selectedCount,
    progress,
    executeBulkOperation,
  } = useBulkOperations<number>();
  
  // Update URL with current filters and sort
  const updateURL = useCallback((newFilters: UserFilters, newSort: UserSortConfig, page: number = 1) => {
    const params = new URLSearchParams();
    
    params.set('page', page.toString());
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.curatorStatus && newFilters.curatorStatus !== 'all') {
      params.set('curatorStatus', newFilters.curatorStatus);
    }
    if (newFilters.emailVerified !== undefined) {
      params.set('emailVerified', newFilters.emailVerified.toString());
    }
    params.set('sortField', newSort.field);
    params.set('sortDirection', newSort.direction);
    
    router.push(`/admin/users?${params.toString()}`);
  }, [router]);
  
  // Fetch users data
  const fetchUsers = useCallback(async (page: number = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: data.pageSize.toString(),
        sortField: sort.field,
        sortDirection: sort.direction,
      });
      
      if (filters.search) params.set('search', filters.search);
      if (filters.curatorStatus && filters.curatorStatus !== 'all') {
        params.set('curatorStatus', filters.curatorStatus);
      }
      if (filters.emailVerified !== undefined) {
        params.set('emailVerified', filters.emailVerified.toString());
      }
      
      const response = await fetch(`/api/admin/users?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const newData = await response.json();
      setData(newData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [data.pageSize, sort, filters]);
  
  // Handle search
  const handleSearch = useCallback((searchTerm: string) => {
    const newFilters = { ...filters, search: searchTerm };
    setFilters(newFilters);
    updateURL(newFilters, sort);
  }, [filters, sort, updateURL]);
  
  // Handle filter change
  const handleFilterChange = useCallback((key: keyof UserFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    updateURL(newFilters, sort);
  }, [filters, sort, updateURL]);
  
  // Handle sort change
  const handleSortChange = useCallback((field: UserSortConfig['field']) => {
    const newDirection: 'asc' | 'desc' = sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc';
    const newSort: UserSortConfig = { field, direction: newDirection };
    setSort(newSort);
    updateURL(filters, newSort);
  }, [sort, filters, updateURL]);
  
  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    updateURL(filters, sort, page);
    fetchUsers(page);
  }, [filters, sort, updateURL, fetchUsers]);
  
  // Handle curator status change
  const handleCuratorStatusChange = useCallback(async (userId: number, action: 'promote' | 'demote') => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/curator-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update curator status');
      }
      
      // Refresh the data
      await fetchUsers(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update curator status');
    }
  }, [data.page, fetchUsers]);
  
  // Refresh data when URL changes
  useEffect(() => {
    const currentPage = parseInt(searchParams.get('page') || '1');
    if (currentPage !== data.page) {
      fetchUsers(currentPage);
    }
  }, [searchParams, data.page, fetchUsers]);

  // Bulk operation handlers
  const handleBulkAction = async (actionId: string) => {
    await executeBulkOperation(async (userIds) => {
      const response = await fetch('/api/admin/users/bulk-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: actionId,
          userIds,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Operation failed');
      }

      const result = await response.json();
      
      // Refresh the user list after successful operation
      await fetchUsers(data.page);
      
      return {
        success: result.success,
        errors: result.errors || [],
      };
    });
  };

  const handleSelectAll = () => {
    selectAllUsers(data.users.map(u => u.id));
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/users/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedCount > 0 ? Array.from(selectedUsers) : undefined,
          format: 'csv',
          filters: selectedCount === 0 ? filters : undefined,
        }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export users');
    }
  };

  const bulkActions = [
    {
      id: 'promote',
      label: 'Promote to Curator',
      icon: '⬆️',
      variant: 'primary' as const,
    },
    {
      id: 'demote',
      label: 'Demote from Curator',
      icon: '⬇️',
      variant: 'secondary' as const,
      requiresConfirmation: true,
      confirmationMessage: `Are you sure you want to demote ${selectedCount} users from curator status?`,
    },
  ];
  
  return (
    <div className="user-management">
      <div className="user-management-header">
        <h1>User Management</h1>
        <p>Manage users, curator privileges, and view user statistics</p>
      </div>
      
      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      <UserManagementFilters
        filters={filters}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
      />
      
      <BulkOperationsToolbar
        selectedCount={selectedCount}
        totalCount={data.totalCount}
        actions={bulkActions}
        progress={progress}
        onAction={handleBulkAction}
        onSelectAll={handleSelectAll}
        onClearSelection={clearSelection}
        onExport={handleExport}
      />
      
      <UserManagementTable
        data={data}
        sort={sort}
        loading={loading}
        onSortChange={handleSortChange}
        onPageChange={handlePageChange}
        onCuratorStatusChange={handleCuratorStatusChange}
        selectedUsers={selectedUsers}
        onSelectUser={selectUser}
        isSelected={isSelected}
      />
    </div>
  );
}

interface UserManagementFiltersProps {
  filters: UserFilters;
  onSearch: (search: string) => void;
  onFilterChange: (key: keyof UserFilters, value: any) => void;
}

function UserManagementFilters({ filters, onSearch, onFilterChange }: UserManagementFiltersProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
  };
  
  return (
    <div className="user-filters">
      <form onSubmit={handleSearchSubmit} className="search-form">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="search-button">
          Search
        </button>
      </form>
      
      <div className="filter-controls">
        <select
          value={filters.curatorStatus || 'all'}
          onChange={(e) => onFilterChange('curatorStatus', e.target.value)}
          className="filter-select"
        >
          <option value="all">All Users</option>
          <option value="curators">Curators Only</option>
          <option value="users">Regular Users</option>
        </select>
        
        <select
          value={filters.emailVerified === undefined ? 'all' : filters.emailVerified.toString()}
          onChange={(e) => {
            const value = e.target.value === 'all' ? undefined : e.target.value === 'true';
            onFilterChange('emailVerified', value);
          }}
          className="filter-select"
        >
          <option value="all">All Verification Status</option>
          <option value="true">Email Verified</option>
          <option value="false">Email Not Verified</option>
        </select>
      </div>
    </div>
  );
}

interface UserManagementTableProps {
  data: PaginatedUsers;
  sort: UserSortConfig;
  loading: boolean;
  onSortChange: (field: UserSortConfig['field']) => void;
  onPageChange: (page: number) => void;
  onCuratorStatusChange: (userId: number, action: 'promote' | 'demote') => void;
  selectedUsers: Set<number>;
  onSelectUser: (userId: number) => void;
  isSelected: (userId: number) => boolean;
}

function UserManagementTable({
  data,
  sort,
  loading,
  onSortChange,
  onPageChange,
  onCuratorStatusChange,
  selectedUsers,
  onSelectUser,
  isSelected,
}: UserManagementTableProps) {
  const getSortIcon = (field: UserSortConfig['field']) => {
    if (sort.field !== field) return '↕️';
    return sort.direction === 'asc' ? '↑' : '↓';
  };
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };
  
  return (
    <div className="user-table-container">
      {loading && <div className="loading-overlay">Loading...</div>}
      
      <table className="user-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={data.users.length > 0 && selectedUsers.size === data.users.length}
                onChange={() => {
                  if (selectedUsers.size === data.users.length) {
                    data.users.forEach(user => onSelectUser(user.id));
                  } else {
                    data.users.forEach(user => {
                      if (!isSelected(user.id)) {
                        onSelectUser(user.id);
                      }
                    });
                  }
                }}
              />
            </th>
            <th onClick={() => onSortChange('name')} className="sortable">
              Name {getSortIcon('name')}
            </th>
            <th onClick={() => onSortChange('email')} className="sortable">
              Email {getSortIcon('email')}
            </th>
            <th>Status</th>
            <th onClick={() => onSortChange('plantCount')} className="sortable">
              Plants {getSortIcon('plantCount')}
            </th>
            <th>Activity</th>
            <th onClick={() => onSortChange('createdAt')} className="sortable">
              Joined {getSortIcon('createdAt')}
            </th>
            <th onClick={() => onSortChange('lastActive')} className="sortable">
              Last Active {getSortIcon('lastActive')}
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.users.map((user) => (
            <UserTableRow
              key={user.id}
              user={user}
              onCuratorStatusChange={onCuratorStatusChange}
              isSelected={isSelected(user.id)}
              onSelect={() => onSelectUser(user.id)}
            />
          ))}
        </tbody>
      </table>
      
      <UserTablePagination
        currentPage={data.page}
        totalPages={data.totalPages}
        totalCount={data.totalCount}
        onPageChange={onPageChange}
      />
    </div>
  );
}

interface UserTableRowProps {
  user: UserWithStats;
  onCuratorStatusChange: (userId: number, action: 'promote' | 'demote') => void;
  isSelected: boolean;
  onSelect: () => void;
}

function UserTableRow({ user, onCuratorStatusChange, isSelected, onSelect }: UserTableRowProps) {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString();
  };
  
  const handleCuratorAction = (action: 'promote' | 'demote') => {
    if (window.confirm(
      action === 'promote' 
        ? `Are you sure you want to promote ${user.name} to curator?`
        : `Are you sure you want to demote ${user.name} from curator?`
    )) {
      onCuratorStatusChange(user.id, action);
    }
  };
  
  return (
    <tr className={`${user.isCurator ? 'curator-row' : ''} ${isSelected ? 'selected' : ''}`}>
      <td>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
        />
      </td>
      <td>
        <div className="user-name">
          {user.name}
          {user.isCurator && <span className="curator-badge">Curator</span>}
        </div>
      </td>
      <td>
        <div className="user-email">
          {user.email}
          {!user.isEmailVerified && <span className="unverified-badge">Unverified</span>}
        </div>
      </td>
      <td>
        <div className="user-status">
          <span className={`status-badge ${user.isEmailVerified ? 'verified' : 'unverified'}`}>
            {user.isEmailVerified ? 'Verified' : 'Unverified'}
          </span>
        </div>
      </td>
      <td>
        <div className="user-stats">
          <span>{user.plantCount} plants</span>
          <span>{user.propagationCount} propagations</span>
        </div>
      </td>
      <td>
        <div className="user-activity">
          <span>{user.careEntriesCount} care entries</span>
        </div>
      </td>
      <td>{formatDate(user.createdAt)}</td>
      <td>{user.lastActive ? formatDate(user.lastActive) : 'Never'}</td>
      <td>
        <div className="user-actions">
          {user.isCurator ? (
            <button
              onClick={() => handleCuratorAction('demote')}
              className="action-button demote-button"
              title="Demote from curator"
            >
              Demote
            </button>
          ) : (
            <button
              onClick={() => handleCuratorAction('promote')}
              className="action-button promote-button"
              title="Promote to curator"
            >
              Promote
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

interface UserTablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

function UserTablePagination({
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
}: UserTablePaginationProps) {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  };
  
  return (
    <div className="pagination">
      <div className="pagination-info">
        Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalCount)} of {totalCount} users
      </div>
      
      <div className="pagination-controls">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="pagination-button"
        >
          Previous
        </button>
        
        {getPageNumbers().map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`pagination-button ${page === currentPage ? 'active' : ''}`}
          >
            {page}
          </button>
        ))}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="pagination-button"
        >
          Next
        </button>
      </div>
    </div>
  );
}