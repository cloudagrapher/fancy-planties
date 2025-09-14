import { requireVerifiedSession } from '@/lib/auth/server';
import PropagationDashboard from '@/components/propagations/PropagationDashboard';

export default async function PropagationsPage() {
  const { user } = await requireVerifiedSession();

  return (
    <div className="page">
      <div className="container">
        <div className="page-content">
          <div className="card card--dreamy">
            <div className="card-body">
              <PropagationDashboard userId={user.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}