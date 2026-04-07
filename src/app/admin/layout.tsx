import 'server-only';
import { requireAdminAuth } from '@/lib/auth/admin-auth';
import AdminNavigation from '@/components/navigation/AdminNavigation';
import AdminErrorBoundary from '@/components/admin/AdminErrorBoundary';
import { AdminNotificationProvider } from '@/components/admin/AdminNotificationSystem';
import AdminQueryProvider from '@/components/admin/AdminQueryProvider';
import SkipToContent from '@/components/shared/SkipToContent';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ensure only curators can access admin routes with enhanced error handling
  await requireAdminAuth();

  return (
    <AdminQueryProvider>
      <AdminNotificationProvider>
        <AdminErrorBoundary>
          <div className="admin-layout">
            <SkipToContent />
            <AdminNavigation />
            <main id="main-content" className="admin-content" tabIndex={-1}>
              {children}
            </main>
          </div>
        </AdminErrorBoundary>
      </AdminNotificationProvider>
    </AdminQueryProvider>
  );
}