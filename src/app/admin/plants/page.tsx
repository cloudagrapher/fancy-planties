import 'server-only';
import { AdminPlantQueries } from '@/lib/db/queries/admin-plants';
import OptimizedPlantManagement from '@/components/admin/OptimizedPlantManagement';
import AdminErrorBoundary from '@/components/admin/AdminErrorBoundary';

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
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
}