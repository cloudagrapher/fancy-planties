import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlantImageGallery from '../PlantImageGallery';

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />;
  };
});

describe('PlantImageGallery', () => {
  const mockImages = [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg',
    'https://example.com/image3.jpg',
  ];

  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders gallery when open', () => {
    render(
      <PlantImageGallery
        images={mockImages}
        initialIndex={0}
        plantName="Test Plant"
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Test Plant')).toBeInTheDocument();
    expect(screen.getByText('1 of 3')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <PlantImageGallery
        images={mockImages}
        initialIndex={0}
        plantName="Test Plant"
        isOpen={false}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('Test Plant')).not.toBeInTheDocument();
  });

  it('shows navigation arrows for multiple images', () => {
    render(
      <PlantImageGallery
        images={mockImages}
        initialIndex={0}
        plantName="Test Plant"
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTitle('Previous image')).toBeInTheDocument();
    expect(screen.getByTitle('Next image')).toBeInTheDocument();
  });

  it('does not show navigation arrows for single image', () => {
    render(
      <PlantImageGallery
        images={['https://example.com/image1.jpg']}
        initialIndex={0}
        plantName="Test Plant"
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByTitle('Previous image')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Next image')).not.toBeInTheDocument();
  });

  it('handles close button click', async () => {
    const user = userEvent.setup();

    render(
      <PlantImageGallery
        images={mockImages}
        initialIndex={0}
        plantName="Test Plant"
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByTitle('Close gallery');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles keyboard navigation', () => {
    render(
      <PlantImageGallery
        images={mockImages}
        initialIndex={0}
        plantName="Test Plant"
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Test Escape key
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows zoom toggle button', () => {
    render(
      <PlantImageGallery
        images={mockImages}
        initialIndex={0}
        plantName="Test Plant"
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTitle('Zoom in')).toBeInTheDocument();
  });

  it('displays thumbnail strip for multiple images', () => {
    render(
      <PlantImageGallery
        images={mockImages}
        initialIndex={0}
        plantName="Test Plant"
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Should show thumbnails for each image
    expect(screen.getByAltText('Test Plant thumbnail 1')).toBeInTheDocument();
    expect(screen.getByAltText('Test Plant thumbnail 2')).toBeInTheDocument();
    expect(screen.getByAltText('Test Plant thumbnail 3')).toBeInTheDocument();
  });

  it('shows usage instructions', () => {
    render(
      <PlantImageGallery
        images={mockImages}
        initialIndex={0}
        plantName="Test Plant"
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(/Click image to zoom/)).toBeInTheDocument();
  });

  it('handles navigation button clicks', async () => {
    const user = userEvent.setup();

    render(
      <PlantImageGallery
        images={mockImages}
        initialIndex={0}
        plantName="Test Plant"
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Initially showing image 1 of 3
    expect(screen.getByText('1 of 3')).toBeInTheDocument();

    // Click next button
    const nextButton = screen.getByTitle('Next image');
    await user.click(nextButton);

    // Should now show image 2 of 3
    expect(screen.getByText('2 of 3')).toBeInTheDocument();
  });

  it('handles image load errors gracefully', () => {
    render(
      <PlantImageGallery
        images={mockImages}
        initialIndex={0}
        plantName="Test Plant"
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Simulate image load error
    const mainImage = screen.getByAltText('Test Plant photo 1');
    fireEvent.error(mainImage);

    // Component should still be rendered
    expect(screen.getByText('Test Plant')).toBeInTheDocument();
  });
});