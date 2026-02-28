export default function HandbookLoading() {
  return (
    <div className="page">
      <div className="container">
        <div className="page-content">
          <div className="animate-pulse space-y-6" role="status" aria-label="Loading handbook">
            {/* Header skeleton */}
            <div>
              <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-72" />
            </div>

            {/* Search/filter bar skeleton */}
            <div className="flex gap-3">
              <div className="h-10 bg-gray-200 rounded-lg flex-1" />
              <div className="h-10 bg-gray-200 rounded-lg w-32" />
            </div>

            {/* Care guide cards skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 space-y-3"
                >
                  <div className="h-32 bg-gray-200 rounded-lg" />
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="flex gap-2">
                    <div className="h-6 bg-gray-200 rounded-full w-16" />
                    <div className="h-6 bg-gray-200 rounded-full w-20" />
                  </div>
                </div>
              ))}
            </div>
            <span className="sr-only">Loading handbook...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
