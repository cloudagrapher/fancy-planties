import 'server-only';
import { requireCuratorSession } from '@/lib/auth/server';
import AdminNavigation from '@/components/navigation/AdminNavigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ensure only curators can access admin routes
  await requireCuratorSession();

  return (
    <div className="admin-layout">
      <AdminNavigation />
      <main className="admin-content">
        {children}
      </main>
    </div>
  );
}