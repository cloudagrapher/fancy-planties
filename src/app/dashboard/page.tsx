import { requireAuthSession } from '@/lib/auth/server';
import LogoutButton from '@/components/auth/LogoutButton';
import FertilizerCalendar from '@/components/calendar/FertilizerCalendar';

export default async function DashboardPage() {
  const { user } = await requireAuthSession();

  return (
    <div className="min-h-screen pb-16 sm:pb-0 bg-gradient-to-b from-emerald-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-white/70 backdrop-blur p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {user.name}!
            </h1>
            <p className="text-gray-600">
              Ready to manage your fancy plant collection?
            </p>
          </div>
          <LogoutButton className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-emerald-50/70 backdrop-blur p-6">
            <h3 className="text-lg font-semibold text-emerald-900 mb-2">Plants</h3>
            <p className="text-emerald-700">Manage your plant collection</p>
            <div className="mt-4">
              <span className="text-2xl font-bold text-emerald-600">0</span>
              <span className="text-emerald-600 ml-1">plants</span>
            </div>
          </div>

          <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-amber-50/70 backdrop-blur p-6">
            <h3 className="text-lg font-semibold text-amber-900 mb-2">Care Tasks</h3>
            <p className="text-amber-700">Track care schedules</p>
            <div className="mt-4">
              <span className="text-2xl font-bold text-amber-600">0</span>
              <span className="text-amber-600 ml-1">due today</span>
            </div>
          </div>

          <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-sky-50/70 backdrop-blur p-6">
            <h3 className="text-lg font-semibold text-sky-900 mb-2">Propagations</h3>
            <p className="text-sky-700">Monitor propagation progress</p>
            <div className="mt-4">
              <span className="text-2xl font-bold text-sky-600">0</span>
              <span className="text-sky-600 ml-1">active</span>
            </div>
          </div>

          <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-green-50/70 backdrop-blur p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-2">Success Rate</h3>
            <p className="text-green-700">Propagation success</p>
            <div className="mt-4">
              <span className="text-2xl font-bold text-green-600">--</span>
              <span className="text-green-600 ml-1">%</span>
            </div>
          </div>
        </div>

        {/* Fertilizer Calendar */}
        <div className="mt-8">
          <FertilizerCalendar />
        </div>

        <div className="mt-8 p-6 bg-gray-50 rounded-xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Getting Started</h2>
          <div className="space-y-3">
            <div className="flex items-center text-gray-700">
              <div className="w-6 h-6 bg-primary-200 rounded-full flex items-center justify-center mr-3">
                <span className="text-primary-800 text-sm font-semibold">1</span>
              </div>
              Add your first plant to start tracking your collection
            </div>
            <div className="flex items-center text-gray-700">
              <div className="w-6 h-6 bg-primary-200 rounded-full flex items-center justify-center mr-3">
                <span className="text-primary-800 text-sm font-semibold">2</span>
              </div>
              Set up care schedules for fertilizing and repotting
            </div>
            <div className="flex items-center text-gray-700">
              <div className="w-6 h-6 bg-primary-200 rounded-full flex items-center justify-center mr-3">
                <span className="text-primary-800 text-sm font-semibold">3</span>
              </div>
              Start tracking propagations and their progress
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            User ID: {user.id} | Email: {user.email}
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}