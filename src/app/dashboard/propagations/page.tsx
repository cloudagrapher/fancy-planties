import { requireAuthSession } from '@/lib/auth/session';

export default async function PropagationsPage() {
  const { user } = await requireAuthSession();

  return (
    <div className="min-h-screen bg-gray-50 pb-20"> {/* pb-20 for bottom navigation */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Propagations</h1>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🌿</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Propagations Yet</h2>
            <p className="text-gray-600 mb-6">
              Start tracking your plant propagations to monitor their progress.
            </p>
            <button className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              Start First Propagation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}