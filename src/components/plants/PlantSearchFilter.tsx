'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import AdvancedSearchInterface from '@/components/search/AdvancedSearchInterface';
import SearchResults from '@/components/search/SearchResults';
import SearchPresetManager from '@/components/search/SearchPresetManager';
import SearchHistory from '@/components/search/SearchHistory';
import type { PlantInstanceSortField } from '@/lib/types/plant-instance-types';
import type {
  PlantInstanceFilter,
  EnhancedPlantInstanceFilter
} from '@/lib/validation/plant-schemas';
import type {
  AdvancedSearchResult,
  EnhancedPlantInstance
} from '@/lib/types/plant-instance-types';

interface PlantSearchFilterProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: Partial<EnhancedPlantInstanceFilter>) => void;
  onSortChange: (field: PlantInstanceSortField, order: 'asc' | 'desc') => void;
  onSearchResults?: (results: AdvancedSearchResult) => void;
  onPlantSelect?: (plant: EnhancedPlantInstance) => void;
  searchQuery: string;
  filters: EnhancedPlantInstanceFilter;
  sortBy: PlantInstanceSortField;
  sortOrder: 'asc' | 'desc';
  showSearch?: boolean;
  showFilters?: boolean;
  showAdvancedSearch?: boolean;
  showSearchResults?: boolean;
  showPresets?: boolean;
  showHistory?: boolean;
  isLoading?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function PlantSearchFilter({
  onSearch,
  onFilterChange,
  onSortChange,
  onSearchResults,
  onPlantSelect,
  searchQuery,
  filters,
  sortBy,
  sortOrder,
  showSearch = true,
  showFilters = true,
  showAdvancedSearch = false,
  showSearchResults = false,
  showPresets = false,
  showHistory = false,
  isLoading = false,
  onRefresh,
  isRefreshing = false,
}: PlantSearchFilterProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);
  const [showPresetsPanel, setShowPresetsPanel] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [searchResults, setSearchResults] = useState<AdvancedSearchResult | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Enhanced filters for advanced search
  const [enhancedFilters, setEnhancedFilters] = useState<EnhancedPlantInstanceFilter>({
    userId: filters.userId,
    overdueOnly: filters.overdueOnly,
    limit: filters.limit || 20,
    offset: filters.offset || 0,
    sortBy: sortBy,
    sortOrder: sortOrder,
    location: filters.location,
    dueSoonDays: filters.dueSoonDays,
    isActive: filters.isActive,
    includeStats: false,
    includeFacets: false,
  });

  // Fetch user locations for filter dropdown
  const { data: locations } = useQuery({
    queryKey: ['user-locations', filters.userId],
    queryFn: async () => {
      const response = await apiFetch('/api/plant-instances/locations');
      if (!response.ok) throw new Error('Failed to fetch locations');
      const data = await response.json();
      return data.locations as string[];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Handle search input with debouncing
  const handleSearchInput = useCallback((value: string) => {
    setLocalSearchQuery(value);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout
    searchTimeoutRef.current = setTimeout(() => {
      onSearch(value);
    }, 300);
  }, [onSearch]);

  // Handle filter changes
  const handleFilterChange = useCallback((key: keyof EnhancedPlantInstanceFilter, value: string | number | boolean | Date | undefined) => {
    onFilterChange({ [key]: value });
  }, [onFilterChange]);

  // Handle sort changes
  const handleSortChange = useCallback((field: PlantInstanceSortField) => {
    const newOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc';
    onSortChange(field, newOrder);
  }, [sortBy, sortOrder, onSortChange]);

  // Handle advanced search results
  const handleSearchResults = useCallback((results: AdvancedSearchResult) => {
    setSearchResults(results);
    onSearchResults?.(results);
  }, [onSearchResults]);

  // Handle enhanced filter changes
  const handleEnhancedFiltersChange = useCallback((newFilters: EnhancedPlantInstanceFilter) => {
    setEnhancedFilters(newFilters);

    // Update all filters directly since we're now using EnhancedPlantInstanceFilter
    onFilterChange(newFilters);
  }, [onFilterChange]);

  // Handle preset selection
  const handlePresetSelect = useCallback(async (presetId: string) => {
    try {
      const response = await apiFetch(`/api/search/presets/${presetId}`);
      if (!response.ok) throw new Error('Failed to load preset');

      const data = await response.json();
      handleSearchResults(data.data);
    } catch (error) {
      console.error('Failed to load search preset:', error);
    }
  }, [handleSearchResults]);

  // Handle search from history
  const handleHistorySearch = useCallback((query: string) => {
    setLocalSearchQuery(query);
    onSearch(query);
  }, [onSearch]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    const clearedFilters: EnhancedPlantInstanceFilter = {
      userId: filters.userId,
      overdueOnly: false,
      isActive: true,
      limit: 20,
      offset: 0,
      sortBy: 'created_at',
      sortOrder: 'desc',
      includeStats: false,
      includeFacets: false,
    };

    onFilterChange(clearedFilters);
    setLocalSearchQuery('');
    onSearch('');
    setSearchResults(null);
    setEnhancedFilters(clearedFilters);
  }, [onFilterChange, onSearch, filters.userId]);

  // Count active filters
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'userId' || key === 'isActive' || key === 'limit' || key === 'offset') return false;
    return value !== undefined && value !== false && value !== '';
  }).length + (searchQuery ? 1 : 0);

  // Sort options
  const sortOptions: Array<{ field: PlantInstanceSortField; label: string }> = [
    { field: 'nickname', label: 'Name' },
    { field: 'location', label: 'Location' },
    { field: 'created_at', label: 'Date Added' },
    { field: 'last_fertilized', label: 'Last Fertilized' },
    { field: 'fertilizer_due', label: 'Care Due' },
    { field: 'care_urgency', label: 'Care Priority' },
    { field: 'plant_name', label: 'Plant Type' },
  ];

  // Handle click outside to close more menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    }

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMoreMenu]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* Search and Action Bar */}
      <div className="flex items-center gap-2">
        {/* Search Input */}
        {showSearch && (
          <div className="flex-1 relative min-w-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search plants..."
              value={localSearchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
            {localSearchQuery && (
              <button
                onClick={() => handleSearchInput('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Always visible: Filter Toggle */}
        {showFilters && (
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`
              relative flex-shrink-0 px-2 py-2 border rounded-lg text-xs font-medium transition-colors whitespace-nowrap
              ${showFilterPanel
                ? 'bg-primary-50 border-primary-300 text-primary-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
            Filters
            {/* {activeFilterCount > 0 && (
              <span className="badge--notification">
                {activeFilterCount}
              </span>
            )} */}
          </button>
        )}

        {/* Visible on larger screens */}
        <div className="hidden sm:flex items-center gap-2">
          {/* Advanced Search Toggle */}
          {showAdvancedSearch && (
            <button
              onClick={() => setShowAdvancedPanel(!showAdvancedPanel)}
              className={`
                flex-shrink-0 px-2 py-2 border rounded-lg text-xs font-medium transition-colors whitespace-nowrap
                ${showAdvancedPanel
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              Smart Search
            </button>
          )}

          {/* Presets Toggle */}
          {showPresets && (
            <button
              onClick={() => setShowPresetsPanel(!showPresetsPanel)}
              className={`
                flex-shrink-0 px-2 py-2 border rounded-lg text-xs font-medium transition-colors whitespace-nowrap
                ${showPresetsPanel
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" clipRule="evenodd" />
              </svg>
              Saved
            </button>
          )}

          {/* History Toggle */}
          {showHistory && (
            <button
              onClick={() => setShowHistoryPanel(!showHistoryPanel)}
              className={`
                flex-shrink-0 px-2 py-2 border rounded-lg text-xs font-medium transition-colors whitespace-nowrap
                ${showHistoryPanel
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              History
            </button>
          )}

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex-shrink-0 p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <svg
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        {/* More menu for smaller screens */}
        {(showAdvancedSearch || showPresets || showHistory || onRefresh) && (
          <div ref={moreMenuRef} className="sm:hidden relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`
                flex-shrink-0 p-2 border rounded-lg text-xs font-medium transition-colors
                ${showMoreMenu
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="py-1">
                  {showAdvancedSearch && (
                    <button
                      onClick={() => {
                        setShowAdvancedPanel(!showAdvancedPanel);
                        setShowMoreMenu(false);
                      }}
                      className={`
                        w-full flex items-center px-3 py-2 text-sm text-left hover:bg-gray-50
                        ${showAdvancedPanel ? 'text-primary-700 bg-primary-50' : 'text-gray-700'}
                      `}
                    >
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                      Smart Search
                    </button>
                  )}

                  {showPresets && (
                    <button
                      onClick={() => {
                        setShowPresetsPanel(!showPresetsPanel);
                        setShowMoreMenu(false);
                      }}
                      className={`
                        w-full flex items-center px-3 py-2 text-sm text-left hover:bg-gray-50
                        ${showPresetsPanel ? 'text-primary-700 bg-primary-50' : 'text-gray-700'}
                      `}
                    >
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" clipRule="evenodd" />
                      </svg>
                      Saved
                    </button>
                  )}

                  {showHistory && (
                    <button
                      onClick={() => {
                        setShowHistoryPanel(!showHistoryPanel);
                        setShowMoreMenu(false);
                      }}
                      className={`
                        w-full flex items-center px-3 py-2 text-sm text-left hover:bg-gray-50
                        ${showHistoryPanel ? 'text-primary-700 bg-primary-50' : 'text-gray-700'}
                      `}
                    >
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      History
                    </button>
                  )}

                  {onRefresh && (
                    <button
                      onClick={() => {
                        onRefresh();
                        setShowMoreMenu(false);
                      }}
                      disabled={isRefreshing}
                      className="w-full flex items-center px-3 py-2 text-sm text-left hover:bg-gray-50 text-gray-700 disabled:opacity-50"
                    >
                      <svg
                        className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Refresh
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter Panel */}
      {showFilterPanel && showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Filters</h3>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Location Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Location
              </label>
              <select
                value={filters.location || ''}
                onChange={(e) => handleFilterChange('location', e.target.value || undefined)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All locations</option>
                {locations?.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>

            {/* Care Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Care Status
              </label>
              <select
                value={filters.overdueOnly ? 'overdue' : filters.dueSoonDays ? 'due_soon' : ''}
                onChange={(e) => {
                  if (e.target.value === 'overdue') {
                    handleFilterChange('overdueOnly', true);
                    handleFilterChange('dueSoonDays', undefined);
                  } else if (e.target.value === 'due_soon') {
                    handleFilterChange('overdueOnly', false);
                    handleFilterChange('dueSoonDays', 7);
                  } else {
                    handleFilterChange('overdueOnly', false);
                    handleFilterChange('dueSoonDays', undefined);
                  }
                }}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All plants</option>
                <option value="overdue">Overdue care</option>
                <option value="due_soon">Due soon</option>
              </select>
            </div>

            {/* Active Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive'}
                onChange={(e) => {
                  const value = e.target.value === 'all' ? undefined : e.target.value === 'active';
                  handleFilterChange('isActive', value);
                }}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All plants</option>
                <option value="active">Active only</option>
                <option value="inactive">Archived only</option>
              </select>
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Sort by
            </label>
            <div className="flex flex-wrap gap-2">
              {sortOptions.map((option) => (
                <button
                  key={option.field}
                  onClick={() => handleSortChange(option.field)}
                  className={`
                    px-3 py-1 text-xs rounded-full border transition-colors
                    ${sortBy === option.field
                      ? 'bg-primary-100 border-primary-300 text-primary-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  {option.label}
                  {sortBy === option.field && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Advanced Search Panel */}
      {showAdvancedPanel && showAdvancedSearch && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <AdvancedSearchInterface
            onResults={handleSearchResults}
            onFiltersChange={handleEnhancedFiltersChange}
            initialFilters={enhancedFilters}
            placeholder="Smart search across all plant data..."
            showPresets={false}
            showHistory={false}
            compact={true}
          />
        </div>
      )}

      {/* Search Presets Panel */}
      {showPresetsPanel && showPresets && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <SearchPresetManager
            currentFilters={enhancedFilters}
            currentSortBy={sortBy}
            currentSortOrder={sortOrder}
            onPresetSelect={handlePresetSelect}
          />
        </div>
      )}

      {/* Search History Panel */}
      {showHistoryPanel && showHistory && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <SearchHistory
            onSearchSelect={handleHistorySearch}
            limit={10}
            showClearAll={true}
          />
        </div>
      )}

      {/* Search Results */}
      {showSearchResults && searchResults && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <SearchResults
            results={searchResults}
            isLoading={isLoading}
            onPlantSelect={onPlantSelect}
            showFacets={true}
            showStats={true}
          />
        </div>
      )}
    </div>
  );
}