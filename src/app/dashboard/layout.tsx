import AuthGuard from '@/components/auth/AuthGuard';
import { UserProvider } from '@/components/auth/UserProvider';
import { requireAuthSession } from '@/lib/auth/session';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAuthSession();

  return (
    <AuthGuard>
      <UserProvider user={user}>
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      </UserProvider>
    </AuthGuard>
  );
}