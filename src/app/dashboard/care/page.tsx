import { requireVerifiedSession } from '@/lib/auth/server';
import { CareDashboard } from '@/components/care';

export default async function CarePage() {
  const { user } = await requireVerifiedSession();

  return (
    <div className="page">
      <div className="container">
        <div className="page-content">
          <div className="card card--dreamy">
            <div className="card-body">
              <CareDashboard userId={user.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}