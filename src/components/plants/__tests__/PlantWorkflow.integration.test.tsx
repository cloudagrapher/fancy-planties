import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMockPlantInstance } from '@/test-utils/helpers';

// Import the actual components for integration testing
import PlantsGrid from '../PlantsGrid';
import PlantDetailModal from '../PlantDetailModal';
import PlantInstanceForm from '../PlantInstanceForm';

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />;
  };
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
  return function MockQuickCareActions({ onCareAction }: any) {
    return (
      <div data-testid="quick-care-actions">
        <button onClick={() => onCareAction && onCareAction('fertilizer')}>Quick Fertilize</button>
      </div>
    );
  };
});

jest.mock('../PlantImageGallery', () => {
  return function MockPlantImageGallery({ isOpen, onClose }: any) {
    return isOpen ? (
      <div data-testid="plant-image-gallery">
        <button onClick={onClose}>Close Gallery</button>
      </div>
    ) : null;
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

describe('Plant Workflow Integration Tests', () => {
  const mockPlants = [
    createMockPlantInstance({ 
      id: 1, 
      nickname: 'My Monstera', 
      plant: { 
        id: 1, 
        commonName: 'Monstera Deliciosa', 
        genus: 'Monstera', 
        species: 'deliciosa',
        family: 'Araceae'
      } 
    }),
    createMockPlantInstance({ 
      id: 2, 
      nickname: 'Phil the Philodendron', 
      plant: { 
        id: 2, 
        commonName: 'Heart Leaf Philodendron', 
        genus: 'Philodendron', 
        species: 'hederaceum',
        family: 'Araceae'
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

      // Mock initial grid data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlantsResponse,
      } as Response);

      // Mock locations API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ['Living Room', 'Kitchen'],
      } as Response);

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
                onEdit={() => {}}
                onCareLog={() => {}}
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
      const plantCard = screen.getByText('My Monstera');
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
      const commonNameInput = screen.getByDisplayValue('rare plant');

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

        const handlePlantSelect = (plant: any) => {
          setSelectedPlantId(plant.id);
          setIsModalOpen(true);
        };

        const handleCareLog = (plantId: number, action: string) => {
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
                onEdit={() => {}}
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
          onPlantSelect={() => {}}
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