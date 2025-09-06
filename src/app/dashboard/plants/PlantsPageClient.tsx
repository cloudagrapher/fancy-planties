'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PlantsGrid, PlantDetailModal, PlantInstanceForm } from '@/components/plants';
import type { EnhancedPlantInstance } from '@/lib/types/plant-instance-types';

interface PlantsPageClientProps {
  userId: number;
}

export default function PlantsPageClient({ userId }: PlantsPageClientProps) {
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
    console.log(`Care action: ${action} for plant ${plant.id}`);
  };

  // Handle bulk actions
  const handleBulkAction = (plants: EnhancedPlantInstance[], action: string) => {
    console.log(`Bulk action: ${action} for ${plants.length} plants`);
  };

  // Handle add new plant
  const handleAddPlant = () => {
    setEditingPlant(null);
    setIsFormModalOpen(true);
  };

  // Handle form success
  const handleFormSuccess = (plant: EnhancedPlantInstance) => {
    setIsFormModalOpen(false);
    setEditingPlant(null);
    // Optionally open the detail modal for the new/updated plant
    setSelectedPlant(plant);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20"> {/* pb-20 for bottom navigation */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Plants</h1>
            <p className="text-gray-600 mt-1">Manage your plant collection</p>
          </div>
          
          <button
            onClick={handleAddPlant}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Plant
          </button>
        </div>

        {/* Plants Grid */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <PlantsGrid
            userId={userId}
            onPlantSelect={handlePlantSelect}
            onCareAction={handleCareAction}
            onBulkAction={handleBulkAction}
            showSearch={true}
            showFilters={true}
            cardSize="medium"
          />
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
            console.log(`Care logged: ${careType} for plant ${plantId}`);
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
      />
    </div>
  );
}