'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOptimisticUpdates, useOptimisticPlantAddition, useOptimisticPlantArchiving } from './useOptimisticUpdates';
import { useCreatePlantInstance, useUpdatePlantInstance, useTogglePlantInstanceStatus } from './usePlantInstances';
import type { EnhancedPlantInstance } from '@/lib/types/plant-instance-types';
import type { CreatePlantInstance, UpdatePlantInstance } from '@/lib/validation/plant-schemas';

export interface UseOptimisticPlantOperationsReturn {
  // Plant addition with optimistic updates
  addPlant: (data: CreatePlantInstance & { optimisticData?: Partial<EnhancedPlantInstance> }) => Promise<void>;
  isAddingPlant: boolean;
  
  // Plant archiving with optimistic updates
  archivePlant: (plantInstance: EnhancedPlantInstance) => Promise<void>;
  isArchivingPlant: boolean;
  
  // Plant updating with optimistic updates
  updatePlant: (id: number, data: Partial<UpdatePlantInstance>, optimisticData?: Partial<EnhancedPlantInstance>) => Promise<void>;
  isUpdatingPlant: boolean;
  
  // Utility functions
  hasPendingUpdates: (plantInstanceId: number) => boolean;
  rollbackUpdate: (updateId: string, error?: string) => void;
}

export function useOptimisticPlantOperations(): UseOptimisticPlantOperationsReturn {
  const queryClient = useQueryClient();
  const { hasPendingUpdates, rollbackUpdate } = useOptimisticUpdates();
  const { addPlantOptimistically, confirmUpdate: confirmAddition } = useOptimisticPlantAddition();
  const { archivePlantOptimistically, confirmUpdate: confirmArchive } = useOptimisticPlantArchiving();
  
  // Server mutations
  const createMutation = useCreatePlantInstance();
  const updateMutation = useUpdatePlantInstance();
  const toggleStatusMutation = useTogglePlantInstanceStatus();

  // Optimistic plant addition
  const addPlantMutation = useMutation({
    mutationFn: async (data: CreatePlantInstance & { optimisticData?: Partial<EnhancedPlantInstance> }) => {
      const { optimisticData, ...createData } = data;
      
      // Apply optimistic update first
      const updateId = addPlantOptimistically({
        ...optimisticData,
        nickname: createData.nickname,
        location: createData.location,
        plantId: createData.plantId,
        userId: createData.userId,
        // Add other fields that can be optimistically displayed
      });

      try {
        // Perform actual server request
        const result = await createMutation.mutateAsync(createData);
        
        // Confirm optimistic update on success
        confirmAddition(updateId);
        
        return result;
      } catch (error) {
        // Rollback optimistic update on failure
        rollbackUpdate(updateId, error instanceof Error ? error.message : 'Failed to add plant');
        throw error;
      }
    },
  });

  // Optimistic plant archiving
  const archivePlantMutation = useMutation({
    mutationFn: async (plantInstance: EnhancedPlantInstance) => {
      // Apply optimistic update first
      const updateId = archivePlantOptimistically(plantInstance);

      try {
        // Perform actual server request
        const result = await toggleStatusMutation.mutateAsync({
          id: plantInstance.id,
          isActive: false,
        });
        
        // Confirm optimistic update on success
        confirmArchive(updateId);
        
        return result;
      } catch (error) {
        // Rollback optimistic update on failure
        rollbackUpdate(updateId, error instanceof Error ? error.message : 'Failed to archive plant');
        throw error;
      }
    },
  });

  // Optimistic plant updating
  const updatePlantMutation = useMutation({
    mutationFn: async ({ 
      id, 
      data, 
      optimisticData 
    }: { 
      id: number; 
      data: Partial<UpdatePlantInstance>; 
      optimisticData?: Partial<EnhancedPlantInstance> 
    }) => {
      const { applyOptimisticUpdate, confirmUpdate } = useOptimisticUpdates();
      
      // Apply optimistic update first if optimistic data provided
      let updateId: string | undefined;
      if (optimisticData) {
        updateId = applyOptimisticUpdate('update', id, optimisticData);
      }

      try {
        // Perform actual server request
        const result = await updateMutation.mutateAsync({ id, data });
        
        // Confirm optimistic update on success
        if (updateId) {
          confirmUpdate(updateId);
        }
        
        return result;
      } catch (error) {
        // Rollback optimistic update on failure
        if (updateId) {
          rollbackUpdate(updateId, error instanceof Error ? error.message : 'Failed to update plant');
        }
        throw error;
      }
    },
  });

  return {
    // Plant addition
    addPlant: async (data: CreatePlantInstance & { optimisticData?: Partial<EnhancedPlantInstance> }) => {
      await addPlantMutation.mutateAsync(data);
    },
    isAddingPlant: addPlantMutation.isPending,
    
    // Plant archiving
    archivePlant: async (plantInstance: EnhancedPlantInstance) => {
      await archivePlantMutation.mutateAsync(plantInstance);
    },
    isArchivingPlant: archivePlantMutation.isPending,
    
    // Plant updating
    updatePlant: async (id: number, data: Partial<UpdatePlantInstance>, optimisticData?: Partial<EnhancedPlantInstance>) => {
      await updatePlantMutation.mutateAsync({ id, data, optimisticData });
    },
    isUpdatingPlant: updatePlantMutation.isPending,
    
    // Utilities
    hasPendingUpdates,
    rollbackUpdate,
  };
}

// Hook for batch optimistic operations
export function useOptimisticBatchOperations() {
  const { applyOptimisticUpdate, confirmUpdate, rollbackUpdate } = useOptimisticUpdates();
  const queryClient = useQueryClient();

  const batchArchiveMutation = useMutation({
    mutationFn: async (plantInstances: EnhancedPlantInstance[]) => {
      // Apply optimistic updates for all plants
      const updateIds = plantInstances.map(plant => 
        applyOptimisticUpdate('archive', plant.id, { isActive: false }, plant)
      );

      try {
        // Perform batch server request
        const response = await fetch('/api/plant-instances/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            operation: 'archive',
            plantInstanceIds: plantInstances.map(p => p.id),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to archive plants');
        }

        const result = await response.json();
        
        // Confirm successful updates
        updateIds.forEach(updateId => confirmUpdate(updateId));
        
        return result;
      } catch (error) {
        // Rollback all optimistic updates on failure
        updateIds.forEach(updateId => 
          rollbackUpdate(updateId, error instanceof Error ? error.message : 'Failed to archive plants')
        );
        throw error;
      }
    },
  });

  return {
    batchArchive: batchArchiveMutation.mutateAsync,
    isBatchArchiving: batchArchiveMutation.isPending,
  };
}