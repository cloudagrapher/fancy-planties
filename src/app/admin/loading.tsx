export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6" role="status" aria-label="Loading admin dashboard">
          {/* Header skeleton */}
          <div>
            <div className="h-8 bg-gray-200 rounded w-52 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-80" />
          </div>

          {/* Stats grid skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 sm:p-6"
              >
                <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>

          {/* Table skeleton */}
          <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 sm:p-6 space-y-3">
            <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="h-10 w-10 bg-gray-200 rounded" />
                <div className="flex-1 h-4 bg-gray-200 rounded" />
                <div className="w-20 h-4 bg-gray-200 rounded" />
                <div className="w-16 h-8 bg-gray-200 rounded-lg" />
              </div>
            ))}
          </div>
          <span className="sr-only">Loading admin dashboard...</span>
        </div>
      </div>
    </div>
  );
}
