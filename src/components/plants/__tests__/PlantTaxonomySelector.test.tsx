import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlantTaxonomySelector from '../PlantTaxonomySelector';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock lodash-es debounce
jest.mock('lodash-es', () => ({
  debounce: (fn: (...args: unknown[]) => unknown) => fn,
}));

const mockPlantSuggestions = [
  {
    id: 1,
    family: 'Araceae',
    genus: 'Monstera',
    species: 'deliciosa',
    commonName: 'Monstera Deliciosa',
    isVerified: true,
    matchedFields: ['commonName'],
  },
  {
    id: 2,
    family: 'Araceae',
    genus: 'Philodendron',
    species: 'hederaceum',
    commonName: 'Heart Leaf Philodendron',
    isVerified: false,
    matchedFields: ['genus'],
  },
  {
    id: 3,
    family: 'Ficus',
    genus: 'Ficus',
    species: 'lyrata',
    commonName: 'Fiddle Leaf Fig',
    isVerified: true,
    matchedFields: ['species'],
  },
];

const mockQuickSelect = {
  recent: [
    {
      id: 1,
      family: 'Araceae',
      genus: 'Monstera',
      species: 'deliciosa',
      commonName: 'Monstera Deliciosa',
      isVerified: true,
    },
  ],
  popular: [
    {
      id: 2,
      family: 'Araceae',
      genus: 'Philodendron',
      species: 'hederaceum',
      commonName: 'Heart Leaf Philodendron',
      isVerified: false,
    },
  ],
  verified: [
    {
      id: 3,
      family: 'Ficus',
      genus: 'Ficus',
      species: 'lyrata',
      commonName: 'Fiddle Leaf Fig',
      isVerified: true,
    },
  ],
};

describe('PlantTaxonomySelector', () => {
  const mockOnSelect = jest.fn();
  const mockOnAddNew = jest.fn();

  const defaultProps = {
    onSelect: mockOnSelect,
    onAddNew: mockOnAddNew,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    
    // Mock fetch to handle different API endpoints
    mockFetch.mockImplementation((url: string | URL | Request) => {
      const urlString = typeof url === 'string' ? url : url.toString();
      
      // Mock quick select API
      if (urlString.includes('/api/plants/suggestions?type=quick')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              quickSelect: mockQuickSelect
            },
          }),
        } as Response);
      }
      
      // Mock search API
      if (urlString.includes('/api/plants/search')) {
        const searchQuery = new URL(urlString).searchParams.get('q') || '';
        
        // Return different results based on search query
        if (searchQuery === 'monstera') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                plants: mockPlantSuggestions
              },
            }),
          } as Response);
        }
        
        // Return empty results for other queries
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              plants: []
            },
          }),
        } as Response);
      }
      
      // Default fallback
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            plants: [],
            quickSelect: { recent: [], popular: [], verified: [] }
          },
        }),
      } as Response);
    });
  });

  it('renders input field with placeholder', () => {
    render(<PlantTaxonomySelector {...defaultProps} />);

    expect(screen.getByPlaceholderText('Search for a plant type...')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(
      <PlantTaxonomySelector
        {...defaultProps}
        placeholder="Find your plant..."
      />
    );

    expect(screen.getByPlaceholderText('Find your plant...')).toBeInTheDocument();
  });

  it('displays selected plant in input', () => {
    const selectedPlant = mockPlantSuggestions[0];

    render(
      <PlantTaxonomySelector
        {...defaultProps}
        selectedPlant={selectedPlant}
      />
    );

    expect(screen.getByDisplayValue('Monstera Deliciosa')).toBeInTheDocument();
    expect(screen.getByTitle('Selected plant')).toBeInTheDocument();
  });

  it('shows loading spinner during search', async () => {
    const user = userEvent.setup();

    mockFetch.mockImplementationOnce(
      () => new Promise(resolve =>
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, data: { plants: [] } })
        } as Response), 100)
      )
    );

    render(<PlantTaxonomySelector {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search for a plant type...');
    await user.type(input, 'monstera');

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('performs search when typing', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          plants: mockPlantSuggestions.slice(0, 1),
        },
      }),
    } as Response);

    render(<PlantTaxonomySelector {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search for a plant type...');
    await user.type(input, 'monstera');

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/plants/search?q=monstera&limit=10',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });
  });

  it('displays search results in dropdown', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          plants: mockPlantSuggestions,
        },
      }),
    } as Response);

    render(<PlantTaxonomySelector {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search for a plant type...');
    await user.type(input, 'monstera');

    await waitFor(() => {
      expect(screen.getByText('Monstera Deliciosa')).toBeInTheDocument();
      expect(screen.getByText('Heart Leaf Philodendron')).toBeInTheDocument();
      expect(screen.getByText('Fiddle Leaf Fig')).toBeInTheDocument();
    });
  });

  it('shows verified badges for verified plants', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          plants: [mockPlantSuggestions[0]], // Verified plant
        },
      }),
    } as Response);

    render(<PlantTaxonomySelector {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search for a plant type...');
    await user.type(input, 'monstera');

    await waitFor(() => {
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });
  });

  it('displays match indicators for search results', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          plants: mockPlantSuggestions,
        },
      }),
    } as Response);

    render(<PlantTaxonomySelector {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search for a plant type...');
    await user.type(input, 'monstera');

    await waitFor(() => {
      // Check for match indicators (colored dots)
      const commonNameMatch = screen.getByTitle('Common name match');
      const genusMatch = screen.getByTitle('Genus match');
      const speciesMatch = screen.getByTitle('Species match');

      expect(commonNameMatch).toBeInTheDocument();
      expect(genusMatch).toBeInTheDocument();
      expect(speciesMatch).toBeInTheDocument();
    });
  });

  it('shows "Add new" option when searching', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          plants: [],
        },
      }),
    } as Response);

    render(<PlantTaxonomySelector {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search for a plant type...');
    await user.type(input, 'new plant');

    await waitFor(() => {
      expect(screen.getByText('Add "new plant" as new plant')).toBeInTheDocument();
      expect(screen.getByText('Create a new plant type')).toBeInTheDocument();
    });
  });

  it('handles plant selection', async () => {
    const user = userEvent.setup();

    render(<PlantTaxonomySelector {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search for a plant type...');
    
    // Clear the default mock and set specific mock for this search
    mockFetch.mockClear();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          plants: [mockPlantSuggestions[0]],
        },
      }),
    } as Response);
    
    await user.type(input, 'monstera');

    await waitFor(() => {
      expect(screen.getByText('Monstera Deliciosa')).toBeInTheDocument();
    });

    const plantOption = screen.getByText('Monstera Deliciosa');
    await user.click(plantOption);

    expect(mockOnSelect).toHaveBeenCalledWith(mockPlantSuggestions[0]);
  });

  it('handles add new plant action', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          plants: [],
        },
      }),
    } as Response);

    render(<PlantTaxonomySelector {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search for a plant type...');
    await user.type(input, 'new plant');

    await waitFor(() => {
      expect(screen.getByText('Add "new plant" as new plant')).toBeInTheDocument();
    });

    const addNewOption = screen.getByText('Add "new plant" as new plant');
    await user.click(addNewOption);

    expect(mockOnAddNew).toHaveBeenCalledWith('new plant');
  });

  it('loads and displays quick select options', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          quickSelect: mockQuickSelect,
        },
      }),
    } as Response);

    render(<PlantTaxonomySelector {...defaultProps} showQuickSelect={true} />);

    const input = screen.getByPlaceholderText('Search for a plant type...');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('Recently Used')).toBeInTheDocument();
      expect(screen.getByText('Popular Plants')).toBeInTheDocument();
      expect(screen.getByText('Verified Plants')).toBeInTheDocument();
    });
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          plants: mockPlantSuggestions.slice(0, 2),
        },
      }),
    } as Response);

    render(<PlantTaxonomySelector {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search for a plant type...');
    await user.type(input, 'plant');

    await waitFor(() => {
      expect(screen.getByText('Monstera Deliciosa')).toBeInTheDocument();
    });

    // Test arrow down navigation
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');

    // Test Enter key selection
    await user.keyboard('{Enter}');

    expect(mockOnSelect).toHaveBeenCalled();
  });

  it('handles escape key to close dropdown', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          plants: [mockPlantSuggestions[0]],
        },
      }),
    } as Response);

    render(<PlantTaxonomySelector {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search for a plant type...');
    await user.type(input, 'monstera');

    await waitFor(() => {
      expect(screen.getByText('Monstera Deliciosa')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    expect(screen.queryByText('Monstera Deliciosa')).not.toBeInTheDocument();
  });

  it('handles disabled state', () => {
    render(<PlantTaxonomySelector {...defaultProps} disabled={true} />);

    const input = screen.getByPlaceholderText('Search for a plant type...');
    expect(input).toBeDisabled();
  });

  it('handles focus and blur events', async () => {
    const user = userEvent.setup();

    render(<PlantTaxonomySelector {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search for a plant type...');

    // Focus should show dropdown (when there's content)
    await user.click(input);

    // Blur should hide dropdown after delay
    await user.tab();

    expect(input).not.toHaveFocus();
  });

  it('shows "No plants found" when search returns empty results', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          plants: [],
        },
      }),
    } as Response);

    render(<PlantTaxonomySelector {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search for a plant type...');
    await user.type(input, 'nonexistent plant');

    await waitFor(() => {
      expect(screen.getByText('No plants found')).toBeInTheDocument();
    });
  });

  it('handles search API errors gracefully', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<PlantTaxonomySelector {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search for a plant type...');
    await user.type(input, 'error test');

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Search error:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('cancels previous requests when typing rapidly', async () => {
    const user = userEvent.setup();

    let abortCallCount = 0;
    const mockAbortController = {
      abort: () => abortCallCount++,
      signal: {} as AbortSignal,
    };

    jest.spyOn(window, 'AbortController').mockImplementation(() => mockAbortController as any);

    mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<PlantTaxonomySelector {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search for a plant type...');

    // Type rapidly to trigger request cancellation
    await user.type(input, 'a');
    await user.type(input, 'b');
    await user.type(input, 'c');

    expect(abortCallCount).toBeGreaterThan(0);
  });

  it('applies custom className', () => {
    render(
      <PlantTaxonomySelector
        {...defaultProps}
        className="custom-class"
      />
    );

    const container = screen.getByPlaceholderText('Search for a plant type...').parentElement?.parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('supports autoFocus prop', () => {
    render(<PlantTaxonomySelector {...defaultProps} autoFocus={true} />);

    const input = screen.getByPlaceholderText('Search for a plant type...');
    expect(input).toHaveFocus();
  });

  it('clears selection when input value changes', async () => {
    const user = userEvent.setup();

    const selectedPlant = mockPlantSuggestions[0];

    render(
      <PlantTaxonomySelector
        {...defaultProps}
        selectedPlant={selectedPlant}
      />
    );

    const input = screen.getByDisplayValue('Monstera Deliciosa');
    await user.clear(input);
    await user.type(input, 'new search');

    expect(mockOnSelect).toHaveBeenCalledWith(null);
  });

  it('handles minimum search length requirement', async () => {
    const user = userEvent.setup();

    render(<PlantTaxonomySelector {...defaultProps} showQuickSelect={false} />);

    const input = screen.getByPlaceholderText('Search for a plant type...');
    await user.type(input, 'a'); // Single character

    // Should not make search API call for searches less than 2 characters
    // Only the suggestions API call should have been made on mount
    await waitFor(() => {
      const searchCalls = (mockFetch as jest.MockedFunction<typeof fetch>).mock.calls
        .filter(call => call[0].toString().includes('/api/plants/search'));
      expect(searchCalls.length).toBe(0);
    });
  });

  it('shows scientific names in results', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          plants: [mockPlantSuggestions[0]],
        },
      }),
    } as Response);

    render(<PlantTaxonomySelector {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search for a plant type...');
    await user.type(input, 'monstera');

    await waitFor(() => {
      // The text should match what the component actually displays
      expect(screen.getByText(/Monstera deliciosa/i)).toBeInTheDocument();
      expect(screen.getByText(/Family: Araceae/i)).toBeInTheDocument();
    });
  });
});