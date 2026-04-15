import 'server-only';
import type { Metadata } from 'next';
import { AdminPlantQueries } from '@/lib/db/queries/admin-plants';
import PlantApprovalQueue from '@/components/admin/PlantApprovalQueue';

export const metadata: Metadata = {
  title: 'Pending Approvals — Fancy Planties Admin',
  description: 'Review and approve user-submitted plants.',
};

// Admin pages query the DB at render time; skip static prerendering
export const dynamic = 'force-dynamic';

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