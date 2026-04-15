import 'server-only';
import type { Metadata } from 'next';
import { AdminPlantQueries } from '@/lib/db/queries/admin-plants';
import OptimizedPlantManagement from '@/components/admin/OptimizedPlantManagement';
import { requireAdminAccess } from '@/lib/auth/admin-middleware';
import RefreshPageButton from '@/components/shared/RefreshPageButton';

export const metadata: Metadata = {
  title: 'Plant Management — Fancy Planties Admin',
  description: 'Manage the plant database and submissions.',
};

// Admin pages query the DB at render time; skip static prerendering
export const dynamic = 'force-dynamic';

export default async function OptimizedPlantManagementPage() {
  await requireAdminAccess();

  try {
    // Fetch minimal initial data for faster page load
    // React Query will handle subsequent data fetching
    const [{ plants, totalCount }] = await Promise.all([
      AdminPlantQueries.getPlantsWithDetails(
        {}, 
        { field: 'updatedAt', direction: 'desc' }, 
        50, // Larger page size for better performance
        0
      ),
    ]);

    return (
      <div className="optimized-plant-management-page">
        <OptimizedPlantManagement
          initialPlants={plants}
          initialTotalCount={totalCount}
        />
      </div>
    );
  } catch (error) {
    console.error('Failed to load optimized plant management:', error);
    
    return (
      <div className="optimized-plant-management-error">
        <h1>Plant Management</h1>
        <div className="error-message">
          <p>Failed to load plant data. Please try refreshing the page.</p>
          <RefreshPageButton />
        </div>
      </div>
    );
  }
}