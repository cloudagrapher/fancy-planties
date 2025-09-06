import { requireAuthSession } from '@/lib/auth/session';
import { CareDashboard } from '@/components/care';

export default async function CarePage() {
  const { user } = await requireAuthSession();

  return (
    <div className="min-h-screen bg-gray-50 pb-20"> {/* pb-20 for bottom navigation */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <CareDashboard userId={user.id} />
      </div>
    </div>
  );
}