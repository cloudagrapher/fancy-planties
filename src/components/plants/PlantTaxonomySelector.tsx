'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { PlantSuggestion } from '@/lib/validation/plant-schemas';
import type { QuickSelectPlants } from '@/lib/types/plant-types';

interface PlantTaxonomySelectorProps {
  onSelect: (plant: PlantSuggestion | null) => void;
  onAddNew: (query: string) => void;
  selectedPlant?: PlantSuggestion | null;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showQuickSelect?: boolean;
  autoFocus?: boolean;
}

interface SearchState {
  query: string;
  results: PlantSuggestion[];
  isLoading: boolean;
  showDropdown: boolean;
  selectedIndex: number;
  hasSearched: boolean;
}

export default function PlantTaxonomySelector({
  onSelect,
  onAddNew,
  selectedPlant,
  placeholder = 'Search for a plant type...',
  disabled = false,
  className = '',
  showQuickSelect = true,
  autoFocus = false,
}: PlantTaxonomySelectorProps) {
  const [searchState, setSearchState] = useState<SearchState>({
    query: selectedPlant?.commonName || '',
    results: [],
    isLoading: false,
    showDropdown: false,
    selectedIndex: -1,
    hasSearched: false,
  });

  const [quickSelect, setQuickSelect] = useState<QuickSelectPlants>({
    recent: [],
    popular: [],
    verified: [],
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update search query when selectedPlant changes (for editing)
  useEffect(() => {
    if (selectedPlant) {
      setSearchState(prev => ({
        ...prev,
        query: selectedPlant.commonName || '',
      }));
    }
  }, [selectedPlant]);

  // Search function (will be debounced)
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchState(prev => ({
        ...prev,
        results: [],
        isLoading: false,
        hasSearched: false,
      }));
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      // Clear any pending loading delay
      if (loadingDelayRef.current) {
        clearTimeout(loadingDelayRef.current);
      }
      setSearchState(prev => ({ ...prev, isLoading: true }));

      const response = await fetch(
        `/api/plants/search?q=${encodeURIComponent(query)}&limit=10`,
        {
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Handle different response formats
      let plants: PlantSuggestion[] = [];
      if (data.success && data.data?.plants) {
        plants = data.data.plants;
      } else if (data.data?.plants) {
        plants = data.data.plants;
      } else if (data.plants) {
        plants = data.plants;
      } else if (Array.isArray(data)) {
        plants = data;
      }
      
      setSearchState(prev => ({
        ...prev,
        results: plants,
        isLoading: false,
        hasSearched: true,
        selectedIndex: -1,
      }));
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Search error:', error);
        setSearchState(prev => ({
          ...prev,
          results: [],
          isLoading: false,
          hasSearched: true,
        }));
      }
    }
  }, []);

  // Custom debounce hook for better React performance
  const debouncedSearchRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const loadingDelayRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  const debouncedSearch = useCallback((query: string) => {
    if (debouncedSearchRef.current) {
      clearTimeout(debouncedSearchRef.current);
    }
    if (loadingDelayRef.current) {
      clearTimeout(loadingDelayRef.current);
    }
    
    // Show loading state only after a delay to avoid flickering during fast typing
    loadingDelayRef.current = setTimeout(() => {
      setSearchState(prev => ({ ...prev, isLoading: true }));
    }, 200);
    
    debouncedSearchRef.current = setTimeout(() => {
      if (loadingDelayRef.current) {
        clearTimeout(loadingDelayRef.current);
      }
      performSearch(query);
    }, 500);
  }, [performSearch]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (debouncedSearchRef.current) {
        clearTimeout(debouncedSearchRef.current);
      }
      if (loadingDelayRef.current) {
        clearTimeout(loadingDelayRef.current);
      }
    };
  }, []);

  // Load quick select data on mount
  useEffect(() => {
    if (showQuickSelect) {
      fetch('/api/plants/suggestions?type=quick')
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          if (data.success && data.data?.quickSelect) {
            setQuickSelect(data.data.quickSelect);
          } else if (data.quickSelect) {
            setQuickSelect(data.quickSelect);
          }
        })
        .catch(error => console.error('Failed to load quick select:', error));
    }
  }, [showQuickSelect]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;

    // Immediately update the input value for responsive typing
    setSearchState(prev => ({
      ...prev,
      query,
      showDropdown: query.length > 0,
    }));

    // Only clear selection if the field is completely empty
    // This prevents clearing when user is just typing to search for a different plant
    if (query.trim() === '') {
      onSelect(null);
    }

    // Only search if query is long enough, and only via debounced function
    if (query.length >= 2) {
      debouncedSearch(query);
    } else {
      // Clear results immediately for short queries
      setSearchState(prev => ({
        ...prev,
        results: [],
        isLoading: false,
        hasSearched: false,
      }));
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    setSearchState(prev => ({
      ...prev,
      showDropdown: true,
    }));
  };

  // Handle input blur (with delay to allow clicks)
  const handleInputBlur = () => {
    setTimeout(() => {
      setSearchState(prev => ({
        ...prev,
        showDropdown: false,
        selectedIndex: -1,
      }));
    }, 150);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const { results, selectedIndex, showDropdown } = searchState;
    
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSearchState(prev => ({
          ...prev,
          selectedIndex: Math.min(selectedIndex + 1, results.length),
        }));
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSearchState(prev => ({
          ...prev,
          selectedIndex: Math.max(selectedIndex - 1, -1),
        }));
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelectPlant(results[selectedIndex]);
        } else if (selectedIndex === results.length) {
          handleAddNew();
        }
        break;
      
      case 'Escape':
        setSearchState(prev => ({
          ...prev,
          showDropdown: false,
          selectedIndex: -1,
        }));
        inputRef.current?.blur();
        break;
    }
  };

  // Handle plant selection
  const handleSelectPlant = (plant: PlantSuggestion) => {
    setSearchState(prev => ({
      ...prev,
      query: plant.commonName,
      showDropdown: false,
      selectedIndex: -1,
    }));
    onSelect(plant);
  };

  // Handle add new plant
  const handleAddNew = () => {
    setSearchState(prev => ({
      ...prev,
      showDropdown: false,
    }));
    onAddNew(searchState.query);
  };

  // Get display items for dropdown
  const getDropdownItems = () => {
    const items: Array<{
      type: 'plant' | 'add-new' | 'section-header';
      data?: PlantSuggestion;
      label?: string;
      plants?: PlantSuggestion[];
    }> = [];

    // Show search results if we have a query
    if (searchState.query.length >= 2) {
      if (searchState.isLoading) {
        return [{ type: 'section-header' as const, label: 'Searching...' }];
      }

      if (searchState.results.length > 0) {
        searchState.results.forEach(plant => {
          items.push({ type: 'plant', data: plant });
        });
      } else if (searchState.hasSearched) {
        items.push({ type: 'section-header', label: 'No plants found' });
      }

      // Always show "Add new" option when searching
      if (searchState.query.trim()) {
        items.push({ type: 'add-new', label: `Add "${searchState.query}" as new plant` });
      }
    } else if (showQuickSelect && !searchState.query) {
      // Show quick select options when no query
      if (quickSelect.recent.length > 0) {
        items.push({ type: 'section-header', label: 'Recently Used' });
        quickSelect.recent.slice(0, 3).forEach(plant => {
          items.push({ type: 'plant', data: plant });
        });
      }

      if (quickSelect.popular.length > 0) {
        items.push({ type: 'section-header', label: 'Popular Plants' });
        quickSelect.popular.slice(0, 5).forEach(plant => {
          items.push({ type: 'plant', data: plant });
        });
      }

      if (quickSelect.verified.length > 0) {
        items.push({ type: 'section-header', label: 'Verified Plants' });
        quickSelect.verified.slice(0, 5).forEach(plant => {
          items.push({ type: 'plant', data: plant });
        });
      }
    }

    return items;
  };

  const dropdownItems = getDropdownItems();

  return (
    <div className={`relative ${className}`}>
      {/* Input Field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchState.query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || searchState.isLoading}
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={searchState.showDropdown}
          aria-controls="plant-search-listbox"
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-describedby={selectedPlant ? 'selected-plant-indicator' : undefined}
          className={`
            w-full px-4 py-3 text-base text-gray-900 placeholder-gray-500 border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-300
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${selectedPlant ? 'border-primary-300 bg-primary-50' : 'border-gray-300 bg-white'}
            ${searchState.isLoading ? 'pr-10 bg-gray-50' : ''}
          `}
        />
        
        {/* Loading Spinner */}
        {searchState.isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div 
              className="animate-spin h-5 w-5 border-2 border-primary-300 border-t-transparent rounded-full"
              role="status"
              aria-label="Searching for plants"
            ></div>
            <span className="sr-only">Searching for plants...</span>
          </div>
        )}

        {/* Selected Plant Indicator */}
        {selectedPlant && !searchState.isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div 
              id="selected-plant-indicator"
              className="h-5 w-5 bg-primary-400 rounded-full flex items-center justify-center"
              title="Selected plant"
              role="status"
              aria-label="Plant selected"
            >
              <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {searchState.showDropdown && dropdownItems.length > 0 && (
        <div
          ref={dropdownRef}
          id="plant-search-listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
          role="listbox"
          aria-label="Plant search results"
        >
          {dropdownItems.map((item, index) => {
            if (item.type === 'section-header') {
              return (
                <div
                  key={`header-${index}`}
                  className="px-4 py-2 text-sm font-medium text-gray-500 bg-gray-50 border-b border-gray-100"
                  role="status"
                  aria-live="polite"
                >
                  {item.label}
                </div>
              );
            }

            if (item.type === 'add-new') {
              const isSelected = searchState.selectedIndex === index;
              return (
                <button
                  key={`add-new-${index}`}
                  onClick={handleAddNew}
                  role="option"
                  aria-selected={isSelected}
                  className={`
                    w-full px-4 py-3 text-left hover:bg-secondary-50 border-b border-gray-100 last:border-b-0
                    flex items-center space-x-3
                    ${isSelected ? 'bg-secondary-100' : ''}
                  `}
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-secondary-200 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-secondary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-secondary-700">
                      {item.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      Create a new plant type
                    </div>
                  </div>
                </button>
              );
            }

            if (item.type === 'plant' && item.data) {
              const plant = item.data;
              const isSelected = searchState.selectedIndex === index;
              
              return (
                <button
                  key={`plant-${index}`}
                  onClick={() => handleSelectPlant(plant)}
                  role="option"
                  aria-selected={isSelected}
                  className={`
                    w-full px-4 py-3 text-left hover:bg-primary-50 border-b border-gray-100 last:border-b-0
                    ${isSelected ? 'bg-primary-100' : ''}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {plant.commonName}
                        </span>
                        {plant.isVerified && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                            Verified
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 italic truncate">
                        {plant.genus} {plant.species}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        Family: {plant.family}
                      </div>
                    </div>
                    
                    {/* Match indicators */}
                    {plant.matchedFields && plant.matchedFields.length > 0 && (
                      <div className="flex-shrink-0 ml-2">
                        <div className="flex space-x-1">
                          {plant.matchedFields.includes('commonName') && (
                            <span className="inline-block w-2 h-2 bg-primary-400 rounded-full" title="Common name match" />
                          )}
                          {plant.matchedFields.includes('genus') && (
                            <span className="inline-block w-2 h-2 bg-tertiary-400 rounded-full" title="Genus match" />
                          )}
                          {plant.matchedFields.includes('species') && (
                            <span className="inline-block w-2 h-2 bg-secondary-400 rounded-full" title="Species match" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
}