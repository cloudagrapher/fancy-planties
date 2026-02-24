import AuthGuard from '@/components/auth/AuthGuard';
import { UserProvider } from '@/components/auth/UserProvider';
import BottomNavigation from '@/components/navigation/BottomNavigation';
import { requireVerifiedSession } from '@/lib/auth/server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireVerifiedSession();

  return (
    <AuthGuard>
      <UserProvider user={user}>
        <div className="min-h-screen bg-gray-50 pb-20">
          {children}
          <BottomNavigation />
        </div>
      </UserProvider>
    </AuthGuard>
  );
}