'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PlantsGrid, PlantDetailModal, PlantInstanceForm } from '@/components/plants';
import type { EnhancedPlantInstance } from '@/lib/types/plant-instance-types';

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

  // Handle care actions
  const handleCareAction = (plant: EnhancedPlantInstance, action: 'fertilize' | 'repot') => {
    // This will be handled by the quick care system
  };

  // Handle bulk actions
  const handleBulkAction = (plants: EnhancedPlantInstance[], action: string) => {
    // Bulk action logic will be implemented here
  };

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
    // Form success, forcing grid refresh
    await queryClient.invalidateQueries({ 
      queryKey: ['plant-instances', userId],
      refetchType: 'all'
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