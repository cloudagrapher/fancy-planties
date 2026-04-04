'use client';

interface PlantCardSkeletonProps {
  size?: 'small' | 'medium' | 'large';
  count?: number;
  /** Render list-view skeletons instead of grid cards */
  viewMode?: 'grid' | 'list';
}

export default function PlantCardSkeleton({ 
  size = 'medium', 
  count = 6,
  viewMode = 'grid',
}: PlantCardSkeletonProps) {
  // Grid columns match PlantsGrid's getGridColumns() — use the same
  // responsive classes so skeletons occupy the exact same space as real cards.
  const getGridColumns = () => {
    switch (size) {
      case 'small':
        return 'grid gap-3 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8';
      case 'medium':
        return 'grid-plants';
      case 'large':
        return 'grid-responsive';
      default:
        return 'grid-plants';
    }
  };

  if (viewMode === 'list') {
    return (
      <div className="divide-y divide-neutral-100 p-2" role="status" aria-label="Loading plants">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 p-3 animate-pulse">
            {/* Thumbnail */}
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-200" />
            {/* Info */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-2/5" />
              <div className="flex gap-3">
                <div className="h-3 bg-gray-200 rounded w-1/4" />
                <div className="h-3 bg-gray-200 rounded w-1/5" />
              </div>
            </div>
            {/* Actions */}
            <div className="flex-shrink-0 flex gap-1">
              <div className="w-8 h-8 bg-gray-200 rounded-lg" />
              <div className="w-4 h-4 bg-gray-200 rounded self-center" />
            </div>
          </div>
        ))}
        <span className="sr-only">Loading plants…</span>
      </div>
    );
  }

  return (
    <div className={`${getGridColumns()} p-4`} role="status" aria-label="Loading plants">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="w-full bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden animate-pulse"
        >
          {/* Image Skeleton — matches .plant-card-image aspect ratio */}
          <div className="w-full aspect-[4/3] max-[480px]:aspect-square bg-gray-200" />

          {/* Content Skeleton */}
          <div className="p-3 space-y-2">
            {/* Status indicator */}
            <div className="flex items-center justify-between">
              <div className="h-4 bg-gray-200 rounded-full w-16" />
              <div className="h-3 bg-gray-200 rounded w-12" />
            </div>

            {/* Plant name */}
            <div className="h-4 bg-gray-200 rounded w-3/4" />

            {/* Species */}
            <div className="h-3 bg-gray-200 rounded w-1/2" />

            {/* Location */}
            <div className="h-3 bg-gray-200 rounded w-2/3" />

            {/* Action buttons */}
            <div className="flex space-x-1 mt-2">
              <div className="flex-1 h-6 bg-gray-200 rounded" />
              <div className="flex-1 h-6 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      ))}
      <span className="sr-only">Loading plants…</span>
    </div>
  );
}