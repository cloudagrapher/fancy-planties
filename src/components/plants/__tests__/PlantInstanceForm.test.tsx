import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PlantInstanceForm from '../PlantInstanceForm';
import { createMockPlantInstance } from '@/test-utils/helpers';

// Mock the PlantTaxonomySelector component
jest.mock('../PlantTaxonomySelector', () => {
  return function MockPlantTaxonomySelector({ onSelect, onAddNew, selectedPlant }: any) {
    return (
      <div data-testid="plant-taxonomy-selector">
        <input 
          placeholder="Search for a plant type..."
          aria-label="Plant Type"
        />
        <button
          onClick={() => onSelect({ id: 1, commonName: 'Test Plant', genus: 'Test', species: 'plant' })}
        >
          Select Plant
        </button>
        <button
          onClick={() => onAddNew && onAddNew('Test Query')}
          data-testid="add-new-plant"
        >
          Add "Test Query" as new plant
        </button>
        {selectedPlant && <div>Selected: {selectedPlant.commonName}</div>}
      </div>
    );
  };
});

// Mock the ImageUpload component
jest.mock('../../shared/ImageUpload', () => {
  return function MockImageUpload({ onImagesChange }: any) {
    return (
      <div data-testid="image-upload">
        <button onClick={() => onImagesChange([new File(['test'], 'test.jpg', { type: 'image/jpeg' })])}>
          Add Image
        </button>
      </div>
    );
  };
});

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

describe('PlantInstanceForm', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  it('renders form for creating new plant', () => {
    render(
      <PlantInstanceForm
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Add New Plant')).toBeInTheDocument();
    expect(screen.getByLabelText(/Plant Type/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nickname/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Location/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fertilizer Schedule/)).toBeInTheDocument();
  });

  it('renders form for editing existing plant', () => {
    const mockPlant = createMockPlantInstance({
      nickname: 'My Test Plant',
      location: 'Living Room',
    });

    render(
      <PlantInstanceForm
        plantInstance={mockPlant}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Edit Plant')).toBeInTheDocument();
    expect(screen.getByDisplayValue('My Test Plant')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Living Room')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();

    render(
      <PlantInstanceForm
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    // Try to submit without filling required fields (but with plant selected to trigger validation)
    const selectButton = screen.getByText('Select Plant');
    await user.click(selectButton);

    const submitButton = screen.getByText('Add Plant');
    await user.click(submitButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('Nickname is required')).toBeInTheDocument();
      expect(screen.getByText('Location is required')).toBeInTheDocument();
    });
  });

  it('handles plant selection', async () => {
    const user = userEvent.setup();

    render(
      <PlantInstanceForm
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    // Select a plant
    const selectButton = screen.getByText('Select Plant');
    await user.click(selectButton);

    expect(screen.getByText('Selected: Test Plant')).toBeInTheDocument();
  });

  it('handles form submission for new plant', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { id: 1 } }),
    } as Response);

    render(
      <PlantInstanceForm
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    // Fill out the form
    const selectButton = screen.getByText('Select Plant');
    await user.click(selectButton);

    const nicknameInput = screen.getByPlaceholderText('My favorite monstera');
    await user.type(nicknameInput, 'My New Plant');

    const locationInput = screen.getByPlaceholderText('Living room window');
    await user.type(locationInput, 'Kitchen');

    // Submit the form
    const submitButton = screen.getByText('Add Plant');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/plant-instances', {
        method: 'POST',
        body: expect.any(FormData),
      });
    });
  });

  it('handles form submission for editing plant', async () => {
    const user = userEvent.setup();
    const mockPlant = createMockPlantInstance({
      id: 1,
      nickname: 'Original Name',
      location: 'Original Location',
      fertilizerSchedule: 'monthly', // Add this to prevent validation error
    });

    // Mock the locations API call first
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    // Then mock the actual form submission
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockPlant }),
    } as Response);

    render(
      <PlantInstanceForm
        plantInstance={mockPlant}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    // Wait for the form to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Original Name')).toBeInTheDocument();
    });

    // Modify the nickname
    const nicknameInput = screen.getByDisplayValue('Original Name');
    await user.clear(nicknameInput);
    await user.type(nicknameInput, 'Updated Name');

    // Ensure fertilizer schedule is selected (should be pre-filled from mockPlant)
    const scheduleSelect = screen.getByRole('combobox');
    expect(scheduleSelect).toHaveValue('monthly');

    // Submit the form
    const submitButton = screen.getByText('Update Plant');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/plant-instances/1', {
        method: 'PUT',
        body: expect.any(FormData),
      });
    }, { timeout: 3000 });
  });

  it('handles close button click', async () => {
    const user = userEvent.setup();

    render(
      <PlantInstanceForm
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    const closeButton = screen.getByRole('button', { name: 'Close form' });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles escape key to close', () => {
    render(
      <PlantInstanceForm
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not render when closed', () => {
    render(
      <PlantInstanceForm
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByText('Add New Plant')).not.toBeInTheDocument();
  });

  it('handles image upload', async () => {
    const user = userEvent.setup();

    render(
      <PlantInstanceForm
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    const addImageButton = screen.getByText('Add Image');
    await user.click(addImageButton);

    // Image upload component should handle the file
    expect(screen.getByTestId('image-upload')).toBeInTheDocument();
  });

  it('shows fertilizer schedule options', () => {
    render(
      <PlantInstanceForm
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    const scheduleSelect = screen.getByRole('combobox');
    expect(scheduleSelect).toBeInTheDocument();
    
    // Check that options are available
    expect(screen.getByText(/Weekly/)).toBeInTheDocument();
    expect(screen.getByText(/Monthly/)).toBeInTheDocument();
  });

  it('validates date fields correctly', async () => {
    const user = userEvent.setup();

    render(
      <PlantInstanceForm
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    // Try to set a future date for last fertilized
    const inputs = screen.getAllByDisplayValue('');
    const lastFertilizedInput = inputs.find(input => input.getAttribute('name') === 'lastFertilized');
    expect(lastFertilizedInput).toBeDefined();
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    
    await user.type(lastFertilizedInput!, futureDate.toISOString().split('T')[0]);

    // The form should prevent future dates
    expect(lastFertilizedInput).toHaveAttribute('max', new Date().toISOString().split('T')[0]);
  });

  it('shows taxonomy form when clicking "Add new plant"', async () => {
    const user = userEvent.setup();

    // Mock the create plant API call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        success: true, 
        data: { 
          id: 1, 
          family: 'Test Family', 
          genus: 'Test Genus', 
          species: 'testspecies',
          cultivar: null,
          commonName: 'Test Plant', 
          isVerified: false 
        } 
      }),
    } as Response);

    render(
      <PlantInstanceForm
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    // Click the "Add new plant" button
    const addNewButton = screen.getByTestId('add-new-plant');
    await user.click(addNewButton);

    // Should show the taxonomy form
    await waitFor(() => {
      expect(screen.getByText('Create New Plant Type')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Query')).toBeInTheDocument(); // commonName pre-filled
    });

    // Fill out the taxonomy form
    const familyInput = screen.getByPlaceholderText('e.g., Araceae');
    const genusInput = screen.getByPlaceholderText('e.g., Monstera');
    const speciesInput = screen.getByPlaceholderText('e.g., deliciosa');

    await user.type(familyInput, 'Test Family');
    await user.type(genusInput, 'Test Genus');
    await user.type(speciesInput, 'testspecies');

    // Submit the taxonomy form
    const createPlantButton = screen.getByText('Create Plant Type');
    await user.click(createPlantButton);

    // Should call the API to create the plant
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/plants', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Test Family'),
      }));
    });
  });
});