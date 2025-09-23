'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  optimisticUpdateManager, 
  type OptimisticUpdate, 
  type OptimisticUpdateState,
  type OptimisticUpdateType 
} from '@/lib/optimistic-updates/OptimisticUpdateManager';
import type { EnhancedPlantInstance } from '@/lib/types/plant-instance-types';

export interface UseOptimisticUpdatesReturn {
  // State
  pendingUpdates: OptimisticUpdate[];
  isProcessing: boolean;
  lastError?: string;
  
  // Actions
  applyOptimisticUpdate: (
    type: OptimisticUpdateType,
    plantInstanceId: number,
    data: Partial<EnhancedPlantInstance>,
    originalData?: EnhancedPlantInstance
  ) => string;
  confirmUpdate: (updateId: string) => void;
  rollbackUpdate: (updateId: string, error?: string) => void;
  
  // Utilities
  hasPendingUpdates: (plantInstanceId: number) => boolean;
  getPendingUpdatesForPlant: (plantInstanceId: number) => OptimisticUpdate[];
  applyOptimisticData: (plantInstance: EnhancedPlantInstance) => EnhancedPlantInstance;
  getOptimisticPlantInstances: (plantInstances: EnhancedPlantInstance[]) => EnhancedPlantInstance[];
}

export function useOptimisticUpdates(): UseOptimisticUpdatesReturn {
  const [state, setState] = useState<OptimisticUpdateState>(
    optimisticUpdateManager.getState()
  );
  const queryClient = useQueryClient();

  // Subscribe to optimistic update manager state changes
  useEffect(() => {
    const unsubscribe = optimisticUpdateManager.subscribe(setState);
    return unsubscribe;
  }, []);

  // Apply optimistic update with React Query cache integration
  const applyOptimisticUpdate = useCallback((
    type: OptimisticUpdateType,
    plantInstanceId: number,
    data: Partial<EnhancedPlantInstance>,
    originalData?: EnhancedPlantInstance
  ): string => {
    const rollback = () => {
      // Invalidate React Query cache to revert to server state
      queryClient.invalidateQueries({ queryKey: ['plant-instances'] });
      queryClient.invalidateQueries({ queryKey: ['plant-instance', plantInstanceId] });
      queryClient.invalidateQueries({ queryKey: ['care-dashboard'] });
    };

    const updateId = optimisticUpdateManager.applyUpdate(
      type,
      plantInstanceId,
      data,
      originalData,
      rollback
    );

    // Update React Query cache optimistically
    updateQueryCache(type, plantInstanceId, data);

    return updateId;
  }, [queryClient]);

  // Update React Query cache based on optimistic update type
  const updateQueryCache = useCallback((
    type: OptimisticUpdateType,
    plantInstanceId: number,
    data: Partial<EnhancedPlantInstance>
  ) => {
    switch (type) {
      case 'add':
        // Add new plant to plant-instances queries
        queryClient.setQueriesData(
          { queryKey: ['plant-instances'] },
          (oldData: any) => {
            if (!oldData?.instances) return oldData;
            return {
              ...oldData,
              instances: [data as EnhancedPlantInstance, ...oldData.instances],
              totalCount: oldData.totalCount + 1,
            };
          }
        );
        break;

      case 'update':
        // Update specific plant instance
        queryClient.setQueryData(
          ['plant-instance', plantInstanceId],
          (oldData: EnhancedPlantInstance | undefined) => {
            if (!oldData) return oldData;
            return { ...oldData, ...data };
          }
        );

        // Update plant in plant-instances queries
        queryClient.setQueriesData(
          { queryKey: ['plant-instances'] },
          (oldData: any) => {
            if (!oldData?.instances) return oldData;
            return {
              ...oldData,
              instances: oldData.instances.map((instance: EnhancedPlantInstance) =>
                instance.id === plantInstanceId ? { ...instance, ...data } : instance
              ),
            };
          }
        );
        break;

      case 'archive':
      case 'delete':
        // Remove from active plant lists
        queryClient.setQueriesData(
          { queryKey: ['plant-instances'] },
          (oldData: any) => {
            if (!oldData?.instances) return oldData;
            return {
              ...oldData,
              instances: oldData.instances.filter(
                (instance: EnhancedPlantInstance) => instance.id !== plantInstanceId
              ),
              totalCount: Math.max(0, oldData.totalCount - 1),
            };
          }
        );
        break;
    }

    // Always invalidate care dashboard as it might be affected
    queryClient.invalidateQueries({ queryKey: ['care-dashboard'] });
  }, [queryClient]);

  // Confirm update and clean up optimistic state
  const confirmUpdate = useCallback((updateId: string) => {
    optimisticUpdateManager.confirmUpdate(updateId);
  }, []);

  // Rollback update and revert optimistic changes
  const rollbackUpdate = useCallback((updateId: string, error?: string) => {
    optimisticUpdateManager.rollbackUpdate(updateId, error);
  }, []);

  // Check if plant has pending updates
  const hasPendingUpdates = useCallback((plantInstanceId: number): boolean => {
    return optimisticUpdateManager.hasPendingUpdates(plantInstanceId);
  }, []);

  // Get pending updates for specific plant
  const getPendingUpdatesForPlant = useCallback((plantInstanceId: number): OptimisticUpdate[] => {
    return optimisticUpdateManager.getPendingUpdatesForPlant(plantInstanceId);
  }, []);

  // Apply optimistic data to single plant instance
  const applyOptimisticData = useCallback((plantInstance: EnhancedPlantInstance): EnhancedPlantInstance => {
    return optimisticUpdateManager.applyOptimisticData(plantInstance);
  }, []);

  // Apply optimistic data to plant instances list
  const getOptimisticPlantInstances = useCallback((
    plantInstances: EnhancedPlantInstance[]
  ): EnhancedPlantInstance[] => {
    return optimisticUpdateManager.getOptimisticPlantInstances(plantInstances);
  }, []);

  return {
    // State
    pendingUpdates: state.pendingUpdates ? Array.from(state.pendingUpdates.values()) : [],
    isProcessing: state.isProcessing,
    lastError: state.lastError,
    
    // Actions
    applyOptimisticUpdate,
    confirmUpdate,
    rollbackUpdate,
    
    // Utilities
    hasPendingUpdates,
    getPendingUpdatesForPlant,
    applyOptimisticData,
    getOptimisticPlantInstances,
  };
}

// Hook for optimistic plant addition
export function useOptimisticPlantAddition() {
  const { applyOptimisticUpdate, confirmUpdate, rollbackUpdate } = useOptimisticUpdates();

  const addPlantOptimistically = useCallback((
    plantData: Partial<EnhancedPlantInstance>
  ): string => {
    // Generate temporary ID for optimistic update
    const tempId = -Date.now(); // Negative ID to avoid conflicts
    
    const optimisticPlant: Partial<EnhancedPlantInstance> = {
      ...plantData,
      id: tempId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    return applyOptimisticUpdate('add', tempId, optimisticPlant);
  }, [applyOptimisticUpdate]);

  return {
    addPlantOptimistically,
    confirmUpdate,
    rollbackUpdate,
  };
}

// Hook for optimistic plant archiving
export function useOptimisticPlantArchiving() {
  const { applyOptimisticUpdate, confirmUpdate, rollbackUpdate } = useOptimisticUpdates();

  const archivePlantOptimistically = useCallback((
    plantInstance: EnhancedPlantInstance
  ): string => {
    return applyOptimisticUpdate(
      'archive',
      plantInstance.id,
      { isActive: false },
      plantInstance
    );
  }, [applyOptimisticUpdate]);

  return {
    archivePlantOptimistically,
    confirmUpdate,
    rollbackUpdate,
  };
}