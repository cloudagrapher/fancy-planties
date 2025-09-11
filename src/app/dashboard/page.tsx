import { requireVerifiedSession } from '@/lib/auth/server';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const { user } = await requireVerifiedSession();

  return (
    <DashboardClient
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt.toISOString()
      }}
    />
  );
}