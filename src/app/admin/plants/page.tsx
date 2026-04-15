import 'server-only';
import type { Metadata } from 'next';
import { AdminPlantQueries } from '@/lib/db/queries/admin-plants';
import OptimizedPlantManagement from '@/components/admin/OptimizedPlantManagement';
import AdminErrorBoundary from '@/components/admin/AdminErrorBoundary';
import RefreshPageButton from '@/components/shared/RefreshPageButton';

export const metadata: Metadata = {
  title: 'Plant Management — Fancy Planties Admin',
  description: 'Manage the plant database and submissions.',
};

// Admin pages query the DB at render time; skip static prerendering
export const dynamic = 'force-dynamic';

export default async function AdminPlants() {
  try {
    // Fetch initial data for SSR
    const [{ plants, totalCount }] = await Promise.all([
      AdminPlantQueries.getPlantsWithDetails({}, { field: 'updatedAt', direction: 'desc' }, 50, 0),
    ]);

    return (
      <AdminErrorBoundary>
        <OptimizedPlantManagement
          initialPlants={plants}
          initialTotalCount={totalCount}
        />
      </AdminErrorBoundary>
    );
  } catch (error) {
    console.error('Failed to load admin plants:', error);
    
    return (
      <div className="admin-plants-error">
        <h1>Plant Management</h1>
        <div className="error-message">
          <p>Failed to load plant data. Please try refreshing the page.</p>
          <RefreshPageButton />
        </div>
      </div>
    );
  }
}