'use client';

import { useState, useCallback, useMemo } from 'react';
import { 
  useAdminPlants, 
  useAdminPlantTaxonomy,
  useUpdatePlant, 
  useBulkPlantOperation 
} from '@/lib/hooks/useAdminQueries';
import { useDebounce, useDebouncedCallback } from '@/lib/hooks/useDebounce';
import { useVirtualScroll, VirtualTableRow } from '@/lib/hooks/useVirtualScroll';
import { useBulkOperations } from '@/hooks/useBulkOperations';
import BulkOperationsToolbar from './BulkOperationsToolbar';
import type { 
  PlantWithDetails, 
  PlantFilters, 
  PlantSortConfig 
} from '@/lib/db/queries/admin-plants';

export interface OptimizedPlantManagementProps {
  initialPlants?: PlantWithDetails[];
  initialTotalCount?: number;
}

export default function OptimizedPlantManagement({
  initialPlants = [],
  initialTotalCount = 0,
}: OptimizedPlantManagementProps) {
  const [filters, setFilters] = useState<PlantFilters>({});
  const [sort, setSort] = useState<PlantSortConfig>({ field: 'updatedAt', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<PlantWithDetails>>({});
  const pageSize = 50;
  
  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Update filters when debounced search changes
  const debouncedFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearchTerm || undefined,
  }), [filters, debouncedSearchTerm]);
  
  // Fetch plants with React Query
  const {
    data: plantsData,
    isLoading,
    error,
    refetch,
  } = useAdminPlants(currentPage, pageSize, debouncedFilters, sort);
  
  // Fetch taxonomy options
  const { data: taxonomyOptions } = useAdminPlantTaxonomy();
  
  // Mutations
  const updatePlant = useUpdatePlant();
  const bulkPlantOperation = useBulkPlantOperation();
  
  // Bulk operations
  const {
    selectedItems: selectedPlants,
    selectItem: selectPlant,
    selectAll: selectAllPlants,
    clearSelection,
    isSelected,
    selectedCount,
    progress,
    executeBulkOperation,
  } = useBulkOperations<number>();
  
  // Virtual scrolling for large datasets
  const itemHeight = 80; // Height of each table row
  const containerHeight = 600; // Height of the scrollable container
  
  const plants = plantsData?.plants || initialPlants;
  const totalCount = plantsData?.totalCount || initialTotalCount;
  
  const {
    startIndex,
    endIndex,
    totalHeight,
    offsetY,
    scrollElementProps,
  } = useVirtualScroll(plants.length, {
    itemHeight,
    containerHeight,
    overscan: 5,
  });
  
  // Handle search with debouncing
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);
  
  // Handle filter change
  const handleFilterChange = useCallback((key: keyof PlantFilters, value: string | boolean | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);
  
  // Handle sort change
  const handleSortChange = useCallback((field: PlantSortConfig['field']) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1);
  }, []);
  
  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);
  
  // Handle edit start
  const startEdit = useCallback((plant: PlantWithDetails) => {
    setEditingId(plant.id);
    setEditForm({
      family: plant.family,
      genus: plant.genus,
      species: plant.species,
      cultivar: plant.cultivar || '',
      commonName: plant.commonName,
      careInstructions: plant.careInstructions || '',
    });
  }, []);
  
  // Handle edit save
  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    
    try {
      await updatePlant.mutateAsync({
        plantId: editingId,
        data: editForm,
      });
      
      setEditingId(null);
      setEditForm({});
    } catch (error) {
      console.error('Failed to save plant:', error);
    }
  }, [editingId, editForm, updatePlant]);
  
  // Handle edit cancel
  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditForm({});
  }, []);
  
  // Bulk operation handlers
  const handleBulkAction = useCallback(async (actionId: string) => {
    const selectedPlantIds = Array.from(selectedPlants);
    
    await executeBulkOperation(async (plantIds) => {
      const result = await bulkPlantOperation.mutateAsync({
        operation: actionId,
        plantIds,
      });
      
      return {
        success: result.success || [],
        errors: result.errors || [],
      };
    });
  }, [selectedPlants, executeBulkOperation, bulkPlantOperation]);

  const handleSelectAll = useCallback(() => {
    selectAllPlants(plants.map(p => p.id));
  }, [plants, selectAllPlants]);

  const handleExport = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/plants/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantIds: selectedCount > 0 ? Array.from(selectedPlants) : undefined,
          format: 'csv',
          filters: selectedCount === 0 ? debouncedFilters : undefined,
        }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plants-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [selectedCount, selectedPlants, debouncedFilters]);

  const bulkActions = [
    {
      id: 'verify',
      label: 'Verify',
      icon: '✓',
      variant: 'primary' as const,
    },
    {
      id: 'unverify',
      label: 'Unverify',
      icon: '✗',
      variant: 'secondary' as const,
    },
    {
      id: 'approve',
      label: 'Approve',
      icon: '👍',
      variant: 'primary' as const,
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: '🗑️',
      variant: 'danger' as const,
      requiresConfirmation: true,
      confirmationMessage: `Are you sure you want to delete ${selectedCount} plants? This action cannot be undone.`,
    },
  ];
  
  // Visible plants for virtual scrolling
  const visiblePlants = useMemo(() => {
    return plants.slice(startIndex, endIndex + 1);
  }, [plants, startIndex, endIndex]);
  
  const totalPages = Math.ceil(totalCount / pageSize);
  
  if (error) {
    return (
      <div className="plant-management-error">
        <h1>Plant Management</h1>
        <div className="error-message">
          <p>Failed to load plant data: {error.message}</p>
          <button onClick={() => refetch()}>Retry</button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="plant-management">
      <div className="plant-management-header">
        <h1>Plant Management</h1>
        <div className="plant-management-stats">
          Total: {totalCount} plants
        </div>
      </div>

      <PlantManagementFilters
        filters={filters}
        searchTerm={searchTerm}
        taxonomyOptions={taxonomyOptions}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
      />

      <BulkOperationsToolbar
        selectedCount={selectedCount}
        totalCount={totalCount}
        actions={bulkActions}
        progress={progress}
        onAction={handleBulkAction}
        onSelectAll={handleSelectAll}
        onClearSelection={clearSelection}
        onExport={handleExport}
      />

      <VirtualizedPlantTable
        plants={plants}
        visiblePlants={visiblePlants}
        sort={sort}
        loading={isLoading}
        editingId={editingId}
        editForm={editForm}
        onSortChange={handleSortChange}
        onStartEdit={startEdit}
        onSaveEdit={saveEdit}
        onCancelEdit={cancelEdit}
        onEditFormChange={setEditForm}
        selectedPlants={selectedPlants}
        onSelectPlant={selectPlant}
        isSelected={isSelected}
        virtualScrollProps={{
          totalHeight,
          offsetY,
          scrollElementProps,
          itemHeight,
        }}
      />

      {totalPages > 1 && (
        <PlantTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}

interface PlantManagementFiltersProps {
  filters: PlantFilters;
  searchTerm: string;
  taxonomyOptions?: {
    families: string[];
    genera: string[];
    species: string[];
  };
  onSearch: (search: string) => void;
  onFilterChange: (key: keyof PlantFilters, value: string | boolean | undefined) => void;
}

function PlantManagementFilters({ 
  filters, 
  searchTerm,
  taxonomyOptions,
  onSearch, 
  onFilterChange 
}: PlantManagementFiltersProps) {
  return (
    <div className="plant-filters">
      <input
        type="text"
        placeholder="Search plants..."
        value={searchTerm}
        onChange={(e) => onSearch(e.target.value)}
        className="filter-input"
      />
      
      <select
        value={filters.family || ''}
        onChange={(e) => onFilterChange('family', e.target.value || undefined)}
        className="filter-select"
      >
        <option value="">All Families</option>
        {taxonomyOptions?.families.map(family => (
          <option key={family} value={family}>{family}</option>
        ))}
      </select>

      <select
        value={filters.genus || ''}
        onChange={(e) => onFilterChange('genus', e.target.value || undefined)}
        className="filter-select"
      >
        <option value="">All Genera</option>
        {taxonomyOptions?.genera.map(genus => (
          <option key={genus} value={genus}>{genus}</option>
        ))}
      </select>

      <select
        value={filters.isVerified === undefined ? '' : filters.isVerified.toString()}
        onChange={(e) => onFilterChange('isVerified', 
          e.target.value === '' ? undefined : e.target.value === 'true'
        )}
        className="filter-select"
      >
        <option value="">All Status</option>
        <option value="true">Verified</option>
        <option value="false">Unverified</option>
      </select>
    </div>
  );
}

interface VirtualizedPlantTableProps {
  plants: PlantWithDetails[];
  visiblePlants: PlantWithDetails[];
  sort: PlantSortConfig;
  loading: boolean;
  editingId: number | null;
  editForm: Partial<PlantWithDetails>;
  onSortChange: (field: PlantSortConfig['field']) => void;
  onStartEdit: (plant: PlantWithDetails) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditFormChange: (form: Partial<PlantWithDetails>) => void;
  selectedPlants: Set<number>;
  onSelectPlant: (plantId: number) => void;
  isSelected: (plantId: number) => boolean;
  virtualScrollProps: {
    totalHeight: number;
    offsetY: number;
    scrollElementProps: any;
    itemHeight: number;
  };
}

function VirtualizedPlantTable({
  plants,
  visiblePlants,
  sort,
  loading,
  editingId,
  editForm,
  onSortChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditFormChange,
  selectedPlants,
  onSelectPlant,
  isSelected,
  virtualScrollProps,
}: VirtualizedPlantTableProps) {
  const { totalHeight, offsetY, scrollElementProps, itemHeight } = virtualScrollProps;
  
  const getSortIcon = (field: PlantSortConfig['field']) => {
    if (sort.field !== field) return '↕️';
    return sort.direction === 'asc' ? '↑' : '↓';
  };
  
  return (
    <div className="admin-table-wrapper">
      <div className="admin-table-container">
        {loading && <div className="loading-overlay">Loading...</div>}

        <div className="table-header">
        <table className="plant-table-header">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={plants.length > 0 && selectedPlants.size === plants.length}
                  onChange={() => {
                    if (selectedPlants.size === plants.length) {
                      plants.forEach(plant => onSelectPlant(plant.id));
                    } else {
                      plants.forEach(plant => {
                        if (!isSelected(plant.id)) {
                          onSelectPlant(plant.id);
                        }
                      });
                    }
                  }}
                />
              </th>
              <th 
                onClick={() => onSortChange('commonName')}
                className={`sortable ${sort.field === 'commonName' ? sort.direction : ''}`}
              >
                Common Name {getSortIcon('commonName')}
              </th>
              <th 
                onClick={() => onSortChange('family')}
                className={`sortable ${sort.field === 'family' ? sort.direction : ''}`}
              >
                Family {getSortIcon('family')}
              </th>
              <th 
                onClick={() => onSortChange('genus')}
                className={`sortable ${sort.field === 'genus' ? sort.direction : ''}`}
              >
                Genus {getSortIcon('genus')}
              </th>
              <th 
                onClick={() => onSortChange('species')}
                className={`sortable ${sort.field === 'species' ? sort.direction : ''}`}
              >
                Species {getSortIcon('species')}
              </th>
              <th>Cultivar</th>
              <th>Status</th>
              <th>Usage</th>
              <th>Created By</th>
              <th 
                onClick={() => onSortChange('updatedAt')}
                className={`sortable ${sort.field === 'updatedAt' ? sort.direction : ''}`}
              >
                Updated {getSortIcon('updatedAt')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
        </table>
      </div>
      
      <div {...scrollElementProps} className="virtual-table-body">
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visiblePlants.map((plant, index) => {
            const actualIndex = plants.findIndex(p => p.id === plant.id);
            return (
              <VirtualTableRow
                key={plant.id}
                index={actualIndex}
                style={{
                  height: itemHeight,
                  top: offsetY + index * itemHeight,
                }}
              >
                <PlantTableRow
                  plant={plant}
                  editingId={editingId}
                  editForm={editForm}
                  onStartEdit={onStartEdit}
                  onSaveEdit={onSaveEdit}
                  onCancelEdit={onCancelEdit}
                  onEditFormChange={onEditFormChange}
                  isSelected={isSelected(plant.id)}
                  onSelect={() => onSelectPlant(plant.id)}
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

interface PlantTableRowProps {
  plant: PlantWithDetails;
  editingId: number | null;
  editForm: Partial<PlantWithDetails>;
  onStartEdit: (plant: PlantWithDetails) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditFormChange: (form: Partial<PlantWithDetails>) => void;
  isSelected: boolean;
  onSelect: () => void;
}

function PlantTableRow({
  plant,
  editingId,
  editForm,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditFormChange,
  isSelected,
  onSelect,
}: PlantTableRowProps) {
  const isEditing = editingId === plant.id;
  
  return (
    <div className={`plant-row ${isSelected ? 'selected' : ''}`}>
      <div className="plant-cell">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
        />
      </div>
      <div className="plant-cell">
        {isEditing ? (
          <input
            type="text"
            value={editForm.commonName || ''}
            onChange={(e) => onEditFormChange({ ...editForm, commonName: e.target.value })}
            className="edit-input"
          />
        ) : (
          plant.commonName
        )}
      </div>
      <div className="plant-cell">
        {isEditing ? (
          <input
            type="text"
            value={editForm.family || ''}
            onChange={(e) => onEditFormChange({ ...editForm, family: e.target.value })}
            className="edit-input"
          />
        ) : (
          plant.family
        )}
      </div>
      <div className="plant-cell">
        {isEditing ? (
          <input
            type="text"
            value={editForm.genus || ''}
            onChange={(e) => onEditFormChange({ ...editForm, genus: e.target.value })}
            className="edit-input"
          />
        ) : (
          plant.genus
        )}
      </div>
      <div className="plant-cell">
        {isEditing ? (
          <input
            type="text"
            value={editForm.species || ''}
            onChange={(e) => onEditFormChange({ ...editForm, species: e.target.value })}
            className="edit-input"
          />
        ) : (
          plant.species
        )}
      </div>
      <div className="plant-cell">
        {isEditing ? (
          <input
            type="text"
            value={editForm.cultivar || ''}
            onChange={(e) => onEditFormChange({ ...editForm, cultivar: e.target.value })}
            className="edit-input"
            placeholder="Optional"
          />
        ) : (
          plant.cultivar || '-'
        )}
      </div>
      <div className="plant-cell">
        <span className={`status-badge ${plant.isVerified ? 'verified' : 'unverified'}`}>
          {plant.isVerified ? 'Verified' : 'Unverified'}
        </span>
      </div>
      <div className="plant-cell">
        <div className="usage-stats">
          <span>{plant.instanceCount} instances</span>
          <span>{plant.propagationCount} propagations</span>
        </div>
      </div>
      <div className="plant-cell">{plant.createdByName || 'Unknown'}</div>
      <div className="plant-cell">{new Date(plant.updatedAt).toLocaleDateString()}</div>
      <div className="plant-cell">
        {isEditing ? (
          <div className="edit-actions">
            <button onClick={onSaveEdit} className="save-btn">Save</button>
            <button onClick={onCancelEdit} className="cancel-btn">Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => onStartEdit(plant)}
            className="edit-btn"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

interface PlantTablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

function PlantTablePagination({
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
}: PlantTablePaginationProps) {
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
        Showing {((currentPage - 1) * 50) + 1} to {Math.min(currentPage * 50, totalCount)} of {totalCount} plants
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