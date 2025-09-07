import { requireAuthSession } from '@/lib/auth/server';
import { CareDashboard } from '@/components/care';

export default async function CarePage() {
  const { user } = await requireAuthSession();

  return (
    <div className="min-h-screen pb-16 sm:pb-0 bg-gradient-to-b from-emerald-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-white/70 backdrop-blur p-8">
          <CareDashboard userId={user.id} />
        </div>
      </div>
    </div>
  );
}