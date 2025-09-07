import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PlantDetailModal from '../PlantDetailModal';
import { createMockPlantInstance } from '@/test-utils/helpers';

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />;
  };
});

// Mock child components
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

jest.mock('../PlantImageGallery', () => {
  return function MockPlantImageGallery({ isOpen, onClose }: any) {
    return isOpen ? (
      <div data-testid="plant-image-gallery">
        <button onClick={onClose}>Close Gallery</button>
      </div>
    ) : null;
  };
});

jest.mock('../PlantLineage', () => {
  return function MockPlantLineage() {
    return <div data-testid="plant-lineage">Plant Lineage</div>;
  };
});

jest.mock('../../care/QuickCareActions', () => {
  return function MockQuickCareActions({ onCareLog }: any) {
    return (
      <div data-testid="quick-care-actions">
        <button onClick={() => onCareLog && onCareLog('fertilizer')}>Quick Fertilize</button>
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

describe('PlantDetailModal', () => {
  const mockOnClose = jest.fn();
  const mockOnEdit = jest.fn();
  const mockOnCareLog = jest.fn();

  const mockPlantData = {
    plant: createMockPlantInstance({
      id: 1,
      nickname: 'Test Plant',
      location: 'Living Room',
    }),
    careHistory: [],
    propagations: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  it('renders modal when open', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPlantData.plant,
    } as Response);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    render(
      <PlantDetailModal
        plantId={1}
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onCareLog={mockOnCareLog}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('My Monstera')).toBeInTheDocument();
    });
  });

  it('does not render when closed', () => {
    render(
      <PlantDetailModal
        plantId={1}
        isOpen={false}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onCareLog={mockOnCareLog}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByText('Test Plant')).not.toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockFetch.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(
      <PlantDetailModal
        plantId={1}
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onCareLog={mockOnCareLog}
      />,
      { wrapper: createWrapper() }
    );

    // Loading state shows skeleton animation
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('handles error state', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

    render(
      <PlantDetailModal
        plantId={1}
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onCareLog={mockOnCareLog}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('handles close button click', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockPlantData.plant,
    } as Response);

    render(
      <PlantDetailModal
        plantId={1}
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onCareLog={mockOnCareLog}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('My Monstera')).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles tab navigation', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockPlantData.plant,
    } as Response);

    render(
      <PlantDetailModal
        plantId={1}
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onCareLog={mockOnCareLog}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('My Monstera')).toBeInTheDocument();
    });

    // Click on Care History tab
    const careTab = screen.getByRole('button', { name: /Care History/i });
    await user.click(careTab);

    expect(screen.getByTestId('care-history-timeline')).toBeInTheDocument();
  });

  it('handles edit button click', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockPlantData.plant,
    } as Response);

    render(
      <PlantDetailModal
        plantId={1}
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onCareLog={mockOnCareLog}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('My Monstera')).toBeInTheDocument();
    });

    // The edit button is the one with the pencil icon
    const editButton = screen.getByRole('button', { name: '' }); // The edit button doesn't have a name
    await user.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockPlantData.plant);
  });

  it('handles quick care actions', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockPlantData.plant,
    } as Response);

    render(
      <PlantDetailModal
        plantId={1}
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onCareLog={mockOnCareLog}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('My Monstera')).toBeInTheDocument();
    });

    const quickCareButton = screen.getByText('Quick Fertilize');
    await user.click(quickCareButton);

    expect(mockOnCareLog).toHaveBeenCalledWith('fertilizer');
  });

  it('opens image gallery when image is clicked', async () => {
    const user = userEvent.setup();
    const plantWithImages = {
      ...mockPlantData.plant,
      images: ['image1.jpg', 'image2.jpg'],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => plantWithImages,
    } as Response);

    render(
      <PlantDetailModal
        plantId={1}
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onCareLog={mockOnCareLog}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('My Monstera')).toBeInTheDocument();
    });

    // Click on the first image to open gallery
    const images = screen.getAllByAltText(/My Monstera/);
    await user.click(images[0]);

    expect(screen.getByTestId('plant-image-gallery')).toBeInTheDocument();
  });

  it('handles keyboard navigation', () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockPlantData.plant,
    } as Response);

    render(
      <PlantDetailModal
        plantId={1}
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onCareLog={mockOnCareLog}
      />,
      { wrapper: createWrapper() }
    );

    // Test Escape key
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('fetches plant data when opened', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockPlantData.plant,
    } as Response);

    render(
      <PlantDetailModal
        plantId={1}
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onCareLog={mockOnCareLog}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/plant-instances/1');
    });
  });
});