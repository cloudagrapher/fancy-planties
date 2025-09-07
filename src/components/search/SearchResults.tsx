'use client';

import { useState, useMemo } from 'react';
import PlantCard from '@/components/plants/PlantCard';
import type { 
  AdvancedSearchResult,
  EnhancedPlantInstance,
  SearchFacets 
} from '@/lib/types/plant-instance-types';

interface SearchResultsProps {
  results: AdvancedSearchResult | null;
  isLoading?: boolean;
  onLoadMore?: () => void;
  onPlantSelect?: (plant: EnhancedPlantInstance) => void;
  showFacets?: boolean;
  showStats?: boolean;
  highlightTerms?: string[];
}

export default function SearchResults({
  results,
  isLoading = false,
  onLoadMore,
  onPlantSelect,
  showFacets = true,
  showStats = true,
  highlightTerms = [],
}: SearchResultsProps) {
  const [selectedFacets, setSelectedFacets] = useState<{
    location?: string;
    plantType?: string;
    careStatus?: string;
  }>({});

  // Filter results based on selected facets
  const filteredResults = useMemo(() => {
    if (!results?.instances) return [];

    let filtered = results.instances;

    if (selectedFacets.location) {
      filtered = filtered.filter(plant => 
        plant.location.toLowerCase().includes(selectedFacets.location!.toLowerCase())
      );
    }

    if (selectedFacets.plantType) {
      filtered = filtered.filter(plant => 
        plant.plant.commonName.toLowerCase().includes(selectedFacets.plantType!.toLowerCase())
      );
    }

    if (selectedFacets.careStatus) {
      filtered = filtered.filter(plant => plant.careStatus === selectedFacets.careStatus);
    }

    return filtered;
  }, [results?.instances, selectedFacets]);

  // Handle facet selection
  const handleFacetSelect = (facetType: string, value: string) => {
    setSelectedFacets(prev => ({
      ...prev,
      [facetType]: prev[facetType as keyof typeof prev] === value ? undefined : value,
    }));
  };

  // Clear all facets
  const clearFacets = () => {
    setSelectedFacets({});
  };

  // Highlight text helper
  const highlightText = (text: string, terms: string[]) => {
    if (!terms.length) return text;
    
    let highlighted = text;
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
    });
    
    return highlighted;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Loading skeleton */}
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-48"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="text-center py-8">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Start searching</h3>
        <p className="mt-1 text-sm text-gray-500">
          Enter a search term to find your plants
        </p>
      </div>
    );
  }

  if (results.instances.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No plants found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Try adjusting your search terms or filters
        </p>
      </div>
    );
  }

  const activeFacetCount = Object.values(selectedFacets).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Search Stats */}
      {showStats && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>
              {filteredResults.length} of {results.totalCount} plants
            </span>
            {results.searchTime && (
              <span>
                ({results.searchTime}ms)
              </span>
            )}
            {results.searchType && (
              <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                {results.searchType}
              </span>
            )}
          </div>
          
          {activeFacetCount > 0 && (
            <button
              onClick={clearFacets}
              className="btn btn--ghost btn--sm"
            >
              Clear filters ({activeFacetCount})
            </button>
          )}
        </div>
      )}

      {/* Search Facets */}
      {showFacets && results.facets && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Filter Results</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Location Facets */}
            {results.facets.locations.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-2">Location</h4>
                <div className="space-y-1">
                  {results.facets.locations.slice(0, 5).map((facet) => (
                    <button
                      key={facet.value}
                      onClick={() => handleFacetSelect('location', facet.value)}
                      className={`
                        w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between
                        ${selectedFacets.location === facet.value
                          ? 'bg-primary-100 text-primary-800'
                          : 'hover:bg-gray-100'
                        }
                      `}
                    >
                      <span>{facet.value}</span>
                      <span className="text-gray-500">({facet.count})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Plant Type Facets */}
            {results.facets.plantTypes.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-2">Plant Type</h4>
                <div className="space-y-1">
                  {results.facets.plantTypes.slice(0, 5).map((facet) => (
                    <button
                      key={facet.value}
                      onClick={() => handleFacetSelect('plantType', facet.value)}
                      className={`
                        w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between
                        ${selectedFacets.plantType === facet.value
                          ? 'bg-primary-100 text-primary-800'
                          : 'hover:bg-gray-100'
                        }
                      `}
                    >
                      <span>{facet.value}</span>
                      <span className="text-gray-500">({facet.count})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Care Status Facets */}
            {results.facets.careStatus.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-2">Care Status</h4>
                <div className="space-y-1">
                  {results.facets.careStatus.map((facet) => (
                    <button
                      key={facet.value}
                      onClick={() => handleFacetSelect('careStatus', facet.value)}
                      className={`
                        w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between
                        ${selectedFacets.careStatus === facet.value
                          ? 'bg-primary-100 text-primary-800'
                          : 'hover:bg-gray-100'
                        }
                      `}
                    >
                      <span className="capitalize">{facet.value.replace('_', ' ')}</span>
                      <span className="text-gray-500">({facet.count})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search Suggestions */}
      {results.suggestions && results.suggestions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Suggestions</h4>
          <div className="flex flex-wrap gap-2">
            {results.suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredResults.map((plant) => (
          <div key={plant.id} className="relative">
            <PlantCard
              plant={plant}
              onSelect={() => onPlantSelect?.(plant)}
              showCareStatus={true}
              size="medium"
            />
            
            {/* Highlight overlay for search matches */}
            {highlightTerms.length > 0 && (
              <div className="absolute inset-0 pointer-events-none">
                {/* This would contain highlighted text overlays */}
                {/* Implementation would depend on specific highlighting needs */}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {results.hasMore && onLoadMore && (
        <div className="text-center pt-4">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className={`btn btn--primary ${isLoading ? 'btn--loading' : ''}`}
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {/* Related Searches */}
      {results.relatedSearches && results.relatedSearches.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Related Searches</h4>
          <div className="flex flex-wrap gap-2">
            {results.relatedSearches.map((search, index) => (
              <button
                key={index}
                className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}