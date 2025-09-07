import { requireAuthSession } from '@/lib/auth/server';
import LogoutButton from '@/components/auth/LogoutButton';
import FertilizerCalendar from '@/components/calendar/FertilizerCalendar';

export default async function DashboardPage() {
  const { user } = await requireAuthSession();

  return (
    <div className="page">
      <div className="container">
        <div className="page-content">
          {/* Main Dashboard Card */}
          <div className="card card--dreamy">
            <div className="card-header">
              <div className="flex-between">
                <div>
                  <h1 className="text-3xl font-bold text-neutral-900">
                    Welcome back, {user.name}!
                  </h1>
                  <p className="text-neutral-600 mt-2">
                    Ready to manage your fancy plant collection?
                  </p>
                </div>
                <LogoutButton className="btn btn--ghost btn--sm text-error hover:bg-red-50" />
              </div>
            </div>

            <div className="card-body">
              {/* Stats Grid */}
              <div className="stats-grid">
                <div className="stat-card card--mint">
                  <h3 className="text-lg font-semibold text-mint-900 mb-2">Plants</h3>
                  <p className="text-mint-700 mb-4">Manage your plant collection</p>
                  <div className="stat-value text-mint-600">0</div>
                  <div className="stat-label text-mint-600">plants</div>
                </div>

                <div className="stat-card card--salmon">
                  <h3 className="text-lg font-semibold text-salmon-900 mb-2">Care Tasks</h3>
                  <p className="text-salmon-700 mb-4">Track care schedules</p>
                  <div className="stat-value text-salmon-600">0</div>
                  <div className="stat-label text-salmon-600">due today</div>
                </div>

                <div className="stat-card card--lavender">
                  <h3 className="text-lg font-semibold text-lavender-900 mb-2">Propagations</h3>
                  <p className="text-lavender-700 mb-4">Monitor propagation progress</p>
                  <div className="stat-value text-lavender-600">0</div>
                  <div className="stat-label text-lavender-600">active</div>
                </div>

                <div className="stat-card bg-neutral-50">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">Success Rate</h3>
                  <p className="text-neutral-700 mb-4">Propagation success</p>
                  <div className="stat-value text-neutral-600">--</div>
                  <div className="stat-label text-neutral-600">%</div>
                </div>
              </div>

              {/* Fertilizer Calendar */}
              <div className="section--sm">
                <FertilizerCalendar />
              </div>

              {/* Getting Started Card */}
              <div className="card card--flat">
                <div className="card-header">
                  <h2 className="text-xl font-semibold text-neutral-900">Getting Started</h2>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    <div className="flex items-center text-neutral-700">
                      <div className="w-6 h-6 bg-primary-200 rounded-full flex-center mr-3">
                        <span className="text-primary-800 text-sm font-semibold">1</span>
                      </div>
                      Add your first plant to start tracking your collection
                    </div>
                    <div className="flex items-center text-neutral-700">
                      <div className="w-6 h-6 bg-primary-200 rounded-full flex-center mr-3">
                        <span className="text-primary-800 text-sm font-semibold">2</span>
                      </div>
                      Set up care schedules for fertilizing and repotting
                    </div>
                    <div className="flex items-center text-neutral-700">
                      <div className="w-6 h-6 bg-primary-200 rounded-full flex-center mr-3">
                        <span className="text-primary-800 text-sm font-semibold">3</span>
                      </div>
                      Start tracking propagations and their progress
                    </div>
                  </div>
                </div>
                <div className="card-footer text-center">
                  <p className="text-sm text-neutral-500">
                    User ID: {user.id} | Email: {user.email}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}