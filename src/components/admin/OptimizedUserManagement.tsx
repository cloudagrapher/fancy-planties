'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  useAdminUsers, 
  useUpdateCuratorStatus, 
  useBulkUserOperation 
} from '@/lib/hooks/useAdminQueries';
import { useDebounce, useDebouncedCallback } from '@/lib/hooks/useDebounce';
import { useVirtualScroll, VirtualTableRow } from '@/lib/hooks/useVirtualScroll';
import { useBulkOperations } from '@/hooks/useBulkOperations';
import BulkOperationsToolbar from './BulkOperationsToolbar';
import type { 
  UserWithStats, 
  UserFilters, 
  UserSortConfig 
} from '@/lib/db/queries/admin-users';

export interface OptimizedUserManagementProps {
  initialFilters: UserFilters;
  initialSort: UserSortConfig;
}

export default function OptimizedUserManagement({
  initialFilters,
  initialSort,
}: OptimizedUserManagementProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSort] = useState(initialSort);
  const [searchTerm, setSearchTerm] = useState(initialFilters.search || '');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50; // Larger page size for better performance
  
  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Update filters when debounced search changes
  const debouncedFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearchTerm || undefined,
  }), [filters, debouncedSearchTerm]);
  
  // Fetch users with React Query
  const {
    data: usersData,
    isLoading,
    error,
    refetch,
  } = useAdminUsers(currentPage, pageSize, debouncedFilters, sort);
  
  // Mutations
  const updateCuratorStatus = useUpdateCuratorStatus();
  const bulkUserOperation = useBulkUserOperation();
  
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
  
  // Virtual scrolling for large datasets
  const itemHeight = 60; // Height of each table row
  const containerHeight = 600; // Height of the scrollable container
  
  const {
    startIndex,
    endIndex,
    totalHeight,
    offsetY,
    scrollElementProps,
  } = useVirtualScroll(usersData?.users.length || 0, {
    itemHeight,
    containerHeight,
    overscan: 5,
  });
  
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
  
  // Debounced URL update to prevent excessive navigation
  const debouncedUpdateURL = useDebouncedCallback(updateURL, 500);
  
  // Handle search with debouncing
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    // URL will be updated when debouncedSearchTerm changes
  }, []);
  
  // Handle filter change
  const handleFilterChange = useCallback((key: keyof UserFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setCurrentPage(1);
    debouncedUpdateURL(newFilters, sort);
  }, [filters, sort, debouncedUpdateURL]);
  
  // Handle sort change
  const handleSortChange = useCallback((field: UserSortConfig['field']) => {
    const newDirection: 'asc' | 'desc' = sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc';
    const newSort: UserSortConfig = { field, direction: newDirection };
    setSort(newSort);
    debouncedUpdateURL(debouncedFilters, newSort, currentPage);
  }, [sort, debouncedFilters, currentPage, debouncedUpdateURL]);
  
  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    updateURL(debouncedFilters, sort, page);
  }, [debouncedFilters, sort, updateURL]);
  
  // Handle curator status change
  const handleCuratorStatusChange = useCallback(async (userId: number, action: 'promote' | 'demote') => {
    try {
      await updateCuratorStatus.mutateAsync({ userId, action });
    } catch (error) {
      console.error('Failed to update curator status:', error);
    }
  }, [updateCuratorStatus]);
  
  // Bulk operation handlers
  const handleBulkAction = useCallback(async (actionId: string) => {
    const selectedUserIds = Array.from(selectedUsers);
    
    await executeBulkOperation(async (userIds) => {
      const result = await bulkUserOperation.mutateAsync({
        operation: actionId,
        userIds,
      });
      
      return {
        success: result.success || [],
        errors: result.errors || [],
      };
    });
  }, [selectedUsers, executeBulkOperation, bulkUserOperation]);

  const handleSelectAll = useCallback(() => {
    if (usersData?.users) {
      selectAllUsers(usersData.users.map(u => u.id));
    }
  }, [usersData?.users, selectAllUsers]);

  const handleExport = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/users/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedCount > 0 ? Array.from(selectedUsers) : undefined,
          format: 'csv',
          filters: selectedCount === 0 ? debouncedFilters : undefined,
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
    }
  }, [selectedCount, selectedUsers, debouncedFilters]);

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
  
  // Visible users for virtual scrolling
  const visibleUsers = useMemo(() => {
    if (!usersData?.users) return [];
    return usersData.users.slice(startIndex, endIndex + 1);
  }, [usersData?.users, startIndex, endIndex]);
  
  if (error) {
    return (
      <div className="user-management-error">
        <h1>User Management</h1>
        <div className="error-message">
          <p>Failed to load user data: {error.message}</p>
          <button onClick={() => refetch()}>Retry</button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="user-management">
      <div className="user-management-header">
        <h1>User Management</h1>
        <p>Manage users, curator privileges, and view user statistics</p>
        {usersData && (
          <div className="stats">
            Total: {usersData.totalCount} users
          </div>
        )}
      </div>
      
      <UserManagementFilters
        filters={filters}
        searchTerm={searchTerm}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
      />
      
      <BulkOperationsToolbar
        selectedCount={selectedCount}
        totalCount={usersData?.totalCount || 0}
        actions={bulkActions}
        progress={progress}
        onAction={handleBulkAction}
        onSelectAll={handleSelectAll}
        onClearSelection={clearSelection}
        onExport={handleExport}
      />
      
      <VirtualizedUserTable
        users={usersData?.users || []}
        visibleUsers={visibleUsers}
        sort={sort}
        loading={isLoading}
        onSortChange={handleSortChange}
        onCuratorStatusChange={handleCuratorStatusChange}
        selectedUsers={selectedUsers}
        onSelectUser={selectUser}
        isSelected={isSelected}
        virtualScrollProps={{
          totalHeight,
          offsetY,
          scrollElementProps,
          itemHeight,
        }}
      />
      
      {usersData && (
        <UserTablePagination
          currentPage={currentPage}
          totalPages={usersData.totalPages}
          totalCount={usersData.totalCount}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}

interface UserManagementFiltersProps {
  filters: UserFilters;
  searchTerm: string;
  onSearch: (search: string) => void;
  onFilterChange: (key: keyof UserFilters, value: any) => void;
}

function UserManagementFilters({ 
  filters, 
  searchTerm, 
  onSearch, 
  onFilterChange 
}: UserManagementFiltersProps) {
  return (
    <div className="user-filters">
      <div className="search-form">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
          className="search-input"
        />
      </div>
      
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

interface VirtualizedUserTableProps {
  users: UserWithStats[];
  visibleUsers: UserWithStats[];
  sort: UserSortConfig;
  loading: boolean;
  onSortChange: (field: UserSortConfig['field']) => void;
  onCuratorStatusChange: (userId: number, action: 'promote' | 'demote') => void;
  selectedUsers: Set<number>;
  onSelectUser: (userId: number) => void;
  isSelected: (userId: number) => boolean;
  virtualScrollProps: {
    totalHeight: number;
    offsetY: number;
    scrollElementProps: any;
    itemHeight: number;
  };
}

function VirtualizedUserTable({
  users,
  visibleUsers,
  sort,
  loading,
  onSortChange,
  onCuratorStatusChange,
  selectedUsers,
  onSelectUser,
  isSelected,
  virtualScrollProps,
}: VirtualizedUserTableProps) {
  const { totalHeight, offsetY, scrollElementProps, itemHeight } = virtualScrollProps;
  
  const getSortIcon = (field: UserSortConfig['field']) => {
    if (sort.field !== field) return '↕️';
    return sort.direction === 'asc' ? '↑' : '↓';
  };
  
  return (
    <div className="admin-table-wrapper">
      <div className="admin-table-container">
        {loading && <div className="loading-overlay">Loading...</div>}

        <div className="table-header">
        <table className="user-table-header">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={users.length > 0 && selectedUsers.size === users.length}
                  onChange={() => {
                    if (selectedUsers.size === users.length) {
                      users.forEach(user => onSelectUser(user.id));
                    } else {
                      users.forEach(user => {
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
        </table>
      </div>
      
      <div {...scrollElementProps} className="virtual-table-body">
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleUsers.map((user, index) => {
            const actualIndex = users.findIndex(u => u.id === user.id);
            return (
              <VirtualTableRow
                key={user.id}
                index={actualIndex}
                style={{
                  height: itemHeight,
                  top: offsetY + index * itemHeight,
                }}
              >
                <UserTableRow
                  user={user}
                  onCuratorStatusChange={onCuratorStatusChange}
                  isSelected={isSelected(user.id)}
                  onSelect={() => onSelectUser(user.id)}
                />
              </VirtualTableRow>
            );
          })}
        </div>
      </div>
      </div>
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
    <div className={`user-row ${user.isCurator ? 'curator-row' : ''} ${isSelected ? 'selected' : ''}`}>
      <div className="user-cell">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
        />
      </div>
      <div className="user-cell">
        <div className="user-name">
          {user.name}
          {user.isCurator && <span className="curator-badge">Curator</span>}
        </div>
      </div>
      <div className="user-cell">
        <div className="user-email">
          {user.email}
          {!user.isEmailVerified && <span className="unverified-badge">Unverified</span>}
        </div>
      </div>
      <div className="user-cell">
        <span className={`status-badge ${user.isEmailVerified ? 'verified' : 'unverified'}`}>
          {user.isEmailVerified ? 'Verified' : 'Unverified'}
        </span>
      </div>
      <div className="user-cell">
        <div className="user-stats">
          <span>{user.plantCount} plants</span>
          <span>{user.propagationCount} propagations</span>
        </div>
      </div>
      <div className="user-cell">
        <span>{user.careEntriesCount} care entries</span>
      </div>
      <div className="user-cell">{formatDate(user.createdAt)}</div>
      <div className="user-cell">{user.lastActive ? formatDate(user.lastActive) : 'Never'}</div>
      <div className="user-cell">
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
    </div>
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
        Showing {((currentPage - 1) * 50) + 1} to {Math.min(currentPage * 50, totalCount)} of {totalCount} users
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