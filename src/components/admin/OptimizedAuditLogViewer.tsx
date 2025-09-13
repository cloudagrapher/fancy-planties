'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAdminAuditLogs } from '@/lib/hooks/useAdminQueries';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useVirtualScroll, VirtualTableRow } from '@/lib/hooks/useVirtualScroll';

export interface AuditLogDisplay {
  id: number;
  action: string;
  entityType: 'user' | 'plant' | 'plant_instance' | 'propagation' | 'system';
  entityId?: number | null;
  performedBy: number;
  performedByName?: string;
  timestamp: string;
  details: Record<string, any>;
  ipAddress?: string | null;
  success: boolean;
}

export interface AuditFilters {
  action?: string;
  entityType?: 'user' | 'plant' | 'plant_instance' | 'propagation' | 'system';
  performedBy?: number;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  search?: string;
}

export interface OptimizedAuditLogViewerProps {
  initialLogs?: AuditLogDisplay[];
  initialTotalCount?: number;
  initialPage?: number;
  pageSize?: number;
}

export default function OptimizedAuditLogViewer({
  initialLogs = [],
  initialTotalCount = 0,
  initialPage = 1,
  pageSize = 100, // Larger page size for audit logs
}: OptimizedAuditLogViewerProps) {
  const [filters, setFilters] = useState<AuditFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(initialPage);
  
  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Update filters when debounced search changes
  const debouncedFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearchTerm || undefined,
  }), [filters, debouncedSearchTerm]);
  
  // Fetch audit logs with React Query
  const {
    data: auditData,
    isLoading,
    error,
    refetch,
  } = useAdminAuditLogs(currentPage, pageSize, debouncedFilters);
  
  const logs = auditData?.logs || initialLogs;
  const totalCount = auditData?.totalCount || initialTotalCount;
  
  // Virtual scrolling for large datasets
  const itemHeight = 100; // Height of each log row (taller for more details)
  const containerHeight = 700; // Height of the scrollable container
  
  const {
    startIndex,
    endIndex,
    totalHeight,
    offsetY,
    scrollElementProps,
  } = useVirtualScroll(logs.length, {
    itemHeight,
    containerHeight,
    overscan: 10, // More overscan for smoother scrolling
  });
  
  // Handle search with debouncing
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);
  
  // Handle filter change
  const handleFilterChange = useCallback((key: keyof AuditFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);
  
  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);
  
  // Visible logs for virtual scrolling
  const visibleLogs = useMemo(() => {
    return logs.slice(startIndex, endIndex + 1);
  }, [logs, startIndex, endIndex]);
  
  const totalPages = Math.ceil(totalCount / pageSize);
  
  if (error) {
    return (
      <div className="audit-log-error">
        <h2>Audit Logs</h2>
        <div className="error-message">
          <p>Failed to load audit logs: {error.message}</p>
          <button onClick={() => refetch()}>Retry</button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="audit-log-viewer">
      <div className="audit-log-header">
        <h2>Audit Logs</h2>
        <div className="audit-log-stats">
          Total: {totalCount} logs
        </div>
      </div>

      <AuditLogFilters
        filters={filters}
        searchTerm={searchTerm}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
      />

      <VirtualizedAuditLogTable
        logs={logs}
        visibleLogs={visibleLogs}
        loading={isLoading}
        virtualScrollProps={{
          totalHeight,
          offsetY,
          scrollElementProps,
          itemHeight,
        }}
      />

      {totalPages > 1 && (
        <AuditLogPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}

interface AuditLogFiltersProps {
  filters: AuditFilters;
  searchTerm: string;
  onSearch: (search: string) => void;
  onFilterChange: (key: keyof AuditFilters, value: any) => void;
}

function AuditLogFilters({ 
  filters, 
  searchTerm,
  onSearch, 
  onFilterChange 
}: AuditLogFiltersProps) {
  return (
    <div className="audit-log-filters">
      <div className="filter-row">
        <input
          type="text"
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
          className="filter-input"
        />
        
        <select
          value={filters.action || ''}
          onChange={(e) => onFilterChange('action', e.target.value || undefined)}
          className="filter-select"
        >
          <option value="">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="approve">Approve</option>
          <option value="reject">Reject</option>
          <option value="promote">Promote</option>
          <option value="demote">Demote</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
        </select>

        <select
          value={filters.entityType || ''}
          onChange={(e) => onFilterChange('entityType', e.target.value || undefined)}
          className="filter-select"
        >
          <option value="">All Entity Types</option>
          <option value="user">User</option>
          <option value="plant">Plant</option>
          <option value="plant_instance">Plant Instance</option>
          <option value="propagation">Propagation</option>
          <option value="system">System</option>
        </select>

        <select
          value={filters.success === undefined ? '' : filters.success.toString()}
          onChange={(e) => onFilterChange('success', 
            e.target.value === '' ? undefined : e.target.value === 'true'
          )}
          className="filter-select"
        >
          <option value="">All Results</option>
          <option value="true">Success</option>
          <option value="false">Failed</option>
        </select>
      </div>
      
      <div className="filter-row">
        <input
          type="date"
          value={filters.startDate ? filters.startDate.toISOString().split('T')[0] : ''}
          onChange={(e) => onFilterChange('startDate', e.target.value ? new Date(e.target.value) : undefined)}
          className="filter-input"
          placeholder="Start Date"
        />
        
        <input
          type="date"
          value={filters.endDate ? filters.endDate.toISOString().split('T')[0] : ''}
          onChange={(e) => onFilterChange('endDate', e.target.value ? new Date(e.target.value) : undefined)}
          className="filter-input"
          placeholder="End Date"
        />
        
        <button
          onClick={() => {
            onFilterChange('action', undefined);
            onFilterChange('entityType', undefined);
            onFilterChange('success', undefined);
            onFilterChange('startDate', undefined);
            onFilterChange('endDate', undefined);
            onSearch('');
          }}
          className="clear-filters-btn"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}

interface VirtualizedAuditLogTableProps {
  logs: AuditLogDisplay[];
  visibleLogs: AuditLogDisplay[];
  loading: boolean;
  virtualScrollProps: {
    totalHeight: number;
    offsetY: number;
    scrollElementProps: any;
    itemHeight: number;
  };
}

function VirtualizedAuditLogTable({
  logs,
  visibleLogs,
  loading,
  virtualScrollProps,
}: VirtualizedAuditLogTableProps) {
  const { totalHeight, offsetY, scrollElementProps, itemHeight } = virtualScrollProps;
  
  return (
    <div className="audit-log-table-container">
      {loading && <div className="loading-overlay">Loading...</div>}
      
      <div className="table-header">
        <div className="audit-log-table-header">
          <div className="header-row">
            <div className="header-cell timestamp">Timestamp</div>
            <div className="header-cell action">Action</div>
            <div className="header-cell entity">Entity</div>
            <div className="header-cell performer">Performed By</div>
            <div className="header-cell status">Status</div>
            <div className="header-cell details">Details</div>
          </div>
        </div>
      </div>
      
      <div {...scrollElementProps} className="virtual-table-body">
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleLogs.map((log, index) => {
            const actualIndex = logs.findIndex(l => l.id === log.id);
            return (
              <VirtualTableRow
                key={log.id}
                index={actualIndex}
                style={{
                  height: itemHeight,
                  top: offsetY + index * itemHeight,
                }}
              >
                <AuditLogRow log={log} />
              </VirtualTableRow>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface AuditLogRowProps {
  log: AuditLogDisplay;
}

function AuditLogRow({ log }: AuditLogRowProps) {
  const [expanded, setExpanded] = useState(false);
  
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  const formatEntityType = (entityType: string) => {
    return entityType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  
  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  
  return (
    <div className={`audit-log-row ${log.success ? 'success' : 'failed'}`}>
      <div className="log-row-main">
        <div className="log-cell timestamp">
          {formatTimestamp(log.timestamp)}
        </div>
        <div className="log-cell action">
          <span className={`action-badge ${log.action}`}>
            {formatAction(log.action)}
          </span>
        </div>
        <div className="log-cell entity">
          <div className="entity-info">
            <span className="entity-type">{formatEntityType(log.entityType)}</span>
            {log.entityId && <span className="entity-id">#{log.entityId}</span>}
          </div>
        </div>
        <div className="log-cell performer">
          <div className="performer-info">
            <span className="performer-name">{log.performedByName || 'Unknown'}</span>
            {log.ipAddress && <span className="ip-address">{log.ipAddress}</span>}
          </div>
        </div>
        <div className="log-cell status">
          <span className={`status-badge ${log.success ? 'success' : 'failed'}`}>
            {log.success ? 'Success' : 'Failed'}
          </span>
        </div>
        <div className="log-cell details">
          <button
            onClick={() => setExpanded(!expanded)}
            className="expand-btn"
          >
            {expanded ? 'Hide' : 'Show'} Details
          </button>
        </div>
      </div>
      
      {expanded && (
        <div className="log-row-details">
          <div className="details-content">
            <h4>Details:</h4>
            <pre>{JSON.stringify(log.details, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

interface AuditLogPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function AuditLogPagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
}: AuditLogPaginationProps) {
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
        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} logs
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