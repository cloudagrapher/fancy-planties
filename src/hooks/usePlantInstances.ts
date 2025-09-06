'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { 
  EnhancedPlantInstance,
  PlantInstanceSearchResult,
  CareDashboardData,
  PlantInstanceOperationResult,
  BulkOperationResult
} from '@/lib/types/plant-instance-types';
import type { 
  PlantInstanceFilter,
  PlantInstanceSearch,
  CreatePlantInstance,
  UpdatePlantInstance,
  LogFertilizer,
  LogRepot,
  BulkPlantInstanceOperation
} from '@/lib/validation/plant-schemas';

// Hook for fetching plant instances with filters
export function usePlantInstances(filters: PlantInstanceFilter) {
  return useQuery({
    queryKey: ['plant-instances', filters],
    queryFn: async (): Promise<PlantInstanceSearchResult> => {
      const params = new URLSearchParams(
        Object.fromEntries(
          Object.entries(filters).map(([key, value]) => [
            key,
            value instanceof Date ? value.toISOString() : String(value)
          ])
        )
      );

      const response = await fetch(`/api/plant-instances?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch plant instances');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook for searching plant instances
export function useSearchPlantInstances(searchParams: PlantInstanceSearch) {
  return useQuery({
    queryKey: ['plant-instances-search', searchParams],
    queryFn: async (): Promise<PlantInstanceSearchResult> => {
      const params = new URLSearchParams({
        query: searchParams.query,
        userId: String(searchParams.userId),
        activeOnly: String(searchParams.activeOnly),
        limit: String(searchParams.limit),
        offset: String(searchParams.offset),
      });

      const response = await fetch(`/api/plant-instances/search?${params}`);
      if (!response.ok) {
        throw new Error('Failed to search plant instances');
      }
      return response.json();
    },
    enabled: !!searchParams.query,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Hook for fetching a single plant instance
export function usePlantInstance(id: number) {
  return useQuery({
    queryKey: ['plant-instance', id],
    queryFn: async (): Promise<EnhancedPlantInstance> => {
      const response = await fetch(`/api/plant-instances/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch plant instance');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook for fetching care dashboard data
export function useCareDashboard(userId: number) {
  return useQuery({
    queryKey: ['care-dashboard', userId],
    queryFn: async (): Promise<CareDashboardData> => {
      const response = await fetch('/api/plant-instances/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch care dashboard data');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
}

// Hook for fetching user locations
export function useUserLocations(userId: number) {
  return useQuery({
    queryKey: ['user-locations', userId],
    queryFn: async (): Promise<string[]> => {
      const response = await fetch('/api/plant-instances/locations');
      if (!response.ok) {
        throw new Error('Failed to fetch user locations');
      }
      const data = await response.json();
      return data.locations;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Hook for creating a plant instance
export function useCreatePlantInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePlantInstance): Promise<EnhancedPlantInstance> => {
      const response = await fetch('/api/plant-instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create plant instance');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate and refetch plant instances queries
      queryClient.invalidateQueries({ queryKey: ['plant-instances'] });
      queryClient.invalidateQueries({ queryKey: ['care-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['user-locations'] });
      
      // Update the specific plant instance cache
      queryClient.setQueryData(['plant-instance', data.id], data);
    },
  });
}

// Hook for updating a plant instance
export function useUpdatePlantInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<UpdatePlantInstance> }): Promise<EnhancedPlantInstance> => {
      const response = await fetch(`/api/plant-instances/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update plant instance');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Update the specific plant instance cache
      queryClient.setQueryData(['plant-instance', data.id], data);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['plant-instances'] });
      queryClient.invalidateQueries({ queryKey: ['care-dashboard'] });
    },
  });
}

// Hook for deleting a plant instance
export function useDeletePlantInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const response = await fetch(`/api/plant-instances/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete plant instance');
      }
    },
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['plant-instance', id] });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['plant-instances'] });
      queryClient.invalidateQueries({ queryKey: ['care-dashboard'] });
    },
  });
}

// Hook for logging care activities
export function useLogCare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ action, data }: { action: 'fertilize' | 'repot'; data: LogFertilizer | LogRepot }): Promise<PlantInstanceOperationResult> => {
      const response = await fetch('/api/plant-instances/care', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...data }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to log care activity');
      }

      return response.json();
    },
    onSuccess: (result) => {
      if (result.success && result.instance) {
        // Update the specific plant instance cache
        queryClient.setQueryData(['plant-instance', result.instance.id], result.instance);
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['plant-instances'] });
        queryClient.invalidateQueries({ queryKey: ['care-dashboard'] });
      }
    },
  });
}

// Hook for bulk operations
export function useBulkPlantInstanceOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (operation: BulkPlantInstanceOperation): Promise<BulkOperationResult> => {
      const response = await fetch('/api/plant-instances/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(operation),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to perform bulk operation');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all plant instance related queries
      queryClient.invalidateQueries({ queryKey: ['plant-instances'] });
      queryClient.invalidateQueries({ queryKey: ['care-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['plant-instance'] });
    },
  });
}

// Hook for toggling plant instance active status
export function useTogglePlantInstanceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }): Promise<EnhancedPlantInstance> => {
      const response = await fetch(`/api/plant-instances/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update plant status');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Update the specific plant instance cache
      queryClient.setQueryData(['plant-instance', data.id], data);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['plant-instances'] });
      queryClient.invalidateQueries({ queryKey: ['care-dashboard'] });
    },
  });
}

// Utility hook for optimistic updates
export function useOptimisticPlantInstanceUpdate() {
  const queryClient = useQueryClient();

  const updatePlantInstanceOptimistically = (id: number, updates: Partial<EnhancedPlantInstance>) => {
    queryClient.setQueryData(['plant-instance', id], (old: EnhancedPlantInstance | undefined) => {
      if (!old) return old;
      return { ...old, ...updates };
    });
  };

  const revertPlantInstanceUpdate = (id: number) => {
    queryClient.invalidateQueries({ queryKey: ['plant-instance', id] });
  };

  return {
    updatePlantInstanceOptimistically,
    revertPlantInstanceUpdate,
  };
}