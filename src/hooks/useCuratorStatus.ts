'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

interface CuratorStatusData {
  isCurator: boolean;
  isAuthenticated: boolean;
  isVerified: boolean;
}

const defaultStatus: CuratorStatusData = {
  isCurator: false,
  isAuthenticated: false,
  isVerified: false,
};

/**
 * Hook to check curator status using React Query.
 *
 * Shares the ['curator-status'] cache with BottomNavigation and DashboardClient,
 * eliminating redundant API calls that the old useState/useEffect version caused.
 */
export function useCuratorStatus() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['curator-status'],
    queryFn: async (): Promise<CuratorStatusData> => {
      const response = await apiFetch('/api/auth/curator-status');
      if (!response.ok) {
        return defaultStatus;
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 30, // 30 minutes — matches BottomNavigation/DashboardClient
    gcTime: 1000 * 60 * 30,
    retry: 1,
  });

  return {
    isCurator: data?.isCurator ?? false,
    isAuthenticated: data?.isAuthenticated ?? false,
    isVerified: data?.isVerified ?? false,
    loading: isLoading,
    refresh: refetch,
  };
}
