'use client';

interface PlantCardSkeletonProps {
  size?: 'small' | 'medium' | 'large';
  count?: number;
}

export default function PlantCardSkeleton({ 
  size = 'medium', 
  count = 6 
}: PlantCardSkeletonProps) {
  // Size configurations
  const sizeConfig = {
    small: {
      container: 'w-32 h-40',
      image: 'h-20',
    },
    medium: {
      container: 'w-40 h-48',
      image: 'h-24',
    },
    large: {
      container: 'w-48 h-56',
      image: 'h-32',
    },
  };

  const config = sizeConfig[size];

  // Grid columns based on screen size
  const getGridColumns = () => {
    switch (size) {
      case 'small':
        return 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8';
      case 'medium':
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
      case 'large':
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
      default:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
    }
  };

  return (
    <div className={`grid gap-4 p-4 ${getGridColumns()}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`
            ${config.container}
            bg-white rounded-xl shadow-soft
            border border-gray-100 overflow-hidden
            animate-pulse
          `}
        >
          {/* Image Skeleton */}
          <div className={`${config.image} bg-gray-200`} />

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
    </div>
  );
}