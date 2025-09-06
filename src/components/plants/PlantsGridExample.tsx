'use client';

import { useState } from 'react';
import { useUser } from '@/components/auth/UserProvider';
import { PlantsGrid } from '@/components/plants';
import { useLogCare, useBulkPlantInstanceOperation } from '@/hooks/usePlantInstances';
import type { EnhancedPlantInstance } from '@/lib/types/plant-instance-types';

interface PlantsGridExampleProps {
  onPlantSelect?: (plant: EnhancedPlantInstance) => void;
  className?: string;
}

export default function PlantsGridExample({ 
  onPlantSelect,
  className = '' 
}: PlantsGridExampleProps) {
  const { user } = useUser();
  const [notification, setNotification] = useState<string | null>(null);
  
  const logCareMutation = useLogCare();
  const bulkOperationMutation = useBulkPlantInstanceOperation();

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">Please sign in to view your plants.</p>
      </div>
    );
  }

  // Handle care actions
  const handleCareAction = async (plant: EnhancedPlantInstance, action: 'fertilize' | 'repot') => {
    try {
      if (action === 'fertilize') {
        await logCareMutation.mutateAsync({
          action: 'fertilize',
          data: {
            plantInstanceId: plant.id,
            fertilizerDate: new Date(),
          },
        });
        setNotification(`✅ Fertilized ${plant.displayName}`);
      } else if (action === 'repot') {
        await logCareMutation.mutateAsync({
          action: 'repot',
          data: {
            plantInstanceId: plant.id,
            repotDate: new Date(),
            notes: 'Repotted via quick action',
          },
        });
        setNotification(`🪴 Repotted ${plant.displayName}`);
      }
    } catch (error) {
      console.error('Failed to log care action:', error);
      setNotification(`❌ Failed to log ${action} for ${plant.displayName}`);
    }

    // Clear notification after 3 seconds
    setTimeout(() => setNotification(null), 3000);
  };

  // Handle bulk actions
  const handleBulkAction = async (plants: EnhancedPlantInstance[], action: string) => {
    try {
      const plantInstanceIds = plants.map(plant => plant.id);
      
      if (action === 'fertilize') {
        await bulkOperationMutation.mutateAsync({
          plantInstanceIds,
          operation: 'fertilize',
          fertilizerDate: new Date(),
        });
        setNotification(`✅ Fertilized ${plants.length} plants`);
      } else if (action === 'deactivate') {
        await bulkOperationMutation.mutateAsync({
          plantInstanceIds,
          operation: 'deactivate',
        });
        setNotification(`📦 Archived ${plants.length} plants`);
      }
    } catch (error) {
      console.error('Failed to perform bulk action:', error);
      setNotification(`❌ Failed to ${action} selected plants`);
    }

    // Clear notification after 3 seconds
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-sm">
          <p className="text-sm text-gray-900">{notification}</p>
        </div>
      )}

      {/* Plants Grid */}
      <PlantsGrid
        userId={user.id}
        onPlantSelect={onPlantSelect}
        onCareAction={handleCareAction}
        onBulkAction={handleBulkAction}
        showSearch={true}
        showFilters={true}
        cardSize="medium"
        className="h-full"
      />

      {/* Loading overlay for mutations */}
      {(logCareMutation.isPending || bulkOperationMutation.isPending) && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg shadow-lg p-4 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500" />
            <span className="text-sm text-gray-700">
              {logCareMutation.isPending ? 'Logging care...' : 'Processing...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}