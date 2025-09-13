import 'server-only';
import { AdminAnalyticsQueries } from '@/lib/db/queries/admin-analytics';
import AdminDashboardClient from '@/components/admin/AdminDashboardClient';

export default async function AdminDashboard() {
  try {
    // Fetch analytics data on the server
    const stats = await AdminAnalyticsQueries.getDashboardStats();

    return <AdminDashboardClient initialStats={stats} />;
  } catch (error) {
    console.error('Failed to load dashboard stats:', error);
    
    return (
      <div className="admin-dashboard-error">
        <h1>Admin Dashboard</h1>
        <div className="error-message">
          <p>Failed to load dashboard statistics. Please try refreshing the page.</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
}