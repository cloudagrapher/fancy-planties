export default function CareLoading() {
  return (
    <div className="page">
      <div className="container">
        <div className="page-content">
          <div className="card card--dreamy">
            <div className="card-body">
              {/* Header skeleton */}
              <div className="flex-between mb-6">
                <div>
                  <div className="h-7 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>

              {/* Care action buttons skeleton */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-[72px] bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>

              {/* Care list skeleton */}
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg animate-pulse">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="h-4 w-32 bg-gray-200 rounded mb-1" />
                      <div className="h-3 w-24 bg-gray-100 rounded" />
                    </div>
                    <div className="h-8 w-16 bg-gray-200 rounded" />
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
