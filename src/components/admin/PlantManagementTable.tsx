'use client';

import { useState, useEffect } from 'react';
import type { PlantWithDetails, PlantFilters, PlantSortConfig } from '@/lib/db/queries/admin-plants';

export interface PlantManagementTableProps {
  initialPlants: PlantWithDetails[];
  initialTotalCount: number;
  taxonomyOptions: {
    families: string[];
    genera: string[];
    species: string[];
  };
}

export default function PlantManagementTable({
  initialPlants,
  initialTotalCount,
  taxonomyOptions,
}: PlantManagementTableProps) {
  const [plants, setPlants] = useState<PlantWithDetails[]>(initialPlants);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<PlantWithDetails>>({});
  const [selectedPlants, setSelectedPlants] = useState<Set<number>>(new Set());
  
  // Filters and sorting
  const [filters, setFilters] = useState<PlantFilters>({});
  const [sort, setSort] = useState<PlantSortConfig>({ field: 'updatedAt', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Fetch plants with current filters and sorting
  const fetchPlants = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        sortField: sort.field,
        sortDirection: sort.direction,
        ...(filters.search && { search: filters.search }),
        ...(filters.family && { family: filters.family }),
        ...(filters.genus && { genus: filters.genus }),
        ...(filters.species && { species: filters.species }),
        ...(filters.isVerified !== undefined && { isVerified: filters.isVerified.toString() }),
      });

      const response = await fetch(`/api/admin/plants?${params}`);
      if (!response.ok) throw new Error('Failed to fetch plants');
      
      const data = await response.json();
      setPlants(data.plants);
      setTotalCount(data.totalCount);
    } catch (error) {
      console.error('Failed to fetch plants:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refetch when filters, sort, or page changes
  useEffect(() => {
    fetchPlants();
  }, [filters, sort, currentPage]);

  // Handle sorting
  const handleSort = (field: PlantSortConfig['field']) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1);
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof PlantFilters, value: string | boolean | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Handle edit start
  const startEdit = (plant: PlantWithDetails) => {
    setEditingId(plant.id);
    setEditForm({
      family: plant.family,
      genus: plant.genus,
      species: plant.species,
      cultivar: plant.cultivar || '',
      commonName: plant.commonName,
      careInstructions: plant.careInstructions || '',
    });
  };

  // Handle edit save
  const saveEdit = async () => {
    if (!editingId) return;
    
    try {
      const response = await fetch(`/api/admin/plants/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update plant');
      }

      setEditingId(null);
      setEditForm({});
      await fetchPlants();
    } catch (error) {
      console.error('Failed to save plant:', error);
      alert(error instanceof Error ? error.message : 'Failed to save plant');
    }
  };

  // Handle edit cancel
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Handle plant selection
  const togglePlantSelection = (plantId: number) => {
    setSelectedPlants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(plantId)) {
        newSet.delete(plantId);
      } else {
        newSet.add(plantId);
      }
      return newSet;
    });
  };

  // Handle select all
  const toggleSelectAll = () => {
    if (selectedPlants.size === plants.length) {
      setSelectedPlants(new Set());
    } else {
      setSelectedPlants(new Set(plants.map(p => p.id)));
    }
  };

  // Handle bulk verification
  const handleBulkVerification = async (isVerified: boolean) => {
    if (selectedPlants.size === 0) return;

    try {
      const response = await fetch('/api/admin/plants/bulk-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantIds: Array.from(selectedPlants),
          isVerified,
        }),
      });

      if (!response.ok) throw new Error('Failed to update plants');

      setSelectedPlants(new Set());
      await fetchPlants();
    } catch (error) {
      console.error('Failed to bulk update:', error);
      alert('Failed to update plants');
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="plant-management">
      <div className="plant-management-header">
        <h1>Plant Management</h1>
        <div className="plant-management-stats">
          Total: {totalCount} plants
        </div>
      </div>

      {/* Filters */}
      <div className="plant-filters">
        <input
          type="text"
          placeholder="Search plants..."
          value={filters.search || ''}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="filter-input"
        />
        
        <select
          value={filters.family || ''}
          onChange={(e) => handleFilterChange('family', e.target.value || undefined)}
          className="filter-select"
        >
          <option value="">All Families</option>
          {taxonomyOptions.families.map(family => (
            <option key={family} value={family}>{family}</option>
          ))}
        </select>

        <select
          value={filters.genus || ''}
          onChange={(e) => handleFilterChange('genus', e.target.value || undefined)}
          className="filter-select"
        >
          <option value="">All Genera</option>
          {taxonomyOptions.genera.map(genus => (
            <option key={genus} value={genus}>{genus}</option>
          ))}
        </select>

        <select
          value={filters.isVerified === undefined ? '' : filters.isVerified.toString()}
          onChange={(e) => handleFilterChange('isVerified', 
            e.target.value === '' ? undefined : e.target.value === 'true'
          )}
          className="filter-select"
        >
          <option value="">All Status</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedPlants.size > 0 && (
        <div className="bulk-actions">
          <span>{selectedPlants.size} plants selected</span>
          <button
            onClick={() => handleBulkVerification(true)}
            className="bulk-action-btn verify"
          >
            Verify Selected
          </button>
          <button
            onClick={() => handleBulkVerification(false)}
            className="bulk-action-btn unverify"
          >
            Unverify Selected
          </button>
          <button
            onClick={() => setSelectedPlants(new Set())}
            className="bulk-action-btn cancel"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="plant-table-container">
        <table className="plant-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={plants.length > 0 && selectedPlants.size === plants.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th 
                onClick={() => handleSort('commonName')}
                className={`sortable ${sort.field === 'commonName' ? sort.direction : ''}`}
              >
                Common Name
              </th>
              <th 
                onClick={() => handleSort('family')}
                className={`sortable ${sort.field === 'family' ? sort.direction : ''}`}
              >
                Family
              </th>
              <th 
                onClick={() => handleSort('genus')}
                className={`sortable ${sort.field === 'genus' ? sort.direction : ''}`}
              >
                Genus
              </th>
              <th 
                onClick={() => handleSort('species')}
                className={`sortable ${sort.field === 'species' ? sort.direction : ''}`}
              >
                Species
              </th>
              <th>Cultivar</th>
              <th>Status</th>
              <th>Usage</th>
              <th>Created By</th>
              <th 
                onClick={() => handleSort('updatedAt')}
                className={`sortable ${sort.field === 'updatedAt' ? sort.direction : ''}`}
              >
                Updated
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="loading-cell">Loading...</td>
              </tr>
            ) : plants.length === 0 ? (
              <tr>
                <td colSpan={11} className="empty-cell">No plants found</td>
              </tr>
            ) : (
              plants.map(plant => (
                <tr key={plant.id} className={selectedPlants.has(plant.id) ? 'selected' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedPlants.has(plant.id)}
                      onChange={() => togglePlantSelection(plant.id)}
                    />
                  </td>
                  <td>
                    {editingId === plant.id ? (
                      <input
                        type="text"
                        value={editForm.commonName || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, commonName: e.target.value }))}
                        className="edit-input"
                      />
                    ) : (
                      plant.commonName
                    )}
                  </td>
                  <td>
                    {editingId === plant.id ? (
                      <input
                        type="text"
                        value={editForm.family || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, family: e.target.value }))}
                        className="edit-input"
                      />
                    ) : (
                      plant.family
                    )}
                  </td>
                  <td>
                    {editingId === plant.id ? (
                      <input
                        type="text"
                        value={editForm.genus || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, genus: e.target.value }))}
                        className="edit-input"
                      />
                    ) : (
                      plant.genus
                    )}
                  </td>
                  <td>
                    {editingId === plant.id ? (
                      <input
                        type="text"
                        value={editForm.species || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, species: e.target.value }))}
                        className="edit-input"
                      />
                    ) : (
                      plant.species
                    )}
                  </td>
                  <td>
                    {editingId === plant.id ? (
                      <input
                        type="text"
                        value={editForm.cultivar || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, cultivar: e.target.value }))}
                        className="edit-input"
                        placeholder="Optional"
                      />
                    ) : (
                      plant.cultivar || '-'
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${plant.isVerified ? 'verified' : 'unverified'}`}>
                      {plant.isVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </td>
                  <td>
                    <div className="usage-stats">
                      <span>{plant.instanceCount} instances</span>
                      <span>{plant.propagationCount} propagations</span>
                    </div>
                  </td>
                  <td>{plant.createdByName || 'Unknown'}</td>
                  <td>{new Date(plant.updatedAt).toLocaleDateString()}</td>
                  <td>
                    {editingId === plant.id ? (
                      <div className="edit-actions">
                        <button onClick={saveEdit} className="save-btn">Save</button>
                        <button onClick={cancelEdit} className="cancel-btn">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(plant)}
                        className="edit-btn"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            Previous
          </button>
          
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}