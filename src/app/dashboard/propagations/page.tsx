import { requireVerifiedSession } from '@/lib/auth/server';
import PropagationDashboard from '@/components/propagations/PropagationDashboard';

export default async function PropagationsPage() {
  const { user } = await requireVerifiedSession();

  return (
    <div className="page">
      <div className="container">
        <div className="page-content">
          <PropagationDashboard userId={user.id} />
        </div>
      </div>
    </div>
  );
}