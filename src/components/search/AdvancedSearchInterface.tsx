'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { 
  MultiFieldSearch, 
  EnhancedPlantInstanceFilter,
  SearchPreset 
} from '@/lib/validation/plant-schemas';
import type { 
  EnhancedPlantInstance, 
  PlantInstanceSortField,
  AdvancedSearchResult 
} from '@/lib/types/plant-instance-types';

interface AdvancedSearchInterfaceProps {
  onResults: (results: AdvancedSearchResult) => void;
  onFiltersChange: (filters: EnhancedPlantInstanceFilter) => void;
  initialFilters?: EnhancedPlantInstanceFilter;
  placeholder?: string;
  showPresets?: boolean;
  showHistory?: boolean;
  compact?: boolean;
}

export default function AdvancedSearchInterface({
  onResults,
  onFiltersChange,
  initialFilters,
  placeholder = "Search plants...",
  showPresets = true,
  showHistory = true,
  compact = false,
}: AdvancedSearchInterfaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isPendingSearch, setIsPendingSearch] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Current filters state
  const [filters, setFilters] = useState<EnhancedPlantInstanceFilter>(
    initialFilters || {
      userId: 0, // Will be set from user context
      overdueOnly: false,
      limit: 20,
      offset: 0,
      sortBy: 'created_at',
      sortOrder: 'desc',
      includeStats: false,
      includeFacets: false,
    }
  );

  // Search suggestions query
  const { data: suggestions, isLoading: suggestionsLoading, error: suggestionsError } = useQuery({
    queryKey: ['search-suggestions', searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return { suggestions: [] };
      
      const response = await fetch(`/api/search/suggestions?query=${encodeURIComponent(searchQuery)}&limit=5`);
      if (!response.ok) throw new Error('Failed to fetch suggestions');
      const data = await response.json();
      return data.data || data; // Handle both data.data and direct data response
    },
    enabled: searchQuery.length >= 2 && showSuggestions,
    staleTime: 1000 * 30, // 30 seconds
  });

  // Search presets query
  const { data: presets } = useQuery({
    queryKey: ['search-presets'],
    queryFn: async () => {
      const response = await fetch('/api/search/presets');
      if (!response.ok) throw new Error('Failed to fetch presets');
      const data = await response.json();
      return (data.data?.presets || data.presets || []) as SearchPreset[];
    },
    enabled: showPresets,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Search history query
  const { data: history, error: historyError } = useQuery({
    queryKey: ['search-history'],
    queryFn: async () => {
      const response = await fetch('/api/search/history?limit=5');
      if (!response.ok) throw new Error('Failed to fetch history');
      const data = await response.json();
      return data.data?.history || [];
    },
    enabled: showHistory && showSuggestions,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Smart search mutation
  const smartSearchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch('/api/search/smart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          limit: filters.limit,
          offset: filters.offset,
          includeInactive: !filters.isActive,
        }),
      });
      
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      return data.data as AdvancedSearchResult;
    },
    onSuccess: (result) => {
      setIsPendingSearch(false);
      onResults(result);
    },
    onError: (error) => {
      setIsPendingSearch(false);
      console.error('Smart search failed:', error);
    },
  });

  // Advanced search mutation
  const advancedSearchMutation = useMutation({
    mutationFn: async (criteria: MultiFieldSearch) => {
      const response = await fetch('/api/search/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criteria,
          options: {
            limit: filters.limit,
            offset: filters.offset,
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder,
          },
        }),
      });
      
      if (!response.ok) throw new Error('Advanced search failed');
      const data = await response.json();
      return data.data as AdvancedSearchResult;
    },
    onSuccess: (result) => {
      setIsPendingSearch(false);
      onResults(result);
    },
    onError: (error) => {
      setIsPendingSearch(false);
      console.error('Advanced search failed:', error);
    },
  });

  // Handle search input with debouncing
  const handleSearchInput = useCallback((value: string) => {
    setSearchQuery(value);
    
    // Show suggestions if we have enough characters or history
    if (value.length >= 2 || (showHistory && history?.length > 0)) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setIsPendingSearch(false);
    }
    
    // Set new timeout for search
    if (value.trim() && value.length >= 2) {
      setIsPendingSearch(true);
      const timeout = setTimeout(() => {
        smartSearchMutation.mutate(value.trim());
        // Don't set isPendingSearch to false here, let the mutation handle it
      }, 300);
      setSearchTimeout(timeout);
    } else {
      setIsPendingSearch(false);
    }
  }, [smartSearchMutation, searchTimeout, showHistory, history?.length]);

  // Handle filter changes
  const handleFilterChange = useCallback((key: keyof EnhancedPlantInstanceFilter, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  }, [filters, onFiltersChange]);

  // Handle advanced search
  const handleAdvancedSearch = useCallback(() => {
    if (!searchQuery.trim()) return;

    const criteria: MultiFieldSearch = {
      nickname: searchQuery,
      plantName: searchQuery,
      location: searchQuery,
      notes: searchQuery,
      operator: 'OR',
      fieldWeights: {
        nickname: 1.0,
        plantName: 0.8,
        location: 0.6,
        notes: 0.4,
      },
    };

    advancedSearchMutation.mutate(criteria);
  }, [searchQuery, advancedSearchMutation]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    smartSearchMutation.mutate(suggestion);
  }, [smartSearchMutation]);

  // Handle preset selection
  const handlePresetSelect = useCallback(async (presetId: string) => {
    try {
      const response = await fetch(`/api/search/presets/${presetId}`);
      if (!response.ok) throw new Error('Failed to load preset');
      
      const data = await response.json();
      onResults(data.data);
      setSelectedPreset(presetId);
    } catch (error) {
      console.error('Failed to load search preset:', error);
    }
  }, [onResults]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSelectedPreset(null);
    setShowSuggestions(false);
    
    // Reset to default filters
    const defaultFilters: EnhancedPlantInstanceFilter = {
      userId: filters.userId,
      overdueOnly: false,
      limit: 20,
      offset: 0,
      sortBy: 'created_at',
      sortOrder: 'desc',
      includeStats: false,
      includeFacets: false,
    };
    
    setFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  }, [filters.userId, onFiltersChange]);

  // Focus management
  const handleInputFocus = useCallback(() => {
    if (searchQuery.length >= 2 || (showHistory && history?.length > 0)) {
      setShowSuggestions(true);
    }
  }, [searchQuery.length, showHistory, history?.length]);

  const handleInputBlur = useCallback(() => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => setShowSuggestions(false), 200);
  }, []);

  // Call onFiltersChange with initial filters on mount
  useEffect(() => {
    onFiltersChange(filters);
  }, []); // Only run on mount

  // Show suggestions when query changes and meets criteria
  useEffect(() => {
    if (searchQuery.length >= 2 || (showHistory && history?.length > 0)) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [searchQuery, showHistory, history?.length]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const isLoading = smartSearchMutation.isPending || advancedSearchMutation.isPending || isPendingSearch;

  return (
    <div className="space-y-3">
      {/* Main Search Input */}
      <div className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          
          <input
            ref={searchInputRef}
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            className={`
              block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg 
              focus:ring-primary-500 focus:border-primary-500 text-sm
              ${isLoading ? 'bg-gray-50' : 'bg-white'}
            `}
            disabled={isLoading}
          />
          
          <div className="absolute inset-y-0 right-0 flex items-center">
            {isLoading && (
              <div className="pr-3">
                <svg 
                  className="animate-spin h-4 w-4 text-gray-400" 
                  fill="none" 
                  viewBox="0 0 24 24"
                  role="status"
                  aria-label="Searching"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="sr-only">Searching for plants...</span>
              </div>
            )}
            
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="btn btn--ghost btn--icon btn--sm"
                type="button"
                aria-label="Clear search"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Search Suggestions Dropdown */}
        {showSuggestions && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {/* Loading State */}
            {suggestionsLoading && searchQuery.length >= 2 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                <div className="flex items-center justify-center">
                  <svg 
                    className="animate-spin h-4 w-4 mr-2" 
                    fill="none" 
                    viewBox="0 0 24 24"
                    role="status"
                    aria-label="Loading suggestions"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span aria-live="polite">Loading suggestions...</span>
                </div>
              </div>
            ) : suggestionsError && searchQuery.length >= 2 ? (
              /* Error State */
              <div className="p-4 text-center text-sm text-red-500">
                Failed to load suggestions
              </div>
            ) : (
              <>
                {/* Current Suggestions */}
                {suggestions?.suggestions?.length > 0 && (
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 mb-2">Suggestions</div>
                    {suggestions.suggestions.map((suggestion: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionSelect(suggestion)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded flex items-center"
                      >
                        <svg className="h-4 w-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                {/* Search History */}
                {showHistory && history?.length > 0 && (
                  <div className={`p-2 ${suggestions?.suggestions?.length > 0 ? 'border-t border-gray-100' : ''}`}>
                    <div className="text-xs font-medium text-gray-500 mb-2">Recent Searches</div>
                    {history.slice(0, 3).map((entry: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionSelect(entry.query)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded flex items-center"
                      >
                        <svg className="h-4 w-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        {entry.query}
                      </button>
                    ))}
                  </div>
                )}

                {/* No Results */}
                {searchQuery.length >= 2 && 
                 !suggestions?.suggestions?.length && 
                 (!showHistory || !history?.length) && (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No suggestions found
                  </div>
                )}

                {/* Show history only when no search query */}
                {searchQuery.length < 2 && showHistory && history?.length > 0 && (
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 mb-2">Recent Searches</div>
                    {history.slice(0, 3).map((entry: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionSelect(entry.query)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded flex items-center"
                      >
                        <svg className="h-4 w-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        {entry.query}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Search Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Advanced Search Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            disabled={isLoading}
            className={`btn btn--sm ${showAdvanced ? 'btn--primary' : 'btn--outline'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-expanded={showAdvanced}
            aria-controls="advanced-search-panel"
            title={showAdvanced ? 'Hide advanced search options' : 'Show advanced search options'}
          >
            Advanced
          </button>

          {/* Search Presets */}
          {showPresets && presets && presets.length > 0 && (
            <select
              value={selectedPreset || ''}
              onChange={(e) => e.target.value ? handlePresetSelect(e.target.value) : setSelectedPreset(null)}
              disabled={isLoading}
              className={`px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label="Select saved search preset"
              title="Choose from your saved search presets"
            >
              <option value="">Saved Searches</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Search Actions */}
        <div className="flex items-center space-x-2">
          {searchQuery && (
            <button
              onClick={handleAdvancedSearch}
              disabled={isLoading}
              className={`btn btn--sm btn--primary ${isLoading ? 'btn--loading' : ''}`}
              aria-label={isLoading ? 'Searching...' : 'Search'}
              data-testid="search-button"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </span>
              ) : (
                'Search'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Advanced Search Panel */}
      {showAdvanced && (
        <div 
          id="advanced-search-panel"
          className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4"
          role="region"
          aria-label="Advanced search options"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Advanced Search</h3>
            <button
              onClick={() => setShowAdvanced(false)}
              className="btn btn--ghost btn--icon btn--sm"
              aria-label="Close advanced search options"
              title="Close advanced search"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Location Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                placeholder="Enter location..."
                value={filters.location || ''}
                onChange={(e) => handleFilterChange('location', e.target.value || undefined)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
              />
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

            {/* Sort Options */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Sort by
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value as PlantInstanceSortField)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="created_at">Date Added</option>
                <option value="nickname">Name</option>
                <option value="location">Location</option>
                <option value="last_fertilized">Last Fertilized</option>
                <option value="fertilizer_due">Care Due</option>
                <option value="care_urgency">Care Priority</option>
                <option value="plant_name">Plant Type</option>
              </select>
            </div>
          </div>

          {/* Sort Order */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">Sort order:</span>
            <label className="flex items-center">
              <input
                type="radio"
                name="sortOrder"
                value="desc"
                checked={filters.sortOrder === 'desc'}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                className="mr-2"
              />
              <span className="text-sm">Newest first</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="sortOrder"
                value="asc"
                checked={filters.sortOrder === 'asc'}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                className="mr-2"
              />
              <span className="text-sm">Oldest first</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}