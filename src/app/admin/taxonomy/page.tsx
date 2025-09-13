import 'server-only';
import { requireCuratorSession } from '@/lib/auth/server';
import TaxonomyManagementClient from './TaxonomyManagementClient';
import { getTaxonomyHierarchy, getTaxonomyStats } from '@/lib/db/queries/admin-taxonomy';

export default async function TaxonomyManagementPage() {
  await requireCuratorSession();

  const [hierarchy, stats] = await Promise.all([
    getTaxonomyHierarchy(),
    getTaxonomyStats(),
  ]);

  return (
    <div className="admin-taxonomy-page">
      <div className="admin-page-header">
        <h1>Taxonomy Management</h1>
        <p>Manage plant taxonomy hierarchy and relationships</p>
      </div>

      <TaxonomyManagementClient 
        initialHierarchy={hierarchy}
        stats={stats}
      />
    </div>
  );
}