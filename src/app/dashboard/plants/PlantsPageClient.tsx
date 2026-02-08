'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PlantsGrid, PlantDetailModal, PlantInstanceForm } from '@/components/plants';
import type { EnhancedPlantInstance } from '@/lib/types/plant-instance-types';
import { apiFetch } from '@/lib/api-client';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

interface PlantsPageClientProps {
  userId: number;
}

export default function PlantsPageClient({ userId }: PlantsPageClientProps) {
  const queryClient = useQueryClient();
  const [selectedPlant, setSelectedPlant] = useState<EnhancedPlantInstance | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<EnhancedPlantInstance | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const refreshPlantData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['plant-instances-enhanced'], exact: false }),
      queryClient.invalidateQueries({ queryKey: ['care-dashboard'], exact: false }),
    ]);
  }, [queryClient]);

  // Handle plant selection (open detail modal)
  const handlePlantSelect = (plant: EnhancedPlantInstance) => {
    setSelectedPlant(plant);
    setIsDetailModalOpen(true);
  };

  // Handle plant editing
  const handlePlantEdit = (plant: EnhancedPlantInstance) => {
    setEditingPlant(plant);
    setIsFormModalOpen(true);
    setIsDetailModalOpen(false);
  };

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

  // Handle bulk actions — routes deactivate to archive endpoint, care actions to quick-log
  const handleBulkAction = useCallback(async (plants: EnhancedPlantInstance[], action: string) => {
    try {
      let promises: Promise<Response>[];

      if (action === 'deactivate') {
        // Archive: PATCH isActive=false on each plant instance
        promises = plants.map(plant =>
          apiFetch(`/api/plant-instances/${plant.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: false }),
          })
        );
      } else {
        // Care action: log via quick-log endpoint
        const careType = action === 'fertilize' ? 'fertilizer' : action;
        promises = plants.map(plant =>
          apiFetch('/api/care/quick-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              plantInstanceId: plant.id,
              careType,
              careDate: new Date().toISOString(),
            }),
          })
        );
      }

      const results = await Promise.allSettled(promises);
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
      const succeeded = results.length - failed.length;

      await refreshPlantData();

      if (failed.length === 0) {
        const label = action === 'deactivate' ? 'Archived' : action === 'fertilize' ? 'Fertilized' : `${action} logged for`;
        showToast(`${label} ${succeeded} plant${succeeded !== 1 ? 's' : ''} ✓`, 'success');
      } else if (succeeded > 0) {
        showToast(`${succeeded} succeeded, ${failed.length} failed`, 'error');
      } else {
        showToast(`Bulk ${action} failed for all ${plants.length} plants`, 'error');
      }
    } catch (error) {
      console.error('Error with bulk action:', error);
      showToast(`Bulk ${action} failed`, 'error');
    }
  }, [refreshPlantData, showToast]);

  // Handle add new plant
  const handleAddPlant = () => {
    setEditingPlant(null);
    setIsFormModalOpen(true);
  };

  // Handle form success
  const handleFormSuccess = async () => {
    setIsFormModalOpen(false);
    setEditingPlant(null);

    // Force a grid refresh to ensure immediate updates
    // Clear both regular and enhanced plant instance queries
    await queryClient.invalidateQueries({
      queryKey: ['plant-instances'],
      exact: false,
      refetchType: 'all'
    });
    await queryClient.invalidateQueries({
      queryKey: ['plant-instances-enhanced'],
      exact: false,
      refetchType: 'all'
    });

    // Force refetch to ensure immediate update
    await queryClient.refetchQueries({
      queryKey: ['plant-instances-enhanced'],
      type: 'active'
    });

    // Don't automatically open detail modal - let user decide
    // This prevents the white line issue from modal conflicts
  };

  return (
    <div className="page">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-sm w-full rounded-lg shadow-lg p-4 transition-all ${
            toast.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="ml-3 text-current opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}
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

      {/* Plant Detail Modal */}
      {selectedPlant && (
        <PlantDetailModal
          plantId={selectedPlant.id}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedPlant(null);
          }}
          onEdit={handlePlantEdit}
          onCareLog={(plantId, careType) => {
            // Care logged successfully
          }}
        />
      )}

      {/* Plant Form Modal */}
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
    </div>
  );
}