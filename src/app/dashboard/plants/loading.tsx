export default function PlantsLoading() {
  return (
    <div className="page">
      <div className="container">
        <div className="page-content">
          <div className="card card--dreamy">
            {/* Header skeleton */}
            <div className="card-header">
              <div className="flex-between">
                <div>
                  <div className="h-8 w-36 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-4 w-52 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="h-10 w-28 bg-primary-100 rounded-lg animate-pulse" />
              </div>
            </div>

            {/* Search bar skeleton */}
            <div className="card-body">
              <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse mb-4" />

              {/* Plant cards grid skeleton */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="plant-card bg-mint-50 animate-pulse">
                    <div className="aspect-[4/3] bg-gray-200 rounded-t-lg" />
                    <div className="plant-card-content">
                      <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                      <div className="h-3 w-32 bg-gray-100 rounded mb-1" />
                      <div className="h-3 w-20 bg-gray-100 rounded" />
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
