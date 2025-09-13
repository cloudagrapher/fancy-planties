'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { 
  PaginatedUsers, 
  UserFilters, 
  UserSortConfig 
} from '@/lib/db/queries/admin-users';
import type { 
  PlantWithDetails, 
  PlantFilters, 
  PlantSortConfig 
} from '@/lib/db/queries/admin-plants';

// Query keys
export const adminQueryKeys = {
  users: {
    all: ['admin', 'users'] as const,
    paginated: (page: number, pageSize: number, filters: UserFilters, sort: UserSortConfig) =>
      [...adminQueryKeys.users.all, 'paginated', { page, pageSize, filters, sort }] as const,
  },
  plants: {
    all: ['admin', 'plants'] as const,
    paginated: (page: number, pageSize: number, filters: PlantFilters, sort: PlantSortConfig) =>
      [...adminQueryKeys.plants.all, 'paginated', { page, pageSize, filters, sort }] as const,
    taxonomy: () => [...adminQueryKeys.plants.all, 'taxonomy'] as const,
  },
  auditLogs: {
    all: ['admin', 'audit-logs'] as const,
    paginated: (page: number, pageSize: number, filters: any) =>
      [...adminQueryKeys.auditLogs.all, 'paginated', { page, pageSize, filters }] as const,
  },
  dashboard: {
    stats: () => ['admin', 'dashboard', 'stats'] as const,
  },
} as const;

// Users queries
export function useAdminUsers(
  page: number,
  pageSize: number,
  filters: UserFilters,
  sort: UserSortConfig
) {
  return useQuery({
    queryKey: adminQueryKeys.users.paginated(page, pageSize, filters, sort),
    queryFn: async (): Promise<PaginatedUsers> => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortField: sort.field,
        sortDirection: sort.direction,
      });

      if (filters.search) params.set('search', filters.search);
      if (filters.curatorStatus && filters.curatorStatus !== 'all') {
        params.set('curatorStatus', filters.curatorStatus);
      }
      if (filters.emailVerified !== undefined) {
        params.set('emailVerified', filters.emailVerified.toString());
      }

      const response = await fetch(`/api/admin/users?${params.toString()}`);
      
      if (!response.ok) {
        const error = new Error('Failed to fetch users') as any;
        error.status = response.status;
        throw error;
      }

      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for user data
  });
}

// Plants queries
export function useAdminPlants(
  page: number,
  pageSize: number,
  filters: PlantFilters,
  sort: PlantSortConfig
) {
  return useQuery({
    queryKey: adminQueryKeys.plants.paginated(page, pageSize, filters, sort),
    queryFn: async (): Promise<{ plants: PlantWithDetails[]; totalCount: number }> => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortField: sort.field,
        sortDirection: sort.direction,
      });

      if (filters.search) params.set('search', filters.search);
      if (filters.family) params.set('family', filters.family);
      if (filters.genus) params.set('genus', filters.genus);
      if (filters.species) params.set('species', filters.species);
      if (filters.isVerified !== undefined) {
        params.set('isVerified', filters.isVerified.toString());
      }

      const response = await fetch(`/api/admin/plants?${params.toString()}`);
      
      if (!response.ok) {
        const error = new Error('Failed to fetch plants') as any;
        error.status = response.status;
        throw error;
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes for plant data
  });
}

export function useAdminPlantTaxonomy() {
  return useQuery({
    queryKey: adminQueryKeys.plants.taxonomy(),
    queryFn: async () => {
      const response = await fetch('/api/admin/plants/taxonomy');
      
      if (!response.ok) {
        throw new Error('Failed to fetch taxonomy options');
      }

      return response.json();
    },
    staleTime: 15 * 60 * 1000, // 15 minutes for taxonomy data (changes rarely)
  });
}

// Audit logs queries
export function useAdminAuditLogs(
  page: number,
  pageSize: number,
  filters: any
) {
  return useQuery({
    queryKey: adminQueryKeys.auditLogs.paginated(page, pageSize, filters),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      // Add filters to params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, value.toString());
        }
      });

      const response = await fetch(`/api/admin/audit?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      return response.json();
    },
    staleTime: 1 * 60 * 1000, // 1 minute for audit logs
  });
}

// Dashboard stats query
export function useAdminDashboardStats() {
  return useQuery({
    queryKey: adminQueryKeys.dashboard.stats(),
    queryFn: async () => {
      const response = await fetch('/api/admin/dashboard/stats');
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes for dashboard stats
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
}

// Mutations
export function useUpdateCuratorStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, action }: { userId: number; action: 'promote' | 'demote' }) => {
      const response = await fetch(`/api/admin/users/${userId}/curator-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update curator status' }));
        throw new Error(error.error || 'Failed to update curator status');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all user queries to refresh data
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.users.all });
    },
  });
}

export function useUpdatePlant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ plantId, data }: { plantId: number; data: Partial<PlantWithDetails> }) => {
      const response = await fetch(`/api/admin/plants/${plantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update plant' }));
        throw new Error(error.error || 'Failed to update plant');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all plant queries to refresh data
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.plants.all });
    },
  });
}

export function useBulkUserOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ operation, userIds }: { operation: string; userIds: number[] }) => {
      const response = await fetch('/api/admin/users/bulk-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation, userIds }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Bulk operation failed' }));
        throw new Error(error.error || 'Bulk operation failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.users.all });
    },
  });
}

export function useBulkPlantOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ operation, plantIds }: { operation: string; plantIds: number[] }) => {
      const response = await fetch('/api/admin/plants/bulk-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation, plantIds }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Bulk operation failed' }));
        throw new Error(error.error || 'Bulk operation failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.plants.all });
    },
  });
}