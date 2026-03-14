'use client';

import { useState, useCallback, lazy, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PlantsGrid } from '@/components/plants';
import type { EnhancedPlantInstance } from '@/lib/types/plant-instance-types';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/shared/ToastContainer';

// Lazy load heavy modal components — they're not needed until user interaction
const PlantDetailModal = lazy(() => import('@/components/plants/PlantDetailModal'));
const PlantInstanceForm = lazy(() => import('@/components/plants/PlantInstanceForm'));

interface PlantsPageClientProps {
  userId: number;
}

export default function PlantsPageClient({ userId }: PlantsPageClientProps) {
  const queryClient = useQueryClient();
  const [selectedPlant, setSelectedPlant] = useState<EnhancedPlantInstance | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<EnhancedPlantInstance | null>(null);
  const { toasts, showToast, dismissToast } = useToast();

  const refreshPlantData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['plant-instances-enhanced'], exact: false }),
      queryClient.invalidateQueries({ queryKey: ['care-dashboard'], exact: false }),
    ]);
  }, [queryClient]);

  // Handle plant selection (open detail modal)
  const handlePlantSelect = useCallback((plant: EnhancedPlantInstance) => {
    setSelectedPlant(plant);
    setIsDetailModalOpen(true);
  }, []);

  // Handle plant editing
  const handlePlantEdit = useCallback((plant: EnhancedPlantInstance) => {
    setEditingPlant(plant);
    setIsFormModalOpen(true);
    setIsDetailModalOpen(false);
  }, []);

  // Handle care actions — log quick care and refresh data
  const handleCareAction = useCallback(async (plant: EnhancedPlantInstance, action: 'fertilize' | 'repot') => {
    try {
      const careType = action === 'fertilize' ? 'fertilizer' : 'repot';
      const response = await apiFetch('/api/care/quick-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantInstanceId: plant.id,
          careType,
          careDate: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        showToast(`Failed to log ${action} for ${plant.nickname || 'plant'}`, 'error');
        return;
      }

      await refreshPlantData();
      showToast(`${action === 'fertilize' ? 'Fertilized' : 'Repotted'} ${plant.nickname || 'plant'} ✓`, 'success');
    } catch (error) {
      console.error('Error logging care action:', error);
      showToast(`Failed to log ${action}`, 'error');
    }
  }, [refreshPlantData, showToast]);

  // Handle bulk actions — uses the /api/care/bulk endpoint for care, individual calls for archive
  const handleBulkAction = useCallback(async (plants: EnhancedPlantInstance[], action: string) => {
    try {
      if (action === 'deactivate') {
        // Archive: PATCH isActive=false on each plant instance
        const results = await Promise.allSettled(
          plants.map(plant =>
            apiFetch(`/api/plant-instances/${plant.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isActive: false }),
            })
          )
        );
        const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
        const succeeded = results.length - failed.length;

        await refreshPlantData();

        if (failed.length === 0) {
          showToast(`Archived ${succeeded} plant${succeeded !== 1 ? 's' : ''} ✓`, 'success');
        } else {
          showToast(`${succeeded} archived, ${failed.length} failed`, 'error');
        }
        return;
      }

      // Care actions: use the bulk endpoint (single request instead of N)
      const careType = action === 'fertilize' ? 'fertilizer' : action;
      const plantIds = plants.map(p => p.id);

      const response = await apiFetch('/api/care/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantInstanceIds: plantIds,
          careType,
          careDate: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Bulk care request failed');
      }

      const result = await response.json();
      await refreshPlantData();

      if (result.successCount > 0 && result.failureCount === 0) {
        const label = action === 'fertilize' ? 'Fertilized' : `${action} logged for`;
        showToast(`${label} ${result.successCount} plant${result.successCount !== 1 ? 's' : ''} ✓`, 'success');
      } else if (result.successCount > 0) {
        showToast(`${result.successCount} succeeded, ${result.failureCount} failed`, 'error');
      } else {
        showToast(`Bulk ${action} failed for all ${plants.length} plants`, 'error');
      }
    } catch (error) {
      console.error('Error with bulk action:', error);
      showToast(`Bulk ${action} failed`, 'error');
    }
  }, [refreshPlantData, showToast]);

  // Handle add new plant
  const handleAddPlant = useCallback(() => {
    setEditingPlant(null);
    setIsFormModalOpen(true);
  }, []);

  // Handle form success
  const handleFormSuccess = useCallback(async () => {
    setIsFormModalOpen(false);
    setEditingPlant(null);

    // Invalidate and refetch all plant instance queries
    // refetchType: 'all' already triggers refetch for active queries — no separate refetchQueries needed
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['plant-instances'],
        exact: false,
        refetchType: 'all'
      }),
      queryClient.invalidateQueries({
        queryKey: ['plant-instances-enhanced'],
        exact: false,
        refetchType: 'all'
      }),
    ]);
  }, [queryClient]);

  return (
    <div className="page">
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="container">
        <div className="page-content">
          {/* Main Plants Card */}
          <div className="card card--dreamy">
            {/* Header */}
            <div className="card-header">
              <div className="flex-between">
                <div>
                  <h1 className="text-3xl font-bold text-neutral-900">My Plants</h1>
                  <p className="text-neutral-600 mt-2">Manage your plant collection</p>
                </div>

                <button
                  onClick={handleAddPlant}
                  className="btn btn--primary"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Plant
                </button>
              </div>
            </div>

            {/* Plants Grid */}
            <div className="card-body">
              <div className="card card--flat">
                <PlantsGrid
                  userId={userId}
                  onPlantSelect={handlePlantSelect}
                  onCareAction={handleCareAction}
                  onEdit={handlePlantEdit}
                  onBulkAction={handleBulkAction}
                  showSearch={true}
                  showFilters={true}
                  showAdvancedSearch={true}
                  showSearchResults={true}
                  showPresets={true}
                  showHistory={true}
                  cardSize="medium"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plant Detail Modal — lazy loaded on first open */}
      {selectedPlant && (
        <Suspense fallback={null}>
          <PlantDetailModal
            plantId={selectedPlant.id}
            isOpen={isDetailModalOpen}
            onClose={() => {
              setIsDetailModalOpen(false);
              setSelectedPlant(null);
            }}
            onEdit={handlePlantEdit}
            onCareLog={refreshPlantData}
          />
        </Suspense>
      )}

      {/* Plant Form Modal — lazy loaded on first open */}
      {isFormModalOpen && (
        <Suspense fallback={null}>
          <PlantInstanceForm
            plantInstance={editingPlant || undefined}
            isOpen={isFormModalOpen}
            onClose={() => {
              setIsFormModalOpen(false);
              setEditingPlant(null);
            }}
            onSuccess={handleFormSuccess}
            userId={userId}
          />
        </Suspense>
      )}
    </div>
  );
}