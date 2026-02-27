export default function DashboardLoading() {
  return (
    <div className="page">
      <div className="container">
        <div className="page-content">
          {/* Header skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="min-w-0">
              <div className="h-7 w-48 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
              <div className="h-8 w-20 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>

          {/* Stats grid skeleton */}
          <div className="card card--dreamy">
            <div className="card-body">
              <div className="dashboard-stats-grid">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="stat-card bg-gray-50 animate-pulse">
                    <div className="h-8 w-8 bg-gray-200 rounded mb-2" />
                    <div className="h-5 w-20 bg-gray-200 rounded mb-1" />
                    <div className="h-3 w-32 bg-gray-100 rounded mb-3" />
                    <div className="h-8 w-12 bg-gray-200 rounded mb-1" />
                    <div className="h-3 w-24 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
