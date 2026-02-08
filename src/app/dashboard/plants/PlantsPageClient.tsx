'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PlantsGrid, PlantDetailModal, PlantInstanceForm } from '@/components/plants';
import type { EnhancedPlantInstance } from '@/lib/types/plant-instance-types';
import { apiFetch } from '@/lib/api-client';

interface PlantsPageClientProps {
  userId: number;
}

export default function PlantsPageClient({ userId }: PlantsPageClientProps) {
  const queryClient = useQueryClient();
  const [selectedPlant, setSelectedPlant] = useState<EnhancedPlantInstance | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<EnhancedPlantInstance | null>(null);

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
          userId,
        }),
      });

      if (!response.ok) {
        console.error('Failed to log care action');
        return;
      }

      // Refresh plant data after care action
      await queryClient.invalidateQueries({ queryKey: ['plant-instances-enhanced'], exact: false });
      await queryClient.invalidateQueries({ queryKey: ['care-dashboard'], exact: false });
    } catch (error) {
      console.error('Error logging care action:', error);
    }
  }, [queryClient, userId]);

  // Handle bulk actions
  const handleBulkAction = useCallback(async (plants: EnhancedPlantInstance[], action: string) => {
    try {
      const promises = plants.map(plant =>
        apiFetch('/api/care/quick-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plantInstanceId: plant.id,
            careType: action === 'fertilize' ? 'fertilizer' : action,
            careDate: new Date().toISOString(),
            userId,
          }),
        })
      );

      await Promise.allSettled(promises);
      await queryClient.invalidateQueries({ queryKey: ['plant-instances-enhanced'], exact: false });
      await queryClient.invalidateQueries({ queryKey: ['care-dashboard'], exact: false });
    } catch (error) {
      console.error('Error with bulk care action:', error);
    }
  }, [queryClient, userId]);

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