import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PlantsGrid from '../PlantsGrid';
import { createMockPlantInstance } from '@/test-utils/helpers';

// Mock the child components
jest.mock('../PlantCard', () => {
  return function MockPlantCard({ plant, onSelect, onCareAction, isSelected, isSelectionMode }: any) {
    return (
      <div data-testid={`plant-card-${plant.id}`}>
        <div>Plant: {plant.nickname}</div>
        <div>Care Status: {plant.careStatus}</div>
        {isSelected && <div data-testid="selected-indicator">Selected</div>}
        {isSelectionMode && <div data-testid="selection-mode">Selection Mode</div>}
        <button
          onClick={() => onSelect(plant)}
          data-testid={`select-plant-${plant.id}`}
        >
          Select Plant
        </button>
        <button
          onClick={() => onCareAction(plant, 'fertilize')}
          data-testid={`care-action-${plant.id}`}
        >
          Care Action
        </button>
      </div>
    );
  };
});

jest.mock('../PlantSearchFilter', () => {
  return function MockPlantSearchFilter({
    onSearch,
    onFilterChange,
    onSortChange,
    onAdvancedSearch
  }: any) {
    return (
      <div data-testid="plant-search-filter">
        <input
          placeholder="Search plants..."
          onChange={(e) => onSearch(e.target.value)}
          data-testid="search-input"
        />
        <button
          onClick={() => onFilterChange({ overdueOnly: true })}
          data-testid="overdue-filter"
        >
          Show Overdue Only
        </button>
        <button
          onClick={() => onSortChange('created_at', 'desc')}
          data-testid="sort-button"
        >
          Sort by Date
        </button>
        <button
          onClick={() => onAdvancedSearch({ query: 'test' })}
          data-testid="advanced-search"
        >
          Advanced Search
        </button>
      </div>
    );
  };
});

jest.mock('../PlantCardSkeleton', () => {
  return function MockPlantCardSkeleton() {
    return <div data-testid="plant-card-skeleton">Loading...</div>;
  };
});

jest.mock('@/components/shared/PullToRefreshIndicator', () => {
  return {
    PullToRefreshIndicator: function MockPullToRefreshIndicator() {
      return <div data-testid="pull-to-refresh">Pull to refresh</div>;
    },
  };
});

// Mock hooks
jest.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: jest.fn(() => ({
    elementRef: { current: null },
    isRefreshing: false,
    isPulling: false,
    progress: 0,
    getRefreshIndicatorStyle: () => ({}),
  })),
}));

jest.mock('@/hooks/useHapticFeedback', () => ({
  useHapticFeedback: jest.fn(() => ({
    triggerHaptic: jest.fn(),
  })),
}));

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('PlantsGrid', () => {
  const mockOnPlantSelect = jest.fn();
  const mockOnCareAction = jest.fn();
  const mockOnBulkAction = jest.fn();

  const defaultProps = {
    userId: 1,
    onPlantSelect: mockOnPlantSelect,
    onCareAction: mockOnCareAction,
    onBulkAction: mockOnBulkAction,
  };

  const mockPlantsResponse = {
    success: true,
    data: {
      instances: [
        createMockPlantInstance({ id: 1, nickname: 'Plant 1' }),
        createMockPlantInstance({ id: 2, nickname: 'Plant 2' }),
        createMockPlantInstance({ id: 3, nickname: 'Plant 3' }),
      ],
      totalCount: 3,
      hasMore: false,
      searchTime: 50,
      filters: {
        userId: 1,
        overdueOnly: false,
        isActive: true,
        limit: 20,
        offset: 0,
      },
    },
  };

  const mockLocationsResponse = [
    'Living Room',
    'Kitchen',
    'Bedroom',
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  it('renders plants grid with data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPlantsResponse,
    } as Response);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockLocationsResponse,
    } as Response);

    render(<PlantsGrid {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('plant-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('plant-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('plant-card-3')).toBeInTheDocument();
    });
  });

  it('shows loading skeletons while fetching data', () => {
    mockFetch.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<PlantsGrid {...defaultProps} />, { wrapper: createWrapper() });

    expect(screen.getAllByTestId('plant-card-skeleton')).toHaveLength(6);
  });

  it('handles plant selection', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockPlantsResponse,
    } as Response);

    render(<PlantsGrid {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('plant-card-1')).toBeInTheDocument();
    });

    const selectButton = screen.getByTestId('select-plant-1');
    fireEvent.click(selectButton);

    expect(mockOnPlantSelect).toHaveBeenCalledWith(mockPlantsResponse.data.instances[0]);
  });

  it('handles care actions', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockPlantsResponse,
    } as Response);

    render(<PlantsGrid {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('plant-card-1')).toBeInTheDocument();
    });

    const careButton = screen.getByTestId('care-action-1');
    fireEvent.click(careButton);

    expect(mockOnCareAction).toHaveBeenCalledWith(mockPlantsResponse.data.instances[0], 'fertilize');
  });

  it('handles search functionality', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockPlantsResponse,
    } as Response);

    render(<PlantsGrid {...defaultProps} showSearch={true} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('plant-search-filter')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('search-input');
    await user.type(searchInput, 'monstera');

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/plant-instances/search'),
        expect.any(Object)
      );
    });
  });

  it('handles filter changes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockPlantsResponse,
    } as Response);

    render(<PlantsGrid {...defaultProps} showFilters={true} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('plant-search-filter')).toBeInTheDocument();
    });

    const overdueFilter = screen.getByTestId('overdue-filter');
    fireEvent.click(overdueFilter);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('overdueOnly=true'),
        expect.any(Object)
      );
    });
  });

  it('handles sort changes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockPlantsResponse,
    } as Response);

    render(<PlantsGrid {...defaultProps} showFilters={true} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('plant-search-filter')).toBeInTheDocument();
    });

    const sortButton = screen.getByTestId('sort-button');
    fireEvent.click(sortButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sortBy=created_at'),
        expect.any(Object)
      );
    });
  });

  it('handles advanced search', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockPlantsResponse,
        data: {
          ...mockPlantsResponse.data,
          searchResults: mockPlantsResponse.data.instances,
        },
      }),
    } as Response);

    render(<PlantsGrid {...defaultProps} showAdvancedSearch={true} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('plant-search-filter')).toBeInTheDocument();
    });

    const advancedSearchButton = screen.getByTestId('advanced-search');
    fireEvent.click(advancedSearchButton);

    await waitFor(() => {
      expect(screen.getByTestId('plant-card-1')).toBeInTheDocument();
    });
  });

  it('handles empty state', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          instances: [],
          totalCount: 0,
          hasMore: false,
          searchTime: 10,
          filters: defaultProps,
        },
      }),
    } as Response);

    render(<PlantsGrid {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/No plants found/i)).toBeInTheDocument();
    });
  });

  it('handles error state', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<PlantsGrid {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('supports selection mode', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockPlantsResponse,
    } as Response);

    render(<PlantsGrid {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('plant-card-1')).toBeInTheDocument();
    });

    // Long press to enter selection mode (simulated by clicking select twice)
    const selectButton = screen.getByTestId('select-plant-1');
    fireEvent.click(selectButton);
    fireEvent.click(selectButton);

    await waitFor(() => {
      expect(screen.getByTestId('selection-mode')).toBeInTheDocument();
    });
  });

  it('handles infinite scroll', async () => {
    const firstPageResponse = {
      ...mockPlantsResponse,
      data: {
        ...mockPlantsResponse.data,
        hasMore: true,
      },
    };

    const secondPageResponse = {
      ...mockPlantsResponse,
      data: {
        ...mockPlantsResponse.data,
        instances: [
          createMockPlantInstance({ id: 4, nickname: 'Plant 4' }),
          createMockPlantInstance({ id: 5, nickname: 'Plant 5' }),
        ],
        hasMore: false,
      },
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => firstPageResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockLocationsResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => secondPageResponse,
      } as Response);

    render(<PlantsGrid {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('plant-card-1')).toBeInTheDocument();
    });

    // Simulate scroll to bottom
    const scrollEvent = new Event('scroll');
    Object.defineProperty(window, 'innerHeight', { value: 800 });
    Object.defineProperty(document.documentElement, 'scrollTop', { value: 1000 });
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 1200 });

    window.dispatchEvent(scrollEvent);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  it('handles different card sizes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockPlantsResponse,
    } as Response);

    const { rerender } = render(
      <PlantsGrid {...defaultProps} cardSize="small" />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByTestId('plant-card-1')).toBeInTheDocument();
    });

    rerender(
      <PlantsGrid {...defaultProps} cardSize="large" />
    );

    expect(screen.getByTestId('plant-card-1')).toBeInTheDocument();
  });

  it('applies initial filters correctly', async () => {
    const initialFilters = {
      location: 'Kitchen',
      overdueOnly: true,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockPlantsResponse,
    } as Response);

    render(
      <PlantsGrid {...defaultProps} initialFilters={initialFilters} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('location=Kitchen'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('overdueOnly=true'),
        expect.any(Object)
      );
    });
  });

  it('handles pull to refresh', async () => {
    const mockUsePullToRefresh = require('@/hooks/usePullToRefresh').usePullToRefresh;
    mockUsePullToRefresh.mockReturnValue({
      isPulling: true,
      pullDistance: 50,
      canRefresh: true,
      isRefreshing: false,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockPlantsResponse,
    } as Response);

    render(<PlantsGrid {...defaultProps} />, { wrapper: createWrapper() });

    expect(screen.getByTestId('pull-to-refresh')).toBeInTheDocument();
  });

  it('shows correct grid layout based on screen size', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockPlantsResponse,
    } as Response);

    render(<PlantsGrid {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      const gridContainer = screen.getByTestId('plant-card-1').closest('div');
      expect(gridContainer).toHaveClass('p-4');
    });
  });
});