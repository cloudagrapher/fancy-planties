import 'server-only';
import type { Metadata } from 'next';
import { requireAdminAccess } from '@/lib/auth/admin-middleware';
import OptimizedDashboard from '@/components/admin/OptimizedDashboard';

export const metadata: Metadata = {
  title: 'Admin Dashboard — Fancy Planties',
  description: 'Admin dashboard with analytics and management tools.',
};

// Admin pages query the DB at render time; skip static prerendering
export const dynamic = 'force-dynamic';

export default async function OptimizedDashboardPage() {
  await requireAdminAccess();

  return (
    <div className="optimized-dashboard-page">
      <OptimizedDashboard />
    </div>
  );
}