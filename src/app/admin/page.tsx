import 'server-only';
import type { Metadata } from 'next';
import { AdminAnalyticsQueries } from '@/lib/db/queries/admin-analytics';
import AdminDashboardClient from '@/components/admin/AdminDashboardClient';
import AdminErrorBoundary from '@/components/admin/AdminErrorBoundary';
import { requireAdminAuth, logAdminAction } from '@/lib/auth/admin-auth';

export const metadata: Metadata = {
  title: 'Admin Dashboard — Fancy Planties',
  description: 'Manage plants, users, and site analytics.',
};

export default async function AdminDashboard() {
  // Ensure admin authentication
  await requireAdminAuth();

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