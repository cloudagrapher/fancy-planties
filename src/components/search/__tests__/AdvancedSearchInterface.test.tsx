import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdvancedSearchInterface from '../AdvancedSearchInterface';
import type { EnhancedPlantInstanceFilter } from '@/lib/validation/plant-schemas';

// Mock fetch
global.fetch = jest.fn();

// Mock the search service
jest.mock('@/lib/services/advanced-search', () => ({
  advancedSearchService: {
    multiFieldSearch: jest.fn(),
    smartSearch: jest.fn(),
    getSearchSuggestions: jest.fn(),
  },
}));

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

describe('AdvancedSearchInterface', () => {
  const mockOnResults = jest.fn();
  const mockOnFiltersChange = jest.fn();

  const defaultProps = {
    onResults: mockOnResults,
    onFiltersChange: mockOnFiltersChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  it('renders search input with placeholder', () => {
    render(
      <AdvancedSearchInterface
        {...defaultProps}
        placeholder="Search your plants..."
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByPlaceholderText('Search your plants...')).toBeInTheDocument();
  });

  it('shows advanced search toggle', () => {
    render(<AdvancedSearchInterface {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  it('handles search input with debouncing', async () => {
    const user = userEvent.setup();
    
    // Mock all API calls that will be made
    mockFetch
      // Presets API (called on mount)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { presets: [] } }),
      } as Response)
      // Suggestions API (called when typing reaches 2+ characters)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { suggestions: [] } }),
      } as Response)
      // History API (called when suggestions are shown)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { history: [] } }),
      } as Response)
      // Smart search API (called after debounce)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            searchId: 'test-id',
            searchType: 'smart',
            instances: [],
            totalCount: 0,
            hasMore: false,
            suggestions: [],
            relatedSearches: [],
            databaseTime: 10,
            processingTime: 5,
          },
        }),
      } as Response);

    render(<AdvancedSearchInterface {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const searchInput = screen.getByPlaceholderText('Search plants...');
    
    // Type the full word at once to ensure it completes
    await user.clear(searchInput);
    await user.paste('monstera');

    // Wait for debounced search
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/search/smart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('monstera'),
      });
    }, { timeout: 1500 });
  });

  it('shows search suggestions when available', async () => {
    // Mock presets API
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { presets: [] } }),
    } as Response);

    // Mock suggestions API
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          suggestions: ['monstera deliciosa', 'monstera adansonii'],
        },
      }),
    } as Response);

    // Mock history API
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { history: [] } }),
    } as Response);

    const user = userEvent.setup();

    render(<AdvancedSearchInterface {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const searchInput = screen.getByPlaceholderText('Search plants...');
    
    // Clear and type to ensure clean state
    await user.clear(searchInput);
    await user.type(searchInput, 'mon');

    // Wait for the query to complete and suggestions to appear
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search/suggestions?query=mo')
      );
    });

    // Check if suggestion items appear
    await waitFor(() => {
      expect(screen.getByText('monstera deliciosa')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('handles suggestion selection', async () => {
    // Mock presets API
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { presets: [] } }),
    } as Response);

    // Mock suggestions API
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { suggestions: ['monstera deliciosa'] },
      }),
    } as Response);

    // Mock history API
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { history: [] } }),
    } as Response);

    // Mock smart search API for debounced search (will be triggered by typing)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          searchId: 'debounced-search',
          searchType: 'smart',
          instances: [],
          totalCount: 0,
          hasMore: false,
          suggestions: [],
          relatedSearches: [],
          databaseTime: 10,
          processingTime: 5,
        },
      }),
    } as Response);

    // Mock smart search API for when suggestion is selected
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          searchId: 'suggestion-search',
          searchType: 'smart',
          instances: [],
          totalCount: 0,
          hasMore: false,
          suggestions: [],
          relatedSearches: [],
          databaseTime: 10,
          processingTime: 5,
        },
      }),
    } as Response);

    const user = userEvent.setup();

    render(<AdvancedSearchInterface {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const searchInput = screen.getByPlaceholderText('Search plants...');
    
    // Clear and type to ensure clean state
    await user.clear(searchInput);
    await user.type(searchInput, 'mon');

    // Wait for suggestions to load
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search/suggestions?query=mo')
      );
    });

    // Check if suggestion appears
    await waitFor(() => {
      expect(screen.getByText('monstera deliciosa')).toBeInTheDocument();
    }, { timeout: 2000 });

    await user.click(screen.getByText('monstera deliciosa'));

    // Wait for the suggestion selection to trigger the search
    await waitFor(() => {
      expect(mockOnResults).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('shows advanced search panel when toggled', async () => {
    const user = userEvent.setup();

    render(<AdvancedSearchInterface {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const advancedButton = screen.getByText('Advanced');
    await user.click(advancedButton);

    expect(screen.getByText('Advanced Search')).toBeInTheDocument();
  });

  it('handles filter changes in advanced panel', async () => {
    const user = userEvent.setup();

    render(<AdvancedSearchInterface {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    // Open advanced panel
    await user.click(screen.getByText('Advanced'));

    // Find and interact with location filter
    const locationInput = screen.getByPlaceholderText('Enter location...');
    await user.type(locationInput, 'living room');

    await waitFor(() => {
      expect(mockOnFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          location: 'living room',
        })
      );
    });
  });

  it('shows presets dropdown when enabled', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          presets: [
            {
              id: '1',
              name: 'Overdue Plants',
              filters: { overdueOnly: true },
            },
          ],
        },
      }),
    } as Response);

    render(
      <AdvancedSearchInterface {...defaultProps} showPresets={true} />,
      { wrapper: createWrapper() }
    );

    // Wait for presets query to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/search/presets');
    });

    // Check if presets dropdown appears
    await waitFor(() => {
      expect(screen.queryByText('Saved Searches')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('clears search when clear button is clicked', async () => {
    const user = userEvent.setup();

    render(<AdvancedSearchInterface {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const searchInput = screen.getByPlaceholderText('Search plants...');
    await user.type(searchInput, 'test query');

    const clearButton = screen.getByRole('button', { name: /clear/i });
    await user.click(clearButton);

    expect(searchInput).toHaveValue('');
  });

  it('handles loading states correctly', async () => {
    // Mock suggestions API to return empty results
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: { suggestions: [] } }),
      } as Response)
    );

    // Mock a slow smart search response
    mockFetch.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: {
            searchId: 'test-id',
            searchType: 'smart',
            instances: [],
            totalCount: 0,
            hasMore: false,
            suggestions: [],
            relatedSearches: [],
            databaseTime: 10,
            processingTime: 5,
          }
        }),
      } as Response), 200))
    );

    const user = userEvent.setup();

    render(<AdvancedSearchInterface {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const searchInput = screen.getByPlaceholderText('Search plants...');
    
    // Type the full word at once to trigger search immediately
    await user.clear(searchInput);
    await user.type(searchInput, 'test');

    // Should show loading spinner during the debounce + request time
    await waitFor(() => {
      const searchButton = screen.getByTestId('search-button');
      expect(searchButton).toBeDisabled();
    }, { timeout: 500 });
  });

  it('handles search errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Search failed'));

    const user = userEvent.setup();

    render(<AdvancedSearchInterface {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const searchInput = screen.getByPlaceholderText('Search plants...');
    await user.type(searchInput, 'test');

    // Wait for error handling
    await waitFor(() => {
      // Component should handle error gracefully without crashing
      expect(searchInput).toBeInTheDocument();
    });
  });

  it('applies initial filters correctly', () => {
    const initialFilters: EnhancedPlantInstanceFilter = {
      userId: 1,
      location: 'bedroom',
      overdueOnly: true,
      limit: 20,
      offset: 0,
      sortBy: 'nickname',
      sortOrder: 'asc',
    };

    render(
      <AdvancedSearchInterface
        {...defaultProps}
        initialFilters={initialFilters}
      />,
      { wrapper: createWrapper() }
    );

    // Should call onFiltersChange with initial filters
    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining(initialFilters)
    );
  });

  it('handles compact mode correctly', () => {
    render(
      <AdvancedSearchInterface {...defaultProps} compact={true} />,
      { wrapper: createWrapper() }
    );

    // In compact mode, some features might be hidden or styled differently
    expect(screen.getByPlaceholderText('Search plants...')).toBeInTheDocument();
  });
});