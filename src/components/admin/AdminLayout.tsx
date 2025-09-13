import { requireCuratorSession } from '@/lib/auth/server';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // This will redirect if user is not a curator
  await requireCuratorSession();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Admin navigation will be added in future tasks */}
        <div className="flex-1">
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}