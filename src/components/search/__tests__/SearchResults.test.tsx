import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchResults from '../SearchResults';
import type { 
  AdvancedSearchResult,
  EnhancedPlantInstance,
  SearchFacets 
} from '@/lib/types/plant-instance-types';

// Mock PlantCard component
jest.mock('@/components/plants/PlantCard', () => {
  return function MockPlantCard({ plant, onSelect }: any) {
    return (
      <div 
        data-testid={`plant-card-${plant.id}`}
        onClick={() => onSelect?.(plant)}
      >
        {plant.nickname} - {plant.plant.commonName}
      </div>
    );
  };
});

describe('SearchResults', () => {
  const mockPlant: EnhancedPlantInstance = {
    id: 1,
    userId: 1,
    plantId: 1,
    nickname: 'My Monstera',
    location: 'Living Room',
    fertilizerSchedule: '2 weeks',
    lastFertilized: null,
    fertilizerDue: null,
    lastRepot: null,
    notes: null,
    images: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    plant: {
      id: 1,
      family: 'Araceae',
      genus: 'Monstera',
      species: 'deliciosa',
      commonName: 'Monstera Deliciosa',
      careInstructions: null,
      defaultImage: null,
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    careStatus: 'healthy',
    careUrgency: 'none',
    daysUntilFertilizerDue: null,
    daysSinceLastFertilized: null,
    daysSinceLastRepot: null,
    displayName: 'My Monstera',
    primaryImage: null,
  };

  const mockFacets: SearchFacets = {
    locations: [
      { value: 'Living Room', count: 3 },
      { value: 'Bedroom', count: 2 },
    ],
    plantTypes: [
      { value: 'Monstera Deliciosa', count: 2, plantId: 1 },
      { value: 'Pothos', count: 1, plantId: 2 },
    ],
    careStatus: [
      { value: 'healthy', count: 2 },
      { value: 'overdue', count: 1 },
    ],
    dateRanges: [],
  };

  const mockResults: AdvancedSearchResult = {
    searchId: 'test-search-id',
    searchType: 'advanced',
    instances: [mockPlant],
    totalCount: 1,
    hasMore: false,
    searchTime: 25,
    suggestions: ['monstera care', 'plant watering'],
    relatedSearches: ['monstera deliciosa', 'indoor plants'],
    databaseTime: 15,
    processingTime: 10,
    facets: mockFacets,
    filters: {
      userId: 1,
      limit: 20,
      offset: 0,
    },
  };

  const mockOnPlantSelect = jest.fn();
  const mockOnLoadMore = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    render(
      <SearchResults
        results={null}
        isLoading={true}
        onPlantSelect={mockOnPlantSelect}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders empty state when no results', () => {
    render(
      <SearchResults
        results={null}
        isLoading={false}
        onPlantSelect={mockOnPlantSelect}
      />
    );

    expect(screen.getByText('Start searching')).toBeInTheDocument();
    expect(screen.getByText('Enter a search term to find your plants')).toBeInTheDocument();
  });

  it('renders no results found state', () => {
    const emptyResults = {
      ...mockResults,
      instances: [],
      totalCount: 0,
    };

    render(
      <SearchResults
        results={emptyResults}
        isLoading={false}
        onPlantSelect={mockOnPlantSelect}
      />
    );

    expect(screen.getByText('No plants found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search terms or filters')).toBeInTheDocument();
  });

  it('renders search results with stats', () => {
    render(
      <SearchResults
        results={mockResults}
        isLoading={false}
        onPlantSelect={mockOnPlantSelect}
        showStats={true}
      />
    );

    expect(screen.getByText('1 of 1 plants')).toBeInTheDocument();
    expect(screen.getByText('(25ms)')).toBeInTheDocument();
    expect(screen.getByText('advanced')).toBeInTheDocument();
  });

  it('renders plant cards', () => {
    render(
      <SearchResults
        results={mockResults}
        isLoading={false}
        onPlantSelect={mockOnPlantSelect}
      />
    );

    expect(screen.getByTestId('plant-card-1')).toBeInTheDocument();
    expect(screen.getByText('My Monstera - Monstera Deliciosa')).toBeInTheDocument();
  });

  it('handles plant selection', async () => {
    const user = userEvent.setup();

    render(
      <SearchResults
        results={mockResults}
        isLoading={false}
        onPlantSelect={mockOnPlantSelect}
      />
    );

    await user.click(screen.getByTestId('plant-card-1'));

    expect(mockOnPlantSelect).toHaveBeenCalledWith(mockPlant);
  });

  it('renders search facets when enabled', () => {
    render(
      <SearchResults
        results={mockResults}
        isLoading={false}
        onPlantSelect={mockOnPlantSelect}
        showFacets={true}
      />
    );

    expect(screen.getByText('Filter Results')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Plant Type')).toBeInTheDocument();
    expect(screen.getByText('Care Status')).toBeInTheDocument();
  });

  it('handles facet selection', async () => {
    const user = userEvent.setup();

    render(
      <SearchResults
        results={mockResults}
        isLoading={false}
        onPlantSelect={mockOnPlantSelect}
        showFacets={true}
      />
    );

    // Click on a location facet
    await user.click(screen.getByText('Living Room'));

    // Should filter results (in this case, the plant should still be visible)
    expect(screen.getByTestId('plant-card-1')).toBeInTheDocument();
  });

  it('shows clear filters button when facets are selected', async () => {
    const user = userEvent.setup();

    render(
      <SearchResults
        results={mockResults}
        isLoading={false}
        onPlantSelect={mockOnPlantSelect}
        showFacets={true}
        showStats={true}
      />
    );

    // Select a facet
    await user.click(screen.getByText('Living Room'));

    expect(screen.getByText(/Clear filters \(1\)/)).toBeInTheDocument();
  });

  it('clears facets when clear button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <SearchResults
        results={mockResults}
        isLoading={false}
        onPlantSelect={mockOnPlantSelect}
        showFacets={true}
        showStats={true}
      />
    );

    // Select a facet
    await user.click(screen.getByText('Living Room'));
    
    // Clear facets
    await user.click(screen.getByText(/Clear filters/));

    // Clear button should be gone
    expect(screen.queryByText(/Clear filters/)).not.toBeInTheDocument();
  });

  it('renders search suggestions', () => {
    render(
      <SearchResults
        results={mockResults}
        isLoading={false}
        onPlantSelect={mockOnPlantSelect}
      />
    );

    expect(screen.getByText('Suggestions')).toBeInTheDocument();
    expect(screen.getByText('monstera care')).toBeInTheDocument();
    expect(screen.getByText('plant watering')).toBeInTheDocument();
  });

  it('renders related searches', () => {
    render(
      <SearchResults
        results={mockResults}
        isLoading={false}
        onPlantSelect={mockOnPlantSelect}
      />
    );

    expect(screen.getByText('Related Searches')).toBeInTheDocument();
    expect(screen.getByText('monstera deliciosa')).toBeInTheDocument();
    expect(screen.getByText('indoor plants')).toBeInTheDocument();
  });

  it('shows load more button when hasMore is true', () => {
    const resultsWithMore = {
      ...mockResults,
      hasMore: true,
    };

    render(
      <SearchResults
        results={resultsWithMore}
        isLoading={false}
        onPlantSelect={mockOnPlantSelect}
        onLoadMore={mockOnLoadMore}
      />
    );

    expect(screen.getByText('Load More')).toBeInTheDocument();
  });

  it('handles load more button click', async () => {
    const user = userEvent.setup();
    const resultsWithMore = {
      ...mockResults,
      hasMore: true,
    };

    render(
      <SearchResults
        results={resultsWithMore}
        isLoading={false}
        onPlantSelect={mockOnPlantSelect}
        onLoadMore={mockOnLoadMore}
      />
    );

    await user.click(screen.getByText('Load More'));

    expect(mockOnLoadMore).toHaveBeenCalled();
  });

  it('disables load more button when loading', () => {
    const resultsWithMore = {
      ...mockResults,
      hasMore: true,
    };

    render(
      <SearchResults
        results={resultsWithMore}
        isLoading={true}
        onPlantSelect={mockOnPlantSelect}
        onLoadMore={mockOnLoadMore}
      />
    );

    expect(screen.getByText('Loading...')).toBeDisabled();
  });

  it('filters results based on selected facets', async () => {
    const user = userEvent.setup();
    const multiPlantResults = {
      ...mockResults,
      instances: [
        mockPlant,
        {
          ...mockPlant,
          id: 2,
          nickname: 'Bedroom Plant',
          location: 'Bedroom',
        },
      ],
      totalCount: 2,
    };

    render(
      <SearchResults
        results={multiPlantResults}
        isLoading={false}
        onPlantSelect={mockOnPlantSelect}
        showFacets={true}
      />
    );

    // Initially both plants should be visible
    expect(screen.getByTestId('plant-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('plant-card-2')).toBeInTheDocument();

    // Filter by Living Room
    await user.click(screen.getByText('Living Room'));

    // Only the living room plant should be visible
    expect(screen.getByTestId('plant-card-1')).toBeInTheDocument();
    expect(screen.queryByTestId('plant-card-2')).not.toBeInTheDocument();
  });

  it('handles highlight terms correctly', () => {
    render(
      <SearchResults
        results={mockResults}
        isLoading={false}
        onPlantSelect={mockOnPlantSelect}
        highlightTerms={['monstera', 'plant']}
      />
    );

    // Plant card should be rendered (highlighting would be handled by PlantCard)
    expect(screen.getByTestId('plant-card-1')).toBeInTheDocument();
  });
});