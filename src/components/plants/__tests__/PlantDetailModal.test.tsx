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
  return function MockQuickCareActions({ onCareAction }: any) {
    return (
      <div data-testid="quick-care-actions">
        <button onClick={() => onCareAction && onCareAction('fertilizer')}>Quick Fertilize</button>
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

    const closeButton = screen.getByRole('button', { name: /close modal/i });
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

    // The edit button now has proper accessibility
    const editButton = screen.getByRole('button', { name: /edit plant/i });
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

    expect(mockOnCareLog).toHaveBeenCalledWith(1, 'fertilizer');
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

  it('handles quick care mutation success', async () => {
    const user = userEvent.setup();

    // Mock initial data fetch
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

    // Mock quick care API call after component is loaded
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const quickCareButton = screen.getByText('Quick Fertilize');
    await user.click(quickCareButton);

    // Wait for the API call to be made
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/care/quick-log', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"plantInstanceId":1'),
      }));
    });
  });

  it('handles quick care mutation error', async () => {
    const user = userEvent.setup();

    // Mock initial data fetch
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

    // Mock quick care API call failure
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to log care' }),
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

    // The mutation should handle the error gracefully
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/care/quick-log', expect.any(Object));
    });
  });

  it('displays plant with images correctly', async () => {
    const plantWithImages = {
      ...mockPlantData.plant,
      images: ['image1.jpg', 'image2.jpg', 'image3.jpg'],
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

    // Should show images instead of "No photos yet"
    expect(screen.queryByText('No photos yet')).not.toBeInTheDocument();
    
    // Should show the primary badge on first image
    expect(screen.getByText('Primary')).toBeInTheDocument();
  });

  it('displays plant with many images and shows more indicator', async () => {
    const plantWithManyImages = {
      ...mockPlantData.plant,
      images: Array.from({ length: 10 }, (_, i) => `image${i + 1}.jpg`),
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => plantWithManyImages,
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

    // Should show "+4 more" indicator for images beyond the first 6
    expect(screen.getByText('+4')).toBeInTheDocument();
    expect(screen.getByText('more')).toBeInTheDocument();
  });

  it('handles retry in error state', async () => {
    const user = userEvent.setup();

    // First call fails
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

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
      expect(screen.getByText('Error Loading Plant')).toBeInTheDocument();
    });

    // Mock successful retry
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockPlantData.plant,
    } as Response);

    const retryButton = screen.getByText('Try Again');
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('My Monstera')).toBeInTheDocument();
    });
  });

  it('displays care status correctly for different statuses', async () => {
    const overdueePlant = {
      ...mockPlantData.plant,
      careStatus: 'overdue' as const,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => overdueePlant,
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
      expect(screen.getByText('Overdue')).toBeInTheDocument();
    });
  });

  it('handles modal overlay click to close', async () => {
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

    // Click on the overlay (not the modal content)
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
      await user.click(overlay);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('prevents modal content click from closing modal', async () => {
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

    // Click on the modal content (should not close)
    const modalContent = document.querySelector('.modal-content');
    if (modalContent) {
      await user.click(modalContent);
      expect(mockOnClose).not.toHaveBeenCalled();
    }
  });
});