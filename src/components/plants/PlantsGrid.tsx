'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import S3Image from '@/components/shared/S3Image';
import PlantCard from './PlantCard';
import PlantSearchFilter from './PlantSearchFilter';
import PlantCardSkeleton from './PlantCardSkeleton';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/shared/PullToRefreshIndicator';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import type {
  EnhancedPlantInstance,
  PlantInstanceSearchResult,
  PlantInstanceSortField,
  AdvancedSearchResult
} from '@/lib/types/plant-instance-types';
import type {
  EnhancedPlantInstanceFilter
} from '@/lib/validation/plant-schemas';

interface PlantsGridProps {
  userId: number;
  onPlantSelect?: (plant: EnhancedPlantInstance) => void;
  onCareAction?: (plant: EnhancedPlantInstance, action: 'fertilize' | 'repot') => void;
  onEdit?: (plant: EnhancedPlantInstance) => void;
  onBulkAction?: (plants: EnhancedPlantInstance[], action: string) => void;
  showSearch?: boolean;
  showFilters?: boolean;
  showAdvancedSearch?: boolean;
  showSearchResults?: boolean;
  showPresets?: boolean;
  showHistory?: boolean;
  showViewToggle?: boolean;
  initialFilters?: Partial<EnhancedPlantInstanceFilter>;
  cardSize?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function PlantsGrid({
  userId,
  onPlantSelect,
  onCareAction,
  onEdit,
  onBulkAction,
  showSearch = true,
  showFilters = true,
  showAdvancedSearch = false,
  showSearchResults = false,
  showPresets = false,
  showHistory = false,
  showViewToggle = true,
  initialFilters = {},
  cardSize = 'medium',
  className = '',
}: PlantsGridProps) {
  const [enhancedFilters, setEnhancedFilters] = useState<EnhancedPlantInstanceFilter>({
    userId,
    overdueOnly: false,
    isActive: true,
    limit: 20,
    offset: 0,
    sortBy: 'created_at',
    sortOrder: 'desc',
    includeStats: false,
    includeFacets: false,
    ...initialFilters,
  });
  const [selectedPlants, setSelectedPlants] = useState<number[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [searchResults, setSearchResults] = useState<AdvancedSearchResult | null>(null);
  const [useSearchResults, setUseSearchResults] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { triggerHaptic } = useHapticFeedback();
  const loadMoreRef = useRef<HTMLDivElement>(null);



  // Fetch plants with infinite query using enhanced filters
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
    queryKey: ['plant-instances-enhanced', userId, enhancedFilters],
    queryFn: async ({ pageParam }) => {
      const currentFilters = {
        ...enhancedFilters,
        offset: pageParam,
      };

      // Check if we have advanced features that require the enhanced endpoint
      const hasAdvancedFeatures = enhancedFilters.searchQuery || 
                                  enhancedFilters.hasImages !== undefined ||
                                  enhancedFilters.imageCount ||
                                  enhancedFilters.fertilizerFrequency ||
                                  enhancedFilters.datePreset;

      let endpoint: string;
      let params: URLSearchParams;

      if (hasAdvancedFeatures) {
        // Use enhanced search endpoint
        endpoint = '/api/plant-instances/enhanced-search';
        params = new URLSearchParams();
        
        // Add all enhanced filter parameters
        Object.entries(currentFilters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (value instanceof Date) {
              params.append(key, value.toISOString());
            } else if (typeof value === 'object') {
              params.append(key, JSON.stringify(value));
            } else {
              params.append(key, String(value));
            }
          }
        });
      } else {
        // Use regular endpoint with basic filters
        endpoint = '/api/plant-instances';
        params = new URLSearchParams({
          userId: String(currentFilters.userId),
          offset: String(currentFilters.offset),
          limit: String(currentFilters.limit),
          sortBy: currentFilters.sortBy,
          sortOrder: currentFilters.sortOrder,
        });

        // Add optional basic filters
        if (currentFilters.location) params.append('location', currentFilters.location);
        if (currentFilters.plantId) params.append('plantId', String(currentFilters.plantId));
        if (currentFilters.isActive !== undefined) params.append('isActive', String(currentFilters.isActive));
        if (currentFilters.overdueOnly) params.append('overdueOnly', 'true');
        if (currentFilters.dueSoonDays) params.append('dueSoonDays', String(currentFilters.dueSoonDays));
        if (currentFilters.createdAfter) params.append('createdAfter', currentFilters.createdAfter.toISOString());
        if (currentFilters.createdBefore) params.append('createdBefore', currentFilters.createdBefore.toISOString());
        if (currentFilters.lastFertilizedAfter) params.append('lastFertilizedAfter', currentFilters.lastFertilizedAfter.toISOString());
        if (currentFilters.lastFertilizedBefore) params.append('lastFertilizedBefore', currentFilters.lastFertilizedBefore.toISOString());
      }

      const response = await fetch(`${endpoint}?${params}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch plants:', response.status, errorText);
        throw new Error(`Failed to fetch plants: ${response.status}`);
      }
      return response.json() as Promise<PlantInstanceSearchResult>;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.filters.offset + lastPage.filters.limit : undefined;
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // Flatten all pages into a single array or use search results
  const plants = useMemo(() => {
    if (useSearchResults && searchResults) {
      return (searchResults.instances || []).filter(Boolean);
    }
    return data?.pages.flatMap(page => page.instances).filter(Boolean) ?? [];
  }, [data, searchResults, useSearchResults]);

  // Handle search - now integrated into enhanced filters
  const handleSearch = useCallback((query: string) => {
    setEnhancedFilters(prev => ({
      ...prev,
      searchQuery: query || undefined,
      offset: 0, // Reset pagination
    }));
    setSelectedPlants([]);
    setIsSelectionMode(false);
    setUseSearchResults(false);
    setSearchResults(null);
  }, []);

  // Handle advanced search results
  const handleSearchResults = useCallback((results: AdvancedSearchResult) => {
    setSearchResults(results);
    setUseSearchResults(true);
    setSelectedPlants([]);
    setIsSelectionMode(false);
  }, []);

  // Handle enhanced filter changes
  const handleFilterChange = useCallback((newFilters: Partial<EnhancedPlantInstanceFilter>) => {
    setEnhancedFilters(prev => ({
      ...prev,
      ...newFilters,
      offset: 0, // Reset pagination
    }));
    setSelectedPlants([]);
    setIsSelectionMode(false);
  }, []);

  // Handle sort changes - now integrated into enhanced filters
  const handleSortChange = useCallback((field: PlantInstanceSortField, order: 'asc' | 'desc') => {
    setEnhancedFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: order,
      offset: 0, // Reset pagination
    }));
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

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
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
        return 'grid gap-3 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8';
      case 'medium':
        return 'grid-plants';
      case 'large':
        return 'grid-responsive';
      default:
        return 'grid-plants';
    }
  };

  if (isError) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon text-error">
          <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="empty-state-title">Failed to load plants</h3>
        <p className="empty-state-message">{error?.message}</p>
        <button
          onClick={() => refetch()}
          className="btn btn--primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header with Search and Filters */}
      {(showSearch || showFilters) && (
        <div className="flex-shrink-0 mb-4">
          <PlantSearchFilter
            onSearch={handleSearch}
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
            onSearchResults={handleSearchResults}
            onPlantSelect={onPlantSelect}
            searchQuery={enhancedFilters.searchQuery || ''}
            filters={enhancedFilters}
            sortBy={enhancedFilters.sortBy}
            sortOrder={enhancedFilters.sortOrder}
            showSearch={showSearch}
            showFilters={showFilters}
            showAdvancedSearch={showAdvancedSearch}
            showSearchResults={showSearchResults}
            showPresets={showPresets}
            showHistory={showHistory}
            isLoading={isLoading}
            onRefresh={() => refetch()}
            isRefreshing={isRefreshing}
          />

          {/* Active Filters Indicator */}
          {(enhancedFilters.searchQuery ||
            enhancedFilters.hasImages !== undefined ||
            enhancedFilters.imageCount ||
            enhancedFilters.fertilizerFrequency ||
            enhancedFilters.datePreset ||
            enhancedFilters.location ||
            enhancedFilters.plantId ||
            enhancedFilters.overdueOnly) && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-mint-50 rounded-lg">
                <span className="text-xs font-medium text-mint-700">Active filters:</span>
                <div className="flex flex-wrap gap-1">
                  {enhancedFilters.searchQuery && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-mint-100 text-mint-800 text-xs rounded">
                      Search: &quot;{enhancedFilters.searchQuery}&quot;
                      <button onClick={() => handleSearch('')} className="text-mint-600 hover:text-mint-800">×</button>
                    </span>
                  )}
                  {enhancedFilters.datePreset && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-mint-100 text-mint-800 text-xs rounded">
                      {enhancedFilters.datePreset.replace('_', ' ')}
                      <button onClick={() => handleFilterChange({ datePreset: undefined })} className="text-mint-600 hover:text-mint-800">×</button>
                    </span>
                  )}
                  {enhancedFilters.hasImages !== undefined && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-mint-100 text-mint-800 text-xs rounded">
                      {enhancedFilters.hasImages ? 'Has images' : 'No images'}
                      <button onClick={() => handleFilterChange({ hasImages: undefined })} className="text-mint-600 hover:text-mint-800">×</button>
                    </span>
                  )}
                  {enhancedFilters.overdueOnly && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-mint-100 text-mint-800 text-xs rounded">
                      Overdue only
                      <button onClick={() => handleFilterChange({ overdueOnly: false })} className="text-mint-600 hover:text-mint-800">×</button>
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleFilterChange({
                    searchQuery: undefined,
                    datePreset: undefined,
                    hasImages: undefined,
                    overdueOnly: false
                  })}
                  className="ml-auto text-xs text-mint-600 hover:text-mint-800 underline"
                >
                  Clear all
                </button>
              </div>
            )}

          {/* View Toggle */}
          {showViewToggle && (
            <div className="flex items-center justify-end gap-2 mt-3">
              <span className="text-xs text-neutral-500 mr-1">View:</span>
              <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                  title="Grid view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                  title="List view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  List
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selection Mode Header */}
      {isSelectionMode && (
        <div className="card card--mint mb-4">
          <div className="card-body">
            <div className="flex-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={exitSelectionMode}
                  className="btn btn--icon btn--sm btn--ghost"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                <span className="text-sm font-medium text-mint-900">
                  {selectedPlants.length} selected
                </span>
                <button
                  onClick={selectAllPlants}
                  className="link text-sm"
                >
                  Select All
                </button>
              </div>

              {selectedPlants.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkAction('fertilize')}
                    className="btn btn--sm btn--primary"
                  >
                    Fertilize
                  </button>
                  <button
                    onClick={() => handleBulkAction('deactivate')}
                    className="btn btn--sm btn--secondary"
                  >
                    Archive
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Plants Grid */}
      <div
        ref={pullToRefreshRef}
        className="flex-1 pull-to-refresh"
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
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="empty-state-title">No plants found</h3>
            <p className="empty-state-message">
              {enhancedFilters.searchQuery ? 'Try adjusting your search or filters' : 'Add your first plant to get started'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className={`${getGridColumns()} p-4`}>
            {plants.map((plant) => (
              <PlantCard
                key={plant.id}
                plant={plant}
                size={cardSize}
                onSelect={handlePlantSelect}
                onCareAction={handleCareAction}
                onEdit={onEdit}
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
        ) : (
          /* List View */
          <div className="divide-y divide-neutral-100 p-2">
            {plants.map((plant) => (
              <div
                key={plant.id}
                onClick={() => handlePlantSelect(plant)}
                className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors hover:bg-neutral-50 ${
                  selectedPlants.includes(plant.id) ? 'bg-mint-50 ring-1 ring-mint-200' : ''
                }`}
              >
                {/* Selection checkbox in selection mode */}
                {isSelectionMode && (
                  <div className="flex-shrink-0">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedPlants.includes(plant.id)
                        ? 'bg-mint-500 border-mint-500'
                        : 'border-neutral-300'
                    }`}>
                      {selectedPlants.includes(plant.id) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                )}

                {/* Plant thumbnail */}
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-neutral-100 overflow-hidden relative">
                  {plant.s3ImageKeys && plant.s3ImageKeys.length > 0 ? (
                    <S3Image
                      s3Key={plant.s3ImageKeys[0]}
                      alt={plant.displayName || 'Plant'}
                      fill
                      className="object-cover"
                      thumbnailSize="tiny"
                      sizes="48px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-xl opacity-30">🌱</div>
                    </div>
                  )}
                </div>

                {/* Plant info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-neutral-900 truncate">
                      {plant.displayName || 'Unnamed Plant'}
                    </h3>
                    {plant.careStatus === 'overdue' && (
                      <span className="flex-shrink-0 px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                        Overdue
                      </span>
                    )}
                    {plant.careStatus === 'due_soon' && (
                      <span className="flex-shrink-0 px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                        Due Soon
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-neutral-500">
                    {plant.plant?.commonName && plant.nickname && (
                      <span className="truncate">{plant.plant.commonName}</span>
                    )}
                    {plant.location && (
                      <span className="flex items-center gap-1 truncate">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {plant.location}
                      </span>
                    )}
                    {plant.lastFertilized && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        {new Date(plant.lastFertilized).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex-shrink-0 flex items-center gap-1">
                  {onCareAction && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCareAction(plant, 'fertilize');
                      }}
                      className="p-2 rounded-lg text-neutral-400 hover:text-mint-600 hover:bg-mint-50 transition-colors"
                      title="Log fertilizer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(plant);
                      }}
                      className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                      title="Edit plant"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                  <svg className="w-4 h-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading more indicator and manual load button */}
        {isFetchingNextPage && (
          <div className="flex-center py-4">
            <div className="spinner" />
            <span className="ml-2 text-sm text-neutral-600">Loading more...</span>
          </div>
        )}

        {/* Intersection Observer target for infinite scroll */}
        {hasNextPage && (
          <div
            ref={loadMoreRef}
            className="flex-center py-4"
            style={{ minHeight: '100px' }}
          >
            {isFetchingNextPage ? (
              <>
                <div className="spinner" />
                <span className="ml-2 text-sm text-neutral-600">Loading more...</span>
              </>
            ) : (
              <button
                onClick={() => fetchNextPage()}
                className="btn btn--secondary"
              >
                Load More Plants ({plants.length} of {data?.pages?.[0]?.totalCount || 0})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}