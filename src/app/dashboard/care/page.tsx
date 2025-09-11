import { requireVerifiedSession } from '@/lib/auth/server';
import { CareDashboard } from '@/components/care';

export default async function CarePage() {
  const { user } = await requireVerifiedSession();

  return (
    <div className="min-h-screen pb-16 sm:pb-0 bg-gradient-to-b from-emerald-50 to-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/70 bg-white/70 backdrop-blur p-4 sm:p-8">
          <CareDashboard userId={user.id} />
        </div>
      </div>
    </div>
  );
}