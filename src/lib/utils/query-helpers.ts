import type { QueryClient } from '@tanstack/react-query';

/**
 * Invalidate all care-related query caches after logging care, updating plants, etc.
 *
 * Centralised here so every component that triggers care mutations
 * invalidates the same set of keys. Previously duplicated across
 * CareDashboard, PlantDetailModal, and PlantInstanceForm.
 */
export function invalidateCareQueries(
  queryClient: QueryClient,
  userId?: number,
): Promise<void[]> {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: userId != null ? ['care-dashboard', userId] : ['care-dashboard'],
    }),
    queryClient.invalidateQueries({ queryKey: ['plant-instances'] }),
    queryClient.invalidateQueries({ queryKey: ['plant-instances-enhanced'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
    // Invalidate any open plant detail modals so care history + status
    // stay fresh after logging care from the dashboard or other surfaces.
    queryClient.invalidateQueries({ queryKey: ['plant-detail'] }),
  ]);
}
