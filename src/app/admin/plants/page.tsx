import 'server-only';
import { AdminPlantQueries } from '@/lib/db/queries/admin-plants';
import PlantManagementTable from '@/components/admin/PlantManagementTable';

export default async function AdminPlants() {
  try {
    // Fetch initial data
    const [{ plants, totalCount }, taxonomyOptions] = await Promise.all([
      AdminPlantQueries.getPlantsWithDetails({}, { field: 'updatedAt', direction: 'desc' }, 20, 0),
      AdminPlantQueries.getTaxonomyOptions(),
    ]);

    return (
      <div className="admin-plants">
        <PlantManagementTable
          initialPlants={plants}
          initialTotalCount={totalCount}
          taxonomyOptions={taxonomyOptions}
        />
      </div>
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