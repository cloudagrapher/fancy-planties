import 'server-only';
import { AdminAnalyticsQueries } from '@/lib/db/queries/admin-analytics';
import AdminDashboardClient from '@/components/admin/AdminDashboardClient';
import AdminErrorBoundary from '@/components/admin/AdminErrorBoundary';
import { requireAdminAuth, logAdminAction } from '@/lib/auth/admin-auth';

export default async function AdminDashboard() {
  // Ensure admin authentication
  const { user } = await requireAdminAuth();

  // Log dashboard access
  await logAdminAction('view_dashboard', 'system', undefined, {
    timestamp: new Date().toISOString(),
  });

  // Fetch analytics data on the server
  const stats = await AdminAnalyticsQueries.getDashboardStats();

  return (
    <AdminErrorBoundary>
      <AdminDashboardClient initialStats={stats} />
    </AdminErrorBoundary>
  );
}