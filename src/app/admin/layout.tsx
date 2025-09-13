import 'server-only';
import { requireAdminAuth } from '@/lib/auth/admin-auth';
import AdminNavigation from '@/components/navigation/AdminNavigation';
import AdminErrorBoundary from '@/components/admin/AdminErrorBoundary';
import { AdminNotificationProvider } from '@/components/admin/AdminNotificationSystem';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ensure only curators can access admin routes with enhanced error handling
  await requireAdminAuth();

  return (
    <AdminNotificationProvider>
      <AdminErrorBoundary>
        <div className="admin-layout">
          <AdminNavigation />
          <main className="admin-content">
            {children}
          </main>
        </div>
      </AdminErrorBoundary>
    </AdminNotificationProvider>
  );
}