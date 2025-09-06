'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import PlantCard from './PlantCard';
import PlantSearchFilter from './PlantSearchFilter';
import PlantCardSkeleton from './PlantCardSkeleton';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/shared/PullToRefreshIndicator';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import type { 
  EnhancedPlantInstance, 
  PlantInstanceSearchResult,
  PlantInstanceSortField 
} from '@/lib/types/plant-instance-types';
import type { PlantInstanceFilter } from '@/lib/validation/plant-schemas';

interface PlantsGridProps {
  userId: number;
  onPlantSelect?: (plant: EnhancedPlantInstance) => void;
  onCareAction?: (plant: EnhancedPlantInstance, action: 'fertilize' | 'repot') => void;
  onBulkAction?: (plants: EnhancedPlantInstance[], action: string) => void;
  showSearch?: boolean;
  showFilters?: boolean;
  initialFilters?: Partial<PlantInstanceFilter>;
  cardSize?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function PlantsGrid({
  userId,
  onPlantSelect,
  onCareAction,
  onBulkAction,
  showSearch = true,
  showFilters = true,
  initialFilters = {},
  cardSize = 'medium',
  className = '',
}: PlantsGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<PlantInstanceFilter>({
    userId,
    overdueOnly: false,
    isActive: true,
    limit: 20,
    offset: 0,
    ...initialFilters,
  });
  const [sortBy, setSortBy] = useState<PlantInstanceSortField>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedPlants, setSelectedPlants] = useState<number[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const { triggerHaptic } = useHapticFeedback();

  // Fetch plants with infinite query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['plant-instances', userId, searchQuery, filters, sortBy, sortOrder],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        ...Object.fromEntries(
          Object.entries(filters).map(([key, value]) => [
            key,
            value instanceof Date ? value.toISOString() : String(value)
          ])
        ),
        offset: String(pageParam),
        sortBy,
        sortOrder,
      });

      if (searchQuery) {
        const response = await fetch(`/api/plant-instances/search?query=${encodeURIComponent(searchQuery)}&${params}`);
        if (!response.ok) throw new Error('Failed to search plants');
        return response.json() as Promise<PlantInstanceSearchResult>;
      } else {
        const response = await fetch(`/api/plant-instances?${params}`);
        if (!response.ok) throw new Error('Failed to fetch plants');
        return response.json() as Promise<PlantInstanceSearchResult>;
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.filters.offset + lastPage.filters.limit : undefined;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Flatten all pages into a single array
  const plants = useMemo(() => {
    return data?.pages.flatMap(page => page.instances) ?? [];
  }, [data]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setSelectedPlants([]);
    setIsSelectionMode(false);
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<PlantInstanceFilter>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      offset: 0, // Reset pagination
    }));
    setSelectedPlants([]);
    setIsSelectionMode(false);
  }, []);

  // Handle sort changes
  const handleSortChange = useCallback((field: PlantInstanceSortField, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
    setSelectedPlants([]);
    setIsSelectionMode(false);
  }, []);

  // Handle plant selection
  const handlePlantSelect = useCallback((plant: EnhancedPlantInstance) => {
    if (isSelectionMode) {
      triggerHaptic('selection');
      setSelectedPlants(prev => {
        const isSelected = prev.includes(plant.id);
        if (isSelected) {
          return prev.filter(id => id !== plant.id);
        } else {
          return [...prev, plant.id];
        }
      });
    } else if (onPlantSelect) {
      onPlantSelect(plant);
    }
  }, [isSelectionMode, onPlantSelect, triggerHaptic]);

  // Handle swipe actions on plant cards
  const handleSwipeLeft = useCallback((plant: EnhancedPlantInstance) => {
    // Quick care action on swipe left
    if (onCareAction) {
      onCareAction(plant, 'fertilize');
    }
  }, [onCareAction]);

  const handleSwipeRight = useCallback((plant: EnhancedPlantInstance) => {
    // Quick selection on swipe right
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedPlants([plant.id]);
      triggerHaptic('medium');
    }
  }, [isSelectionMode, triggerHaptic]);

  // Handle care actions
  const handleCareAction = useCallback((plant: EnhancedPlantInstance, action: 'fertilize' | 'repot') => {
    if (onCareAction) {
      onCareAction(plant, action);
    }
  }, [onCareAction]);

  // Handle bulk actions
  const handleBulkAction = useCallback((action: string) => {
    if (onBulkAction && selectedPlants.length > 0) {
      const selectedPlantInstances = plants.filter(plant => selectedPlants.includes(plant.id));
      onBulkAction(selectedPlantInstances, action);
    }
  }, [onBulkAction, selectedPlants, plants]);

  // Pull to refresh functionality
  const {
    elementRef: pullToRefreshRef,
    isRefreshing,
    isPulling,
    progress,
    getRefreshIndicatorStyle,
  } = usePullToRefresh({
    onRefresh: async () => {
      await refetch();
    },
    threshold: 80,
    enabled: true,
  });

  // Handle infinite scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 1000;
    
    if (isNearBottom && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Exit selection mode
  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedPlants([]);
  }, []);

  // Select all plants
  const selectAllPlants = useCallback(() => {
    setSelectedPlants(plants.map(plant => plant.id));
  }, [plants]);

  // Grid columns based on screen size
  const getGridColumns = () => {
    switch (cardSize) {
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

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-red-500 text-center mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-lg font-medium">Failed to load plants</p>
          <p className="text-sm text-gray-600">{error?.message}</p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header with Search and Filters */}
      {(showSearch || showFilters) && (
        <div className="flex-shrink-0 mb-4">
          <PlantSearchFilter
            onSearch={handleSearch}
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
            searchQuery={searchQuery}
            filters={filters}
            sortBy={sortBy}
            sortOrder={sortOrder}
            showSearch={showSearch}
            showFilters={showFilters}
            isLoading={isLoading}
            onRefresh={() => refetch()}
            isRefreshing={isRefreshing}
          />
        </div>
      )}

      {/* Selection Mode Header */}
      {isSelectionMode && (
        <div className="flex-shrink-0 mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={exitSelectionMode}
                className="p-1 text-primary-600 hover:text-primary-800"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <span className="text-sm font-medium text-primary-900">
                {selectedPlants.length} selected
              </span>
              <button
                onClick={selectAllPlants}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                Select All
              </button>
            </div>
            
            {selectedPlants.length > 0 && (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleBulkAction('fertilize')}
                  className="px-3 py-1 bg-primary-500 text-white text-sm rounded hover:bg-primary-600"
                >
                  Fertilize
                </button>
                <button
                  onClick={() => handleBulkAction('deactivate')}
                  className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                >
                  Archive
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plants Grid */}
      <div 
        ref={pullToRefreshRef}
        className="flex-1 overflow-auto pull-to-refresh"
        onScroll={handleScroll}
      >
        {/* Pull to Refresh Indicator */}
        <PullToRefreshIndicator
          isVisible={isPulling || isRefreshing}
          isRefreshing={isRefreshing}
          progress={progress}
          style={getRefreshIndicatorStyle()}
        />
        {isLoading ? (
          <PlantCardSkeleton size={cardSize} count={12} />
        ) : plants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-gray-400 text-center">
              <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-lg font-medium mb-2">No plants found</p>
              <p className="text-sm text-gray-500">
                {searchQuery ? 'Try adjusting your search or filters' : 'Add your first plant to get started'}
              </p>
            </div>
          </div>
        ) : (
          <div className={`grid gap-4 p-4 ${getGridColumns()}`}>
            {plants.map((plant) => (
              <PlantCard
                key={plant.id}
                plant={plant}
                size={cardSize}
                onSelect={handlePlantSelect}
                onCareAction={handleCareAction}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                isSelected={selectedPlants.includes(plant.id)}
                isSelectionMode={isSelectionMode}
                showCareStatus={true}
                showLocation={true}
                showLastCare={false}
              />
            ))}
          </div>
        )}

        {/* Loading more indicator */}
        {isFetchingNextPage && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
            <span className="ml-2 text-sm text-gray-600">Loading more...</span>
          </div>
        )}
      </div>
    </div>
  );
}