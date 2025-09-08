import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock lodash-es to avoid ES module issues
jest.mock('lodash-es', () => ({
  debounce: (fn: (...args: unknown[]) => unknown) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: unknown[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), 10);
    };
  },
}));

// Import the actual components for integration testing
import PlantsGrid from '../PlantsGrid';
import PlantDetailModal from '../PlantDetailModal';
import PlantInstanceForm from '../PlantInstanceForm';

// Mock helper function to create plant instances
interface MockPlantInstance {
  id: number;
  nickname: string;
  displayName: string;
  location: string;
  acquisitionDate: string;
  status: string;
  isActive: boolean;
  plant: {
    id: number;
    commonName: string;
    genus: string;
    species: string;
    family: string;
    isVerified: boolean;
  };
  careSchedule: {
    watering: { frequency: number; lastCare: string | null };
    fertilizing: { frequency: number; lastCare: string | null };
  };
  careStatus: string;
  daysUntilFertilizerDue: number | null;
  daysSinceLastFertilized: number | null;
  daysSinceLastRepot: number | null;
  primaryImage: string | null;
  careUrgency: string;
  images: unknown[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const createMockPlantInstance = (overrides: Partial<MockPlantInstance> = {}): MockPlantInstance => ({
  id: 1,
  nickname: 'Test Plant',
  displayName: 'Test Plant',
  location: 'Living Room',
  acquisitionDate: new Date().toISOString(),
  status: 'healthy',
  isActive: true,
  plant: {
    id: 1,
    commonName: 'Test Plant',
    genus: 'Test',
    species: 'testicus',
    family: 'Testaceae',
    isVerified: true,
  },
  careSchedule: {
    watering: { frequency: 7, lastCare: null },
    fertilizing: { frequency: 30, lastCare: null },
  },
  careStatus: 'healthy',
  daysUntilFertilizerDue: 15,
  daysSinceLastFertilized: 15,
  daysSinceLastRepot: null,
  primaryImage: null,
  careUrgency: 'low',
  images: [],
  notes: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// Mock Next.js Image component
jest.mock('next/image', () => {
  const MockImage = ({ src, alt, ...props }: { src: string; alt: string;[key: string]: unknown }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  };
  MockImage.displayName = 'MockImage';
  return MockImage;
});

// Mock some child components that aren't the focus of integration testing
jest.mock('../../care/CareHistoryTimeline', () => {
  return function MockCareHistoryTimeline() {
    return <div data-testid="care-history-timeline">Care History</div>;
  };
});

jest.mock('../PlantNotes', () => {
  return function MockPlantNotes() {
    return <div data-testid="plant-notes">Plant Notes</div>;
  };
});

jest.mock('../PlantLineage', () => {
  return function MockPlantLineage() {
    return <div data-testid="plant-lineage">Plant Lineage</div>;
  };
});

jest.mock('../../care/QuickCareActions', () => {
  const MockQuickCareActions = ({ onCareAction }: { onCareAction?: (action: string) => void }) => {
    return (
      <div data-testid="quick-care-actions">
        <button onClick={() => onCareAction && onCareAction('fertilizer')}>Quick Fertilize</button>
      </div>
    );
  };
  MockQuickCareActions.displayName = 'MockQuickCareActions';
  return MockQuickCareActions;
});

jest.mock('../PlantImageGallery', () => {
  const MockPlantImageGallery = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return isOpen ? (
      <div data-testid="plant-image-gallery">
        <button onClick={onClose}>Close Gallery</button>
      </div>
    ) : null;
  };
  MockPlantImageGallery.displayName = 'MockPlantImageGallery';
  return MockPlantImageGallery;
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

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  TestWrapper.displayName = 'TestWrapper';
  return TestWrapper;
};

describe('Plant Workflow Integration Tests', () => {
  const mockPlants = [
    createMockPlantInstance({
      id: 1,
      nickname: 'My Monstera',
      displayName: 'My Monstera',
      plant: {
        id: 1,
        commonName: 'Monstera Deliciosa',
        genus: 'Monstera',
        species: 'deliciosa',
        family: 'Araceae',
        isVerified: true,
      }
    }),
    createMockPlantInstance({
      id: 2,
      nickname: 'Phil the Philodendron',
      displayName: 'Phil the Philodendron',
      plant: {
        id: 2,
        commonName: 'Heart Leaf Philodendron',
        genus: 'Philodendron',
        species: 'hederaceum',
        family: 'Araceae',
        isVerified: true,
      }
    }),
  ];

  const mockPlantsResponse = {
    success: true,
    data: {
      instances: mockPlants,
      totalCount: 2,
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Plant Grid to Detail Modal Flow', () => {
    it('opens plant detail modal when clicking on a plant card', async () => {
      const user = userEvent.setup();

      // Mock fetch to handle different API endpoints
      mockFetch.mockImplementation((url: string | URL | Request) => {
        const urlString = typeof url === 'string' ? url : url.toString();

        if (urlString.includes('/api/plant-instances') && !urlString.includes('search')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockPlantsResponse.data,
          } as Response);
        }

        if (urlString.includes('/api/user-locations')) {
          return Promise.resolve({
            ok: true,
            json: async () => ['Living Room', 'Kitchen'],
          } as Response);
        }

        if (urlString.includes('/api/plant-instances/1')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockPlants[0],
          } as Response);
        }

        if (urlString.includes('/api/care-history')) {
          return Promise.resolve({
            ok: true,
            json: async () => [],
          } as Response);
        }

        if (urlString.includes('/api/propagations')) {
          return Promise.resolve({
            ok: true,
            json: async () => [],
          } as Response);
        }

        // Default fallback
        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        } as Response);
      });

      const TestComponent = () => {
        const [selectedPlantId, setSelectedPlantId] = React.useState<number | null>(null);
        const [isModalOpen, setIsModalOpen] = React.useState(false);

        const handlePlantSelect = (plant: any) => {
          setSelectedPlantId(plant.id);
          setIsModalOpen(true);
        };

        const handleCloseModal = () => {
          setIsModalOpen(false);
          setSelectedPlantId(null);
        };

        return (
          <>
            <PlantsGrid
              userId={1}
              onPlantSelect={handlePlantSelect}
            />
            {selectedPlantId && (
              <PlantDetailModal
                plantId={selectedPlantId}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onEdit={() => { }}
                onCareLog={() => { }}
              />
            )}
          </>
        );
      };

      render(<TestComponent />, { wrapper: createWrapper() });

      // Wait for plants to load
      await waitFor(() => {
        expect(screen.getByText('My Monstera')).toBeInTheDocument();
      });

      // Mock plant detail API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlants[0],
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [], // Care history
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [], // Propagations
      } as Response);

      // Click on the plant card
      const plantCard = screen.getByLabelText('Plant card for My Monstera');
      await user.click(plantCard);

      // Modal should open and show plant details
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Plant Creation Workflow', () => {
    it('completes full plant creation flow with taxonomy selection', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const [isFormOpen, setIsFormOpen] = React.useState(true);

        return (
          <PlantInstanceForm
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSuccess={() => {
              setIsFormOpen(false);
            }}
          />
        );
      };

      // Mock locations API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ['Living Room', 'Kitchen'],
      } as Response);

      render(<TestComponent />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Add New Plant')).toBeInTheDocument();
      });

      // Mock plant search when typing
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            plants: [
              {
                id: 1,
                family: 'Araceae',
                genus: 'Monstera',
                species: 'deliciosa',
                commonName: 'Monstera Deliciosa',
                isVerified: true,
              }
            ],
          },
        }),
      } as Response);

      // Search for a plant type
      const plantTypeInput = screen.getByPlaceholderText('Search for a plant type...');
      await user.type(plantTypeInput, 'monstera');

      await waitFor(() => {
        expect(screen.getByText('Monstera Deliciosa')).toBeInTheDocument();
      });

      // Select the plant type
      const plantOption = screen.getByText('Monstera Deliciosa');
      await user.click(plantOption);

      // Fill out the plant instance form
      const nicknameInput = screen.getByPlaceholderText('My favorite monstera');
      await user.type(nicknameInput, 'My New Monstera');

      const locationInput = screen.getByPlaceholderText('Living room window');
      await user.type(locationInput, 'Living Room');

      // Mock the plant instance creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: createMockPlantInstance({
            id: 3,
            nickname: 'My New Monstera',
            location: 'Living Room',
          }),
        }),
      } as Response);

      // Submit the form
      const submitButton = screen.getByText('Add Plant');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/plant-instances',
          expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData),
          })
        );
      });
    });

    it('creates new plant taxonomy when "Add new" is selected', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const [isFormOpen, setIsFormOpen] = React.useState(true);

        return (
          <PlantInstanceForm
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSuccess={() => setIsFormOpen(false)}
          />
        );
      };

      // Mock locations API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ['Living Room'],
      } as Response);

      render(<TestComponent />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Add New Plant')).toBeInTheDocument();
      });

      // Mock empty search result
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            plants: [],
          },
        }),
      } as Response);

      // Search for a non-existent plant
      const plantTypeInput = screen.getByPlaceholderText('Search for a plant type...');
      await user.type(plantTypeInput, 'rare plant');

      await waitFor(() => {
        expect(screen.getByText('Add "rare plant" as new plant')).toBeInTheDocument();
      });

      // Click "Add new plant"
      const addNewButton = screen.getByText('Add "rare plant" as new plant');
      await user.click(addNewButton);

      // Taxonomy form should appear
      await waitFor(() => {
        expect(screen.getByText('Create New Plant Type')).toBeInTheDocument();
      });

      // Fill out taxonomy form
      const familyInput = screen.getByPlaceholderText('e.g., Araceae');
      const genusInput = screen.getByPlaceholderText('e.g., Monstera');
      const speciesInput = screen.getByPlaceholderText('e.g., deliciosa');

      await user.type(familyInput, 'Rare Family');
      await user.type(genusInput, 'Rare Genus');
      await user.type(speciesInput, 'rarespecies');

      // Mock plant creation API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 99,
            family: 'Rare Family',
            genus: 'Rare Genus',
            species: 'rarespecies',
            commonName: 'rare plant',
            isVerified: false,
          },
        }),
      } as Response);

      // Submit taxonomy form
      const createPlantButton = screen.getByText('Create Plant Type');
      await user.click(createPlantButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/plants',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('Rare Family'),
          })
        );
      });

      // Taxonomy form should close and plant should be selected
      await waitFor(() => {
        expect(screen.queryByText('Create New Plant Type')).not.toBeInTheDocument();
        expect(screen.getByDisplayValue('rare plant')).toBeInTheDocument();
      });
    });
  });

  describe('Plant Editing Workflow', () => {
    it('edits existing plant instance successfully', async () => {
      const user = userEvent.setup();
      const existingPlant = mockPlants[0];

      const TestComponent = () => {
        const [isFormOpen, setIsFormOpen] = React.useState(true);

        return (
          <PlantInstanceForm
            plantInstance={existingPlant}
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSuccess={() => setIsFormOpen(false)}
          />
        );
      };

      // Mock locations API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ['Living Room', 'Kitchen'],
      } as Response);

      render(<TestComponent />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Edit Plant')).toBeInTheDocument();
        expect(screen.getByDisplayValue('My Monstera')).toBeInTheDocument();
      });

      // Edit the nickname
      const nicknameInput = screen.getByDisplayValue('My Monstera');
      await user.clear(nicknameInput);
      await user.type(nicknameInput, 'Updated Monstera');

      // Mock the update API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            ...existingPlant,
            nickname: 'Updated Monstera',
          },
        }),
      } as Response);

      // Submit the form
      const updateButton = screen.getByText('Update Plant');
      await user.click(updateButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/plant-instances/${existingPlant.id}`,
          expect.objectContaining({
            method: 'PUT',
            body: expect.any(FormData),
          })
        );
      });
    });
  });

  describe('Care Action Workflow', () => {
    it('handles care actions from plant grid to detail modal', async () => {
      const user = userEvent.setup();

      // Mock initial grid data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlantsResponse,
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ['Living Room'],
      } as Response);

      const TestComponent = () => {
        const [selectedPlantId, setSelectedPlantId] = React.useState<number | null>(null);
        const [isModalOpen, setIsModalOpen] = React.useState(false);

        const handlePlantSelect = (plant: unknown) => {
          setSelectedPlantId(plant.id);
          setIsModalOpen(true);
        };

        const handleCareLog = (_plantId: number, _action: string) => {
          // Mock care logging
        };

        return (
          <>
            <PlantsGrid
              userId={1}
              onPlantSelect={handlePlantSelect}
              onCareAction={(plant, action) => handleCareLog(plant.id, action)}
            />
            {selectedPlantId && (
              <PlantDetailModal
                plantId={selectedPlantId}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onEdit={() => { }}
                onCareLog={handleCareLog}
              />
            )}
          </>
        );
      };

      render(<TestComponent />, { wrapper: createWrapper() });

      // Wait for plants to load
      await waitFor(() => {
        expect(screen.getByText('My Monstera')).toBeInTheDocument();
      });

      // Mock plant detail API calls for modal
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlants[0],
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      // Open plant detail modal
      const plantCard = screen.getByText('My Monstera');
      await user.click(plantCard);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Mock quick care API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      // Perform quick care action
      const quickCareButton = screen.getByText('Quick Fertilize');
      await user.click(quickCareButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/care/quick-log',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"plantInstanceId":1'),
          })
        );
      });
    });
  });

  describe('Search and Filter Integration', () => {
    it('handles search from grid to results display', async () => {
      const user = userEvent.setup();

      // Initial empty response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            instances: [],
            totalCount: 0,
            hasMore: false,
            searchTime: 5,
            filters: { userId: 1 },
          },
        }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ['Living Room'],
      } as Response);

      render(
        <PlantsGrid
          userId={1}
          showSearch={true}
          showFilters={true}
          onPlantSelect={() => { }}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('No plants found')).toBeInTheDocument();
      });

      // Mock search results
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            instances: [mockPlants[0]],
            totalCount: 1,
            hasMore: false,
            searchTime: 25,
            filters: { userId: 1 },
          },
        }),
      } as Response);

      // Perform search
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'monstera');

      await waitFor(() => {
        expect(screen.getByText('My Monstera')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('handles network errors gracefully across components', async () => {
      // Mock failed API call
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const TestComponent = () => {
        const [isFormOpen, setIsFormOpen] = React.useState(true);

        return (
          <PlantInstanceForm
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSuccess={() => setIsFormOpen(false)}
          />
        );
      };

      render(<TestComponent />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Add New Plant')).toBeInTheDocument();
      });

      // The form should still be functional despite the API error
      expect(screen.getByPlaceholderText('Search for a plant type...')).toBeInTheDocument();
    });
  });
});