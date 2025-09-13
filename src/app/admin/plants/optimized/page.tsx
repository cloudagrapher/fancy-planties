import 'server-only';
import { AdminPlantQueries } from '@/lib/db/queries/admin-plants';
import OptimizedPlantManagement from '@/components/admin/OptimizedPlantManagement';
import { requireAdminAccess } from '@/lib/auth/admin-middleware';

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
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
}