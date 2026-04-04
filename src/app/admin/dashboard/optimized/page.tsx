import 'server-only';
import type { Metadata } from 'next';
import { requireAdminAccess } from '@/lib/auth/admin-middleware';
import OptimizedDashboard from '@/components/admin/OptimizedDashboard';

export const metadata: Metadata = {
  title: 'Admin Dashboard — Fancy Planties',
  description: 'Admin dashboard with analytics and management tools.',
};

export default async function OptimizedDashboardPage() {
  await requireAdminAccess();

  return (
    <div className="optimized-dashboard-page">
      <OptimizedDashboard />
    </div>
  );
}