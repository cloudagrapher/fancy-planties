'use client';

import { useState } from 'react';
import type { PlantWithDetails } from '@/lib/db/queries/admin-plants';
import PlantReviewCard from './PlantReviewCard';
import { useBulkOperations } from '@/hooks/useBulkOperations';
import BulkOperationsToolbar from './BulkOperationsToolbar';

interface PlantApprovalQueueProps {
  pendingPlants: PlantWithDetails[];
  totalCount: number;
}

export default function PlantApprovalQueue({ 
  pendingPlants: initialPlants, 
  totalCount: initialCount 
}: PlantApprovalQueueProps) {
  const [plants, setPlants] = useState(initialPlants);
  const [totalCount, setTotalCount] = useState(initialCount);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

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

  const handlePlantProcessed = (plantId: number) => {
    // Remove the processed plant from the list
    setPlants(prev => prev.filter(p => p.id !== plantId));
    setTotalCount(prev => prev - 1);
    setProcessingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(plantId);
      return newSet;
    });
  };

  const handleProcessingStart = (plantId: number) => {
    setProcessingIds(prev => new Set(prev).add(plantId));
  };

  const handleProcessingEnd = (plantId: number) => {
    setProcessingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(plantId);
      return newSet;
    });
  };

  // Bulk operation handlers
  const handleBulkAction = async (actionId: string) => {
    await executeBulkOperation(async (plantIds) => {
      const response = await fetch('/api/admin/plants/bulk-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: actionId,
          plantIds,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Operation failed');
      }

      const result = await response.json();
      
      // Remove processed plants from the list
      setPlants(prev => prev.filter(p => !plantIds.includes(p.id)));
      setTotalCount(prev => prev - result.processedCount);
      
      return {
        success: result.success,
        errors: result.errors || [],
      };
    });
  };

  const handleSelectAll = () => {
    selectAllPlants(plants.map(p => p.id));
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/plants/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantIds: selectedCount > 0 ? Array.from(selectedPlants) : plants.map(p => p.id),
          format: 'csv',
          filters: { isVerified: false }, // Only pending plants
        }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pending-plants-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export plants');
    }
  };

  const bulkActions = [
    {
      id: 'approve',
      label: 'Approve All',
      icon: '✅',
      variant: 'primary' as const,
    },
    {
      id: 'reject',
      label: 'Reject All',
      icon: '❌',
      variant: 'danger' as const,
      requiresConfirmation: true,
      confirmationMessage: `Are you sure you want to reject ${selectedCount} plants? This will delete them permanently.`,
    },
  ];

  if (plants.length === 0) {
    return (
      <div className="admin-empty-state">
        <div className="admin-empty-icon">✅</div>
        <h3>All caught up!</h3>
        <p>No plants are currently pending approval.</p>
      </div>
    );
  }

  return (
    <div className="plant-approval-queue">
      <div className="approval-queue-header">
        <div className="approval-stats">
          <span className="approval-count">
            {totalCount} plant{totalCount !== 1 ? 's' : ''} pending
          </span>
          {processingIds.size > 0 && (
            <span className="processing-count">
              {processingIds.size} processing...
            </span>
          )}
        </div>
      </div>

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

      <div className="approval-queue-list">
        {plants.map((plant) => (
          <PlantReviewCard
            key={plant.id}
            plant={plant}
            isProcessing={processingIds.has(plant.id)}
            onProcessed={handlePlantProcessed}
            onProcessingStart={handleProcessingStart}
            onProcessingEnd={handleProcessingEnd}
            isSelected={isSelected(plant.id)}
            onSelect={() => selectPlant(plant.id)}
          />
        ))}
      </div>
    </div>
  );
}