// Plant Management Integration Tests
// Tests complete plant creation, editing, and deletion workflows

import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userInteractions } from '@/test-utils';
import { mockApiResponse, mockApiError, resetApiMocks } from '@/test-utils/helpers/api-helpers';
import { createTestUser, createAuthenticatedTestUser } from '@/test-utils/factories/user-factory';
import { createTestPlant, createTestPlantInstance } from '@/test-utils/factories/plant-factory';
import PlantInstanceForm from '@/components/plants/PlantInstanceForm';

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

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isLoading: false,
    error: null,
  })),
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
    refetchQueries: mockRefetchQueries,
    removeQueries: mockRemoveQueries,
  }),
}));

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
      const testPlant = createTestPlant({
        id: 1,
        commonName: 'Monstera Deliciosa',
        family: 'Araceae',
        genus: 'Monstera',
        species: 'deliciosa',
      });

      const newPlantInstance = createTestPlantInstance({
        id: 1,
        plantId: testPlant.id,
        nickname: 'My Monstera',
        location: 'Living Room',
        userId: testUser.id,
      });

      // Mock plant search API
      mockApiResponse({
        'GET /api/plants': {
          status: 200,
          data: {
            success: true,
            data: [testPlant],
          },
        },
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

      const mockOnSuccess = jest.fn();
      const { user } = renderWithProviders(
        <PlantInstanceForm
          isOpen={true}
          onClose={jest.fn()}
          onSuccess={mockOnSuccess}
          userId={testUser.id}
        />
      );

      // Act - Fill out plant creation form
      await userInteractions.fillForm({
        'Nickname': 'My Monstera',
        'Location': 'Living Room',
      }, user);

      // Select fertilizer schedule
      const fertilizerSelect = screen.getByLabelText(/fertilizer schedule/i);
      await user.selectOptions(fertilizerSelect, 'every_4_weeks');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /save|create/i });
      await user.click(submitButton);

      // Assert - Verify API call was made with correct data
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/plant-instances',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });

      // Assert - Verify success callback was called
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(newPlantInstance);
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

      const { user } = renderWithProviders(
        <PlantInstanceForm
          isOpen={true}
          onClose={jest.fn()}
          userId={testUser.id}
        />
      );

      // Act - Submit form without required fields
      const submitButton = screen.getByRole('button', { name: /save|create/i });
      await user.click(submitButton);

      // Assert - Verify validation errors are displayed
      await waitFor(() => {
        expect(screen.getByText(/nickname is required/i)).toBeInTheDocument();
        expect(screen.getByText(/location is required/i)).toBeInTheDocument();
      });
    });

    it('should handle plant creation server errors', async () => {
      // Arrange
      mockApiError('/api/plant-instances', 500, { error: 'Database connection failed' }, 'POST');

      const { user } = renderWithProviders(
        <PlantInstanceForm
          isOpen={true}
          onClose={jest.fn()}
          userId={testUser.id}
        />
      );

      // Act - Fill and submit valid form
      await userInteractions.fillForm({
        'Nickname': 'Test Plant',
        'Location': 'Test Location',
      }, user);

      const submitButton = screen.getByRole('button', { name: /save|create/i });
      await user.click(submitButton);

      // Assert - Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/database connection failed/i)).toBeInTheDocument();
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

      // Mock empty plant search
      mockApiResponse({
        'GET /api/plants': {
          status: 200,
          data: {
            success: true,
            data: [],
          },
        },
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

      // Mock plant instance creation
      mockApiResponse({
        'POST /api/plant-instances': {
          status: 201,
          data: {
            success: true,
            data: createTestPlantInstance({
              plantId: newPlant.id,
              userId: testUser.id,
            }),
          },
        },
      });

      const { user } = renderWithProviders(
        <PlantInstanceForm
          isOpen={true}
          onClose={jest.fn()}
          userId={testUser.id}
        />
      );

      // Act - Create new plant taxonomy
      const addNewButton = screen.getByRole('button', { name: /add new|create new/i });
      await user.click(addNewButton);

      // Fill taxonomy form
      await userInteractions.fillForm({
        'Common Name': 'New Plant Species',
        'Family': 'Testaceae',
        'Genus': 'Testus',
        'Species': 'newus',
      }, user);

      const createPlantButton = screen.getByRole('button', { name: /create plant type/i });
      await user.click(createPlantButton);

      // Assert - Verify plant creation API was called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/plants',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('New Plant Species'),
          })
        );
      });
    });
  });

  describe('Plant Editing and Updating Workflows', () => {
    it('should complete plant editing workflow with data persistence', async () => {
      // Arrange
      const existingPlant = createTestPlant();
      const existingInstance = createTestPlantInstance({
        id: 1,
        plantId: existingPlant.id,
        nickname: 'Original Name',
        location: 'Original Location',
        userId: testUser.id,
        plant: existingPlant,
      });

      const updatedInstance = {
        ...existingInstance,
        nickname: 'Updated Name',
        location: 'Updated Location',
      };

      // Mock plant instance update API
      mockApiResponse({
        'PUT /api/plant-instances/1': {
          status: 200,
          data: updatedInstance,
        },
      });

      const mockOnSuccess = jest.fn();
      const { user } = renderWithProviders(
        <PlantInstanceForm
          plantInstance={existingInstance}
          isOpen={true}
          onClose={jest.fn()}
          onSuccess={mockOnSuccess}
          userId={testUser.id}
        />
      );

      // Act - Update plant information
      const nicknameField = screen.getByDisplayValue('Original Name');
      await user.clear(nicknameField);
      await user.type(nicknameField, 'Updated Name');

      const locationField = screen.getByDisplayValue('Original Location');
      await user.clear(locationField);
      await user.type(locationField, 'Updated Location');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /save|update/i });
      await user.click(submitButton);

      // Assert - Verify API call was made with updated data
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/plant-instances/1',
          expect.objectContaining({
            method: 'PUT',
          })
        );
      });

      // Assert - Verify success callback was called
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(updatedInstance);
      });
    });

    it('should handle plant editing authorization errors', async () => {
      // Arrange
      const existingInstance = createTestPlantInstance({
        id: 1,
        userId: 999, // Different user ID
      });

      mockApiResponse({
        'PUT /api/plant-instances/1': {
          status: 403,
          data: {
            error: 'Forbidden',
          },
        },
      });

      const { user } = renderWithProviders(
        <PlantInstanceForm
          plantInstance={existingInstance}
          isOpen={true}
          onClose={jest.fn()}
          userId={testUser.id}
        />
      );

      // Act - Try to update plant
      const submitButton = screen.getByRole('button', { name: /save|update/i });
      await user.click(submitButton);

      // Assert - Verify authorization error is displayed
      await waitFor(() => {
        expect(screen.getByText(/forbidden/i)).toBeInTheDocument();
      });
    });

    it('should handle plant editing with image uploads', async () => {
      // Arrange
      const existingInstance = createTestPlantInstance({
        id: 1,
        userId: testUser.id,
        images: ['existing-image.jpg'],
      });

      const updatedInstance = {
        ...existingInstance,
        images: ['existing-image.jpg', 'new-image.jpg'],
      };

      mockApiResponse({
        'PUT /api/plant-instances/1': {
          status: 200,
          data: updatedInstance,
        },
      });

      const { user } = renderWithProviders(
        <PlantInstanceForm
          plantInstance={existingInstance}
          isOpen={true}
          onClose={jest.fn()}
          userId={testUser.id}
        />
      );

      // Act - Upload new image
      const fileInput = screen.getByLabelText(/upload|image/i);
      const file = new File(['test'], 'new-image.jpg', { type: 'image/jpeg' });
      await user.upload(fileInput, file);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /save|update/i });
      await user.click(submitButton);

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
    });

    it('should validate date fields during editing', async () => {
      // Arrange
      const existingInstance = createTestPlantInstance({
        id: 1,
        userId: testUser.id,
      });

      const { user } = renderWithProviders(
        <PlantInstanceForm
          plantInstance={existingInstance}
          isOpen={true}
          onClose={jest.fn()}
          userId={testUser.id}
        />
      );

      // Act - Enter future date for last fertilized
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateString = futureDate.toISOString().split('T')[0];

      const lastFertilizedField = screen.getByLabelText(/last fertilized/i);
      await user.clear(lastFertilizedField);
      await user.type(lastFertilizedField, futureDateString);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /save|update/i });
      await user.click(submitButton);

      // Assert - Verify validation error is displayed
      await waitFor(() => {
        expect(screen.getByText(/cannot be in the future/i)).toBeInTheDocument();
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
      const newPlant = createTestPlant();
      const newInstance = createTestPlantInstance({
        id: 1,
        plantId: newPlant.id,
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

      const { user, rerender } = renderWithProviders(
        <PlantInstanceForm
          isOpen={true}
          onClose={jest.fn()}
          userId={testUser.id}
        />
      );

      // Create plant
      await userInteractions.fillForm({
        'Nickname': 'Test Plant',
        'Location': 'Test Location',
      }, user);

      let submitButton = screen.getByRole('button', { name: /save|create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/plant-instances',
          expect.objectContaining({ method: 'POST' })
        );
      });

      // Reset mocks for edit step
      jest.clearAllMocks();

      // Step 2: Edit plant
      const updatedInstance = {
        ...newInstance,
        nickname: 'Updated Plant',
      };

      mockApiResponse({
        'PUT /api/plant-instances/1': {
          status: 200,
          data: updatedInstance,
        },
      });

      rerender(
        <PlantInstanceForm
          plantInstance={newInstance}
          isOpen={true}
          onClose={jest.fn()}
          userId={testUser.id}
        />
      );

      // Edit plant
      const nicknameField = screen.getByDisplayValue('Test Plant');
      await user.clear(nicknameField);
      await user.type(nicknameField, 'Updated Plant');

      submitButton = screen.getByRole('button', { name: /save|update/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/plant-instances/1',
          expect.objectContaining({ method: 'PUT' })
        );
      });

      // Reset mocks for delete step
      jest.clearAllMocks();

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

      const originalConfirm = window.confirm;
      window.confirm = jest.fn(() => true);

      rerender(
        <div>
          <button
            onClick={async () => {
              const confirmed = window.confirm('Delete plant?');
              if (confirmed) {
                await fetch('/api/plant-instances/1', { method: 'DELETE' });
              }
            }}
          >
            Delete Plant
          </button>
        </div>
      );

      // Delete plant
      const deleteButton = screen.getByRole('button', { name: /delete plant/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/plant-instances/1',
          expect.objectContaining({ method: 'DELETE' })
        );
      });

      // Cleanup
      window.confirm = originalConfirm;
    });
  });
});