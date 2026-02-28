export default function ProfileLoading() {
  return (
    <div className="page">
      <div className="container">
        <div className="page-content">
          <div className="animate-pulse space-y-6" role="status" aria-label="Loading profile">
            {/* Header skeleton */}
            <div>
              <div className="h-8 bg-gray-200 rounded w-36 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-56" />
            </div>

            {/* Profile card skeleton */}
            <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-5 bg-gray-200 rounded w-40" />
                  <div className="h-4 bg-gray-200 rounded w-56" />
                </div>
              </div>

              {/* Form fields skeleton */}
              <div className="space-y-4 pt-4 border-t border-slate-200/70">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="h-4 bg-gray-200 rounded w-24" />
                    <div className="h-10 bg-gray-200 rounded-lg" />
                  </div>
                ))}
              </div>

              {/* Button skeleton */}
              <div className="h-10 bg-gray-200 rounded-lg w-32" />
            </div>
            <span className="sr-only">Loading profile...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
