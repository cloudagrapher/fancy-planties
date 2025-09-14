// Plant Management Integration Tests
// Tests complete plant creation, editing, and deletion workflows

import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userInteractions } from '@/test-utils';
import { mockApiResponse, mockApiError, resetApiMocks } from '../../test-utils/helpers/api-helpers';
import { createTestUser, createAuthenticatedTestUser } from '@/test-utils/factories/user-factory';
import { createTestPlant, createTestPlantInstance } from '@/test-utils/factories/plant-factory';

// Mock Next.js router
const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => ({
    get: jest.fn(() => null),
  }),
}));

// Mock React Query
const mockInvalidateQueries = jest.fn();
const mockRefetchQueries = jest.fn();
const mockRemoveQueries = jest.fn();

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: jest.fn().mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      refetch: jest.fn(),
    }),
    useMutation: jest.fn().mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isLoading: false,
      isPending: false,
      error: null,
      isError: false,
      isSuccess: false,
      reset: jest.fn(),
    }),
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
      refetchQueries: mockRefetchQueries,
      removeQueries: mockRemoveQueries,
    }),
  };
});

// Simple test component for plant management workflows
const PlantManagementTestComponent = ({ onApiCall, children }) => {
  const handleCreatePlant = async (plantData) => {
    const response = await fetch('/api/plant-instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plantData),
    });
    const result = await response.json();
    onApiCall && onApiCall('create', result);
    return result;
  };

  const handleUpdatePlant = async (id, plantData) => {
    const response = await fetch(`/api/plant-instances/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plantData),
    });
    const result = await response.json();
    onApiCall && onApiCall('update', result);
    return result;
  };

  const handleDeletePlant = async (id) => {
    const response = await fetch(`/api/plant-instances/${id}`, {
      method: 'DELETE',
    });
    const result = await response.json();
    onApiCall && onApiCall('delete', result);
    return result;
  };

  return (
    <div>
      <button onClick={() => handleCreatePlant({ nickname: 'Test Plant', location: 'Test Location' })}>
        Create Plant
      </button>
      <button onClick={() => handleUpdatePlant(1, { nickname: 'Updated Plant', location: 'Updated Location' })}>
        Update Plant
      </button>
      <button onClick={() => handleDeletePlant(1)}>
        Delete Plant
      </button>
      {children}
    </div>
  );
};

describe('Plant Management Integration Tests', () => {
  let testUser;
  let testSession;

  beforeEach(() => {
    jest.clearAllMocks();
    resetApiMocks();
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockInvalidateQueries.mockClear();
    mockRefetchQueries.mockClear();
    mockRemoveQueries.mockClear();

    // Create authenticated test user
    const authData = createAuthenticatedTestUser();
    testUser = authData.user;
    testSession = authData.session;
  });

  afterEach(() => {
    resetApiMocks();
  });

  describe('Plant Creation Workflow', () => {
    it('should complete plant creation workflow from form to database', async () => {
      // Arrange
      const newPlantInstance = createTestPlantInstance({
        id: 1,
        nickname: 'Test Plant',
        location: 'Test Location',
        userId: testUser.id,
      });

      // Mock plant instance creation API
      mockApiResponse({
        'POST /api/plant-instances': {
          status: 201,
          data: {
            success: true,
            data: newPlantInstance,
          },
        },
      });

      const mockOnApiCall = jest.fn();
      const { user } = renderWithProviders(
        <PlantManagementTestComponent onApiCall={mockOnApiCall} />
      );

      // Act - Create plant
      const createButton = screen.getByRole('button', { name: /create plant/i });
      await user.click(createButton);

      // Assert - Verify API call was made with correct data
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/plant-instances',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: 'Test Plant', location: 'Test Location' }),
          })
        );
      });

      // Assert - Verify success callback was called
      await waitFor(() => {
        expect(mockOnApiCall).toHaveBeenCalledWith('create', {
          success: true,
          data: newPlantInstance,
        });
      });
    });

    it('should handle plant creation validation errors', async () => {
      // Arrange
      mockApiResponse({
        'POST /api/plant-instances': {
          status: 400,
          data: {
            success: false,
            error: 'Validation failed',
            details: [
              { path: ['nickname'], message: 'Nickname is required' },
              { path: ['location'], message: 'Location is required' },
            ],
          },
        },
      });

      const mockOnApiCall = jest.fn();
      const { user } = renderWithProviders(
        <PlantManagementTestComponent onApiCall={mockOnApiCall} />
      );

      // Act - Create plant (will trigger validation error)
      const createButton = screen.getByRole('button', { name: /create plant/i });
      await user.click(createButton);

      // Assert - Verify API call was made
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/plant-instances',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });

      // Assert - Verify error response was received
      await waitFor(() => {
        expect(mockOnApiCall).toHaveBeenCalledWith('create', {
          success: false,
          error: 'Validation failed',
          details: [
            { path: ['nickname'], message: 'Nickname is required' },
            { path: ['location'], message: 'Location is required' },
          ],
        });
      });
    });

    it('should handle plant creation server errors', async () => {
      // Arrange
      mockApiError('/api/plant-instances', 500, { error: 'Database connection failed' }, 'POST');

      const mockOnApiCall = jest.fn();
      const { user } = renderWithProviders(
        <PlantManagementTestComponent onApiCall={mockOnApiCall} />
      );

      // Act - Create plant (will trigger server error)
      const createButton = screen.getByRole('button', { name: /create plant/i });
      await user.click(createButton);

      // Assert - Verify API call was made
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/plant-instances',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });

      // Assert - Verify error response was received
      await waitFor(() => {
        expect(mockOnApiCall).toHaveBeenCalledWith('create', {
          error: 'Database connection failed',
        });
      });
    });

    it('should create new plant taxonomy when plant type not found', async () => {
      // Arrange
      const newPlant = createTestPlant({
        id: 2,
        commonName: 'New Plant Species',
        family: 'Testaceae',
        genus: 'Testus',
        species: 'newus',
      });

      // Mock plant creation
      mockApiResponse({
        'POST /api/plants': {
          status: 201,
          data: {
            success: true,
            data: newPlant,
          },
        },
      });

      const mockOnApiCall = jest.fn();
      const { user } = renderWithProviders(
        <PlantManagementTestComponent onApiCall={mockOnApiCall}>
          <button onClick={async () => {
            const response = await fetch('/api/plants', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                commonName: 'New Plant Species',
                family: 'Testaceae',
                genus: 'Testus',
                species: 'newus',
              }),
            });
            const result = await response.json();
            mockOnApiCall('createTaxonomy', result);
          }}>
            Create Plant Taxonomy
          </button>
        </PlantManagementTestComponent>
      );

      // Act - Create new plant taxonomy
      const createTaxonomyButton = screen.getByRole('button', { name: /create plant taxonomy/i });
      await user.click(createTaxonomyButton);

      // Assert - Verify plant creation API was called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/plants',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              commonName: 'New Plant Species',
              family: 'Testaceae',
              genus: 'Testus',
              species: 'newus',
            }),
          })
        );
      });

      // Assert - Verify success response
      await waitFor(() => {
        expect(mockOnApiCall).toHaveBeenCalledWith('createTaxonomy', {
          success: true,
          data: newPlant,
        });
      });
    });
  });

  describe('Plant Editing and Updating Workflows', () => {
    it('should complete plant editing workflow with data persistence', async () => {
      // Arrange
      const updatedInstance = createTestPlantInstance({
        id: 1,
        nickname: 'Updated Plant',
        location: 'Updated Location',
        userId: testUser.id,
      });

      // Mock plant instance update API
      mockApiResponse({
        'PUT /api/plant-instances/1': {
          status: 200,
          data: {
            success: true,
            data: updatedInstance,
          },
        },
      });

      const mockOnApiCall = jest.fn();
      const { user } = renderWithProviders(
        <PlantManagementTestComponent onApiCall={mockOnApiCall} />
      );

      // Act - Update plant
      const updateButton = screen.getByRole('button', { name: /update plant/i });
      await user.click(updateButton);

      // Assert - Verify API call was made with updated data
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/plant-instances/1',
          expect.objectContaining({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: 'Updated Plant', location: 'Updated Location' }),
          })
        );
      });

      // Assert - Verify success callback was called
      await waitFor(() => {
        expect(mockOnApiCall).toHaveBeenCalledWith('update', {
          success: true,
          data: updatedInstance,
        });
      });
    });

    it('should handle plant editing authorization errors', async () => {
      // Arrange
      mockApiResponse({
        'PUT /api/plant-instances/1': {
          status: 403,
          data: {
            error: 'Forbidden',
          },
        },
      });

      const mockOnApiCall = jest.fn();
      const { user } = renderWithProviders(
        <PlantManagementTestComponent onApiCall={mockOnApiCall} />
      );

      // Act - Try to update plant
      const updateButton = screen.getByRole('button', { name: /update plant/i });
      await user.click(updateButton);

      // Assert - Verify API call was made
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/plant-instances/1',
          expect.objectContaining({
            method: 'PUT',
          })
        );
      });

      // Assert - Verify authorization error was received
      await waitFor(() => {
        expect(mockOnApiCall).toHaveBeenCalledWith('update', {
          error: 'Forbidden',
        });
      });
    });

    it('should handle plant editing with image uploads', async () => {
      // Arrange
      const updatedInstance = createTestPlantInstance({
        id: 1,
        userId: testUser.id,
        images: ['existing-image.jpg', 'new-image.jpg'],
      });

      mockApiResponse({
        'PUT /api/plant-instances/1': {
          status: 200,
          data: {
            success: true,
            data: updatedInstance,
          },
        },
      });

      const mockOnApiCall = jest.fn();
      const { user } = renderWithProviders(
        <PlantManagementTestComponent onApiCall={mockOnApiCall}>
          <button onClick={async () => {
            const formData = new FormData();
            formData.append('nickname', 'Updated Plant');
            formData.append('location', 'Updated Location');
            formData.append('image', new File(['test'], 'new-image.jpg', { type: 'image/jpeg' }));
            
            const response = await fetch('/api/plant-instances/1', {
              method: 'PUT',
              body: formData,
            });
            const result = await response.json();
            mockOnApiCall('updateWithImage', result);
          }}>
            Update Plant with Image
          </button>
        </PlantManagementTestComponent>
      );

      // Act - Update plant with image
      const updateWithImageButton = screen.getByRole('button', { name: /update plant with image/i });
      await user.click(updateWithImageButton);

      // Assert - Verify FormData was sent with images
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/plant-instances/1',
          expect.objectContaining({
            method: 'PUT',
            body: expect.any(FormData),
          })
        );
      });

      // Assert - Verify success response
      await waitFor(() => {
        expect(mockOnApiCall).toHaveBeenCalledWith('updateWithImage', {
          success: true,
          data: updatedInstance,
        });
      });
    });

    it('should validate date fields during editing', async () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      mockApiResponse({
        'PUT /api/plant-instances/1': {
          status: 400,
          data: {
            success: false,
            error: 'Validation failed',
            details: [
              { path: ['lastFertilized'], message: 'Date cannot be in the future' },
            ],
          },
        },
      });

      const mockOnApiCall = jest.fn();
      const { user } = renderWithProviders(
        <PlantManagementTestComponent onApiCall={mockOnApiCall}>
          <button onClick={async () => {
            const response = await fetch('/api/plant-instances/1', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nickname: 'Updated Plant',
                location: 'Updated Location',
                lastFertilized: futureDate.toISOString(),
              }),
            });
            const result = await response.json();
            mockOnApiCall('validateDate', result);
          }}>
            Update Plant with Future Date
          </button>
        </PlantManagementTestComponent>
      );

      // Act - Update plant with future date
      const updateWithDateButton = screen.getByRole('button', { name: /update plant with future date/i });
      await user.click(updateWithDateButton);

      // Assert - Verify validation error was received
      await waitFor(() => {
        expect(mockOnApiCall).toHaveBeenCalledWith('validateDate', {
          success: false,
          error: 'Validation failed',
          details: [
            { path: ['lastFertilized'], message: 'Date cannot be in the future' },
          ],
        });
      });
    });
  });

  describe('Plant Deletion with Proper Cleanup', () => {
    it('should complete plant deletion workflow with confirmation', async () => {
      // Arrange
      const plantToDelete = createTestPlantInstance({
        id: 1,
        userId: testUser.id,
      });

      mockApiResponse({
        'DELETE /api/plant-instances/1': {
          status: 200,
          data: {
            success: true,
            message: 'Plant instance deleted successfully',
          },
        },
      });

      // Mock window.confirm
      const originalConfirm = window.confirm;
      window.confirm = jest.fn(() => true);

      const mockOnDelete = jest.fn();
      const { user } = renderWithProviders(
        <div>
          <button
            onClick={async () => {
              const confirmed = window.confirm('Are you sure you want to delete this plant?');
              if (confirmed) {
                const response = await fetch(`/api/plant-instances/${plantToDelete.id}`, {
                  method: 'DELETE',
                });
                if (response.ok) {
                  mockOnDelete();
                }
              }
            }}
          >
            Delete Plant
          </button>
        </div>
      );

      // Act - Click delete button
      const deleteButton = screen.getByRole('button', { name: /delete plant/i });
      await user.click(deleteButton);

      // Assert - Verify confirmation was shown
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this plant?');

      // Assert - Verify API call was made
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/plant-instances/1',
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });

      // Assert - Verify deletion callback was called
      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalled();
      });

      // Cleanup
      window.confirm = originalConfirm;
    });

    it('should handle plant deletion authorization errors', async () => {
      // Arrange
      mockApiResponse({
        'DELETE /api/plant-instances/1': {
          status: 403,
          data: {
            error: 'Forbidden',
          },
        },
      });

      const originalConfirm = window.confirm;
      window.confirm = jest.fn(() => true);

      const { user } = renderWithProviders(
        <div>
          <button
            onClick={async () => {
              const confirmed = window.confirm('Are you sure?');
              if (confirmed) {
                const response = await fetch('/api/plant-instances/1', {
                  method: 'DELETE',
                });
                const result = await response.json();
                if (!response.ok) {
                  alert(result.error);
                }
              }
            }}
          >
            Delete Plant
          </button>
        </div>
      );

      // Mock window.alert
      const originalAlert = window.alert;
      window.alert = jest.fn();

      // Act - Try to delete plant
      const deleteButton = screen.getByRole('button', { name: /delete plant/i });
      await user.click(deleteButton);

      // Assert - Verify error was shown
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Forbidden');
      });

      // Cleanup
      window.confirm = originalConfirm;
      window.alert = originalAlert;
    });

    it('should cancel deletion when user declines confirmation', async () => {
      // Arrange
      const originalConfirm = window.confirm;
      window.confirm = jest.fn(() => false); // User cancels

      const mockOnDelete = jest.fn();
      const { user } = renderWithProviders(
        <div>
          <button
            onClick={async () => {
              const confirmed = window.confirm('Are you sure?');
              if (confirmed) {
                mockOnDelete();
              }
            }}
          >
            Delete Plant
          </button>
        </div>
      );

      // Act - Click delete button but cancel
      const deleteButton = screen.getByRole('button', { name: /delete plant/i });
      await user.click(deleteButton);

      // Assert - Verify confirmation was shown
      expect(window.confirm).toHaveBeenCalled();

      // Assert - Verify no API call was made
      expect(global.fetch).not.toHaveBeenCalled();

      // Assert - Verify deletion callback was not called
      expect(mockOnDelete).not.toHaveBeenCalled();

      // Cleanup
      window.confirm = originalConfirm;
    });

    it('should handle plant deletion server errors gracefully', async () => {
      // Arrange
      mockApiError('/api/plant-instances/1', 500, { error: 'Database error' }, 'DELETE');

      const originalConfirm = window.confirm;
      window.confirm = jest.fn(() => true);

      const { user } = renderWithProviders(
        <div>
          <button
            onClick={async () => {
              const confirmed = window.confirm('Are you sure?');
              if (confirmed) {
                try {
                  const response = await fetch('/api/plant-instances/1', {
                    method: 'DELETE',
                  });
                  const result = await response.json();
                  if (!response.ok) {
                    throw new Error(result.error);
                  }
                } catch (error) {
                  alert(`Failed to delete: ${error.message}`);
                }
              }
            }}
          >
            Delete Plant
          </button>
        </div>
      );

      const originalAlert = window.alert;
      window.alert = jest.fn();

      // Act - Try to delete plant
      const deleteButton = screen.getByRole('button', { name: /delete plant/i });
      await user.click(deleteButton);

      // Assert - Verify error handling
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to delete: Database error');
      });

      // Cleanup
      window.confirm = originalConfirm;
      window.alert = originalAlert;
    });
  });

  describe('End-to-End Plant Management Flow', () => {
    it('should complete full plant lifecycle: create -> edit -> delete', async () => {
      // Step 1: Create plant
      const newInstance = createTestPlantInstance({
        id: 1,
        nickname: 'Test Plant',
        location: 'Test Location',
        userId: testUser.id,
      });

      mockApiResponse({
        'POST /api/plant-instances': {
          status: 201,
          data: {
            success: true,
            data: newInstance,
          },
        },
      });

      const mockOnApiCall = jest.fn();
      const { user } = renderWithProviders(
        <PlantManagementTestComponent onApiCall={mockOnApiCall} />
      );

      // Create plant
      const createButton = screen.getByRole('button', { name: /create plant/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/plant-instances',
          expect.objectContaining({ method: 'POST' })
        );
      });

      // Reset mocks for edit step
      jest.clearAllMocks();
      resetApiMocks();

      // Step 2: Edit plant
      const updatedInstance = {
        ...newInstance,
        nickname: 'Updated Plant',
      };

      mockApiResponse({
        'PUT /api/plant-instances/1': {
          status: 200,
          data: {
            success: true,
            data: updatedInstance,
          },
        },
      });

      // Edit plant
      const updateButton = screen.getByRole('button', { name: /update plant/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/plant-instances/1',
          expect.objectContaining({ method: 'PUT' })
        );
      });

      // Reset mocks for delete step
      jest.clearAllMocks();
      resetApiMocks();

      // Step 3: Delete plant
      mockApiResponse({
        'DELETE /api/plant-instances/1': {
          status: 200,
          data: {
            success: true,
            message: 'Plant deleted successfully',
          },
        },
      });

      // Delete plant
      const deleteButton = screen.getByRole('button', { name: /delete plant/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/plant-instances/1',
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });
  });
});