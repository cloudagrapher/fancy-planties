import 'server-only';
import { requireAdminAccess } from '@/lib/auth/admin-middleware';
import OptimizedDashboard from '@/components/admin/OptimizedDashboard';

export default async function OptimizedDashboardPage() {
  await requireAdminAccess();

  return (
    <div className="optimized-dashboard-page">
      <OptimizedDashboard />
    </div>
  );
}