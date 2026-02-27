export default function PropagationsLoading() {
  return (
    <div className="page">
      <div className="container">
        <div className="page-content">
          <div className="card card--dreamy">
            <div className="card-header">
              <div className="flex-between">
                <div>
                  <div className="h-8 w-40 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-4 w-56 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="h-10 w-36 bg-primary-100 rounded-lg animate-pulse" />
              </div>
            </div>

            <div className="card-body">
              {/* Propagation cards skeleton */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 animate-pulse">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 w-28 bg-gray-200 rounded mb-1" />
                        <div className="h-3 w-20 bg-gray-100 rounded" />
                      </div>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full mb-3" />
                    <div className="flex justify-between">
                      <div className="h-3 w-16 bg-gray-100 rounded" />
                      <div className="h-3 w-16 bg-gray-100 rounded" />
                    </div>
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
