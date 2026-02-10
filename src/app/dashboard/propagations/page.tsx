import { requireVerifiedSession } from '@/lib/auth/server';
import PropagationDashboard from '@/components/propagations/PropagationDashboard';

export default async function PropagationsPage() {
  await requireVerifiedSession();

  return (
    <div className="page">
      <div className="container">
        <div className="page-content">
          <PropagationDashboard />
        </div>
      </div>
    </div>
  );
}