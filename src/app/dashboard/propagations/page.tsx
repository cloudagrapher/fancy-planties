import { requireAuthSession } from '@/lib/auth/server';
import PropagationDashboard from '@/components/propagations/PropagationDashboard';

export default async function PropagationsPage() {
  const { user } = await requireAuthSession();

  return <PropagationDashboard userId={user.id} />;
}