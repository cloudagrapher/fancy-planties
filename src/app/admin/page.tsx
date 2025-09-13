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
    <AdminErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="admin-dashboard-error">
          <div className="error-container">
            <div className="error-icon">📊</div>
            <h1>Dashboard Error</h1>
            <p>Failed to load dashboard statistics. This might be due to a temporary issue with the analytics system.</p>
            <div className="error-actions">
              <button onClick={resetError} className="retry-button primary">
                Try Again
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="refresh-button secondary"
              >
                Refresh Page
              </button>
            </div>
            <details className="error-details">
              <summary>Error Details</summary>
              <p>{error.message}</p>
            </details>
          </div>
        </div>
      )}
    >
      <AdminDashboardClient initialStats={stats} />
    </AdminErrorBoundary>
  );
}