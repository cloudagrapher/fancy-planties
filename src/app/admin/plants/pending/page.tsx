import 'server-only';
import { AdminPlantQueries } from '@/lib/db/queries/admin-plants';
import PlantApprovalQueue from '@/components/admin/PlantApprovalQueue';

export default async function AdminPendingPlants() {
  // Get pending plants (unverified)
  const { plants: pendingPlants, totalCount } = await AdminPlantQueries.getPlantsWithDetails(
    { isVerified: false },
    { field: 'createdAt', direction: 'asc' }, // Oldest first for FIFO processing
    50,
    0
  );

  return (
    <div className="admin-pending-plants">
      <div className="admin-page-header">
        <h1>Pending Plant Approvals</h1>
        <p className="admin-page-description">
          Review and approve user-submitted plants. {totalCount} plants awaiting approval.
        </p>
      </div>
      
      <PlantApprovalQueue 
        pendingPlants={pendingPlants}
        totalCount={totalCount}
      />
    </div>
  );
}