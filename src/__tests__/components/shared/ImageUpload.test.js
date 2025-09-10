/**
 * @jest-environment jsdom
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test-utils/helpers/render-helpers';
import ImageUpload from '@/components/shared/ImageUpload';

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(),
}));

// Mock FileReader
const mockFileReader = {
  readAsDataURL: jest.fn(),
  result: null,
  onload: null,
  onerror: null,
};

global.FileReader = jest.fn(() => mockFileReader);

describe('ImageUpload', () => {
  const defaultProps = {
    onImagesChange: jest.fn(),
    maxImages: 6,
    maxSizePerImage: 5 * 1024 * 1024, // 5MB
    acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  };

  const mockUseDropzone = require('react-dropzone').useDropzone;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default dropzone mock
    mockUseDropzone.mockReturnValue({
      getRootProps: () => ({
        'data-testid': 'dropzone',
      }),
      getInputProps: () => ({
        'data-testid': 'file-input',
      }),
      isDragActive: false,
    });

    // Reset FileReader mock
    mockFileReader.readAsDataURL.mockClear();
    mockFileReader.result = null;
    mockFileReader.onload = null;
    mockFileReader.onerror = null;
  });

  describe('Basic Rendering', () => {
    it('renders upload area', () => {
      renderWithProviders(<ImageUpload {...defaultProps} />);

      expect(screen.getByTestId('dropzone')).toBeInTheDocument();
      expect(screen.getByText(/click to upload/i)).toBeInTheDocument();
      expect(screen.getByText(/or drag and drop/i)).toBeInTheDocument();
    });

    it('shows file type and size limits', () => {
      renderWithProviders(<ImageUpload {...defaultProps} />);

      expect(screen.getByText(/jpeg, png, or webp up to 5mb each/i)).toBeInTheDocument();
    });

    it('shows current selection count', () => {
      renderWithProviders(<ImageUpload {...defaultProps} />);

      expect(screen.getByText(/0 of 6 images selected/i)).toBeInTheDocument();
    });

    it('applies custom className', () => {
      renderWithProviders(
        <ImageUpload {...defaultProps} className="custom-upload-class" />
      );

      const container = screen.getByTestId('dropzone').closest('div');
      expect(container).toHaveClass('custom-upload-class');
    });
  });

  describe('Drag and Drop States', () => {
    it('shows active drag state', () => {
      mockUseDropzone.mockReturnValue({
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: true,
      });

      renderWithProviders(<ImageUpload {...defaultProps} />);

      expect(screen.getByText(/drop images here/i)).toBeInTheDocument();
    });

    it('applies active drag styling', () => {
      mockUseDropzone.mockReturnValue({
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: true,
      });

      renderWithProviders(<ImageUpload {...defaultProps} />);

      const dropzone = screen.getByTestId('dropzone');
      expect(dropzone).toHaveClass('border-primary-400', 'bg-primary-50');
    });

    it('shows default state when not dragging', () => {
      renderWithProviders(<ImageUpload {...defaultProps} />);

      const dropzone = screen.getByTestId('dropzone');
      expect(dropzone).toHaveClass('border-gray-300');
    });
  });

  describe('File Selection and Validation', () => {
    const createMockFile = (name, size, type) => {
      const file = new File(['content'], name, { type });
      Object.defineProperty(file, 'size', { value: size });
      return file;
    };

    it('accepts valid image files', async () => {
      const validFile = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg'); // 1MB
      
      let onDropCallback;
      mockUseDropzone.mockImplementation(({ onDrop }) => {
        onDropCallback = onDrop;
        return {
          getRootProps: () => ({ 'data-testid': 'dropzone' }),
          getInputProps: () => ({ 'data-testid': 'file-input' }),
          isDragActive: false,
        };
      });

      renderWithProviders(<ImageUpload {...defaultProps} />);

      // Simulate file drop
      onDropCallback([validFile]);

      expect(defaultProps.onImagesChange).toHaveBeenCalledWith([validFile]);
    });

    it('rejects files that are too large', async () => {
      const largeFile = createMockFile('large.jpg', 10 * 1024 * 1024, 'image/jpeg'); // 10MB
      
      let onDropCallback;
      mockUseDropzone.mockImplementation(({ onDrop }) => {
        onDropCallback = onDrop;
        return {
          getRootProps: () => ({ 'data-testid': 'dropzone' }),
          getInputProps: () => ({ 'data-testid': 'file-input' }),
          isDragActive: false,
        };
      });

      renderWithProviders(<ImageUpload {...defaultProps} />);

      onDropCallback([largeFile]);

      await waitFor(() => {
        expect(screen.getByText(/file too large/i)).toBeInTheDocument();
        expect(screen.getByText(/maximum size is 5mb/i)).toBeInTheDocument();
      });

      expect(defaultProps.onImagesChange).not.toHaveBeenCalled();
    });

    it('rejects invalid file types', async () => {
      const invalidFile = createMockFile('document.pdf', 1024, 'application/pdf');
      
      let onDropCallback;
      mockUseDropzone.mockImplementation(({ onDrop }) => {
        onDropCallback = onDrop;
        return {
          getRootProps: () => ({ 'data-testid': 'dropzone' }),
          getInputProps: () => ({ 'data-testid': 'file-input' }),
          isDragActive: false,
        };
      });

      renderWithProviders(<ImageUpload {...defaultProps} />);

      onDropCallback([invalidFile]);

      await waitFor(() => {
        expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
        expect(screen.getByText(/please use jpeg, png, or webp/i)).toBeInTheDocument();
      });
    });

    it('prevents exceeding maximum file count', async () => {
      const files = Array.from({ length: 8 }, (_, i) => 
        createMockFile(`test${i}.jpg`, 1024, 'image/jpeg')
      );
      
      let onDropCallback;
      mockUseDropzone.mockImplementation(({ onDrop }) => {
        onDropCallback = onDrop;
        return {
          getRootProps: () => ({ 'data-testid': 'dropzone' }),
          getInputProps: () => ({ 'data-testid': 'file-input' }),
          isDragActive: false,
        };
      });

      renderWithProviders(<ImageUpload {...defaultProps} />);

      onDropCallback(files);

      await waitFor(() => {
        expect(screen.getByText(/maximum 6 images allowed/i)).toBeInTheDocument();
      });
    });

    it('prevents duplicate files', async () => {
      const file1 = createMockFile('test.jpg', 1024, 'image/jpeg');
      const file2 = createMockFile('test.jpg', 1024, 'image/jpeg'); // Same name and size
      
      let onDropCallback;
      mockUseDropzone.mockImplementation(({ onDrop }) => {
        onDropCallback = onDrop;
        return {
          getRootProps: () => ({ 'data-testid': 'dropzone' }),
          getInputProps: () => ({ 'data-testid': 'file-input' }),
          isDragActive: false,
        };
      });

      renderWithProviders(<ImageUpload {...defaultProps} />);

      // Add first file
      onDropCallback([file1]);
      
      // Try to add duplicate
      onDropCallback([file2]);

      await waitFor(() => {
        expect(screen.getByText(/file already selected/i)).toBeInTheDocument();
      });
    });
  });

  describe('File Preview Generation', () => {
    it('generates previews for selected images', async () => {
      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      
      let onDropCallback;
      mockUseDropzone.mockImplementation(({ onDrop }) => {
        onDropCallback = onDrop;
        return {
          getRootProps: () => ({ 'data-testid': 'dropzone' }),
          getInputProps: () => ({ 'data-testid': 'file-input' }),
          isDragActive: false,
        };
      });

      renderWithProviders(<ImageUpload {...defaultProps} />);

      onDropCallback([file]);

      // Simulate FileReader success
      mockFileReader.result = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD';
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: mockFileReader.result } });
      }

      await waitFor(() => {
        expect(screen.getByText(/selected images \(1\)/i)).toBeInTheDocument();
      });
    });

    it('handles FileReader errors gracefully', async () => {
      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      
      let onDropCallback;
      mockUseDropzone.mockImplementation(({ onDrop }) => {
        onDropCallback = onDrop;
        return {
          getRootProps: () => ({ 'data-testid': 'dropzone' }),
          getInputProps: () => ({ 'data-testid': 'file-input' }),
          isDragActive: false,
        };
      });

      renderWithProviders(<ImageUpload {...defaultProps} />);

      onDropCallback([file]);

      // Simulate FileReader error
      if (mockFileReader.onerror) {
        mockFileReader.onerror();
      }

      await waitFor(() => {
        expect(screen.getByText(/failed to read file/i)).toBeInTheDocument();
      });
    });
  });

  describe('File Management', () => {
    const setupWithFiles = async () => {
      const files = [
        createMockFile('test1.jpg', 1024, 'image/jpeg'),
        createMockFile('test2.jpg', 1024, 'image/jpeg'),
      ];
      
      let onDropCallback;
      mockUseDropzone.mockImplementation(({ onDrop }) => {
        onDropCallback = onDrop;
        return {
          getRootProps: () => ({ 'data-testid': 'dropzone' }),
          getInputProps: () => ({ 'data-testid': 'file-input' }),
          isDragActive: false,
        };
      });

      const component = renderWithProviders(<ImageUpload {...defaultProps} />);

      onDropCallback(files);

      // Simulate successful preview generation
      mockFileReader.result = 'data:image/jpeg;base64,test';
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: mockFileReader.result } });
      }

      return component;
    };

    it('removes individual files', async () => {
      const user = userEvent.setup();
      await setupWithFiles();

      await waitFor(() => {
        expect(screen.getByText(/selected images \(2\)/i)).toBeInTheDocument();
      });

      const removeButtons = screen.getAllByLabelText(/remove image/i);
      await user.click(removeButtons[0]);

      expect(defaultProps.onImagesChange).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: 'test2.jpg' })])
      );
    });

    it('clears all files', async () => {
      const user = userEvent.setup();
      await setupWithFiles();

      await waitFor(() => {
        expect(screen.getByText(/selected images \(2\)/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/clear all/i));

      expect(defaultProps.onImagesChange).toHaveBeenCalledWith([]);
    });

    it('sets primary image', async () => {
      const user = userEvent.setup();
      await setupWithFiles();

      await waitFor(() => {
        expect(screen.getByText(/selected images \(2\)/i)).toBeInTheDocument();
      });

      // The second image should have a "Set Primary" button
      const setPrimaryButtons = screen.getAllByText(/set primary/i);
      await user.click(setPrimaryButtons[0]);

      // Should reorder files with selected image first
      expect(defaultProps.onImagesChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'test2.jpg' }),
          expect.objectContaining({ name: 'test1.jpg' }),
        ])
      );
    });

    it('shows primary badge on first image', async () => {
      await setupWithFiles();

      await waitFor(() => {
        expect(screen.getByText('Primary')).toBeInTheDocument();
      });
    });
  });

  describe('Upload Functionality', () => {
    const mockOnUpload = jest.fn();

    beforeEach(() => {
      mockOnUpload.mockClear();
    });

    it('shows upload button when onUpload is provided and showUploadProgress is true', async () => {
      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      
      let onDropCallback;
      mockUseDropzone.mockImplementation(({ onDrop }) => {
        onDropCallback = onDrop;
        return {
          getRootProps: () => ({ 'data-testid': 'dropzone' }),
          getInputProps: () => ({ 'data-testid': 'file-input' }),
          isDragActive: false,
        };
      });

      renderWithProviders(
        <ImageUpload 
          {...defaultProps} 
          onUpload={mockOnUpload}
          showUploadProgress={true}
        />
      );

      onDropCallback([file]);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload selected images/i })).toBeInTheDocument();
      });
    });

    it('calls onUpload when upload button is clicked', async () => {
      const user = userEvent.setup();
      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      mockOnUpload.mockResolvedValue(['http://example.com/image1.jpg']);
      
      let onDropCallback;
      mockUseDropzone.mockImplementation(({ onDrop }) => {
        onDropCallback = onDrop;
        return {
          getRootProps: () => ({ 'data-testid': 'dropzone' }),
          getInputProps: () => ({ 'data-testid': 'file-input' }),
          isDragActive: false,
        };
      });

      renderWithProviders(
        <ImageUpload 
          {...defaultProps} 
          onUpload={mockOnUpload}
          showUploadProgress={true}
        />
      );

      onDropCallback([file]);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload selected images/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /upload selected images/i }));

      expect(mockOnUpload).toHaveBeenCalledWith([file]);
    });

    it('shows loading state during upload', async () => {
      const user = userEvent.setup();
      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      
      // Mock a delayed upload
      mockOnUpload.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(['url']), 100))
      );
      
      let onDropCallback;
      mockUseDropzone.mockImplementation(({ onDrop }) => {
        onDropCallback = onDrop;
        return {
          getRootProps: () => ({ 'data-testid': 'dropzone' }),
          getInputProps: () => ({ 'data-testid': 'file-input' }),
          isDragActive: false,
        };
      });

      renderWithProviders(
        <ImageUpload 
          {...defaultProps} 
          onUpload={mockOnUpload}
          showUploadProgress={true}
        />
      );

      onDropCallback([file]);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload selected images/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /upload selected images/i }));

      expect(screen.getByText(/uploading/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /uploading images/i })).toBeDisabled();
    });

    it('handles upload errors', async () => {
      const user = userEvent.setup();
      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      mockOnUpload.mockRejectedValue(new Error('Upload failed'));
      
      let onDropCallback;
      mockUseDropzone.mockImplementation(({ onDrop }) => {
        onDropCallback = onDrop;
        return {
          getRootProps: () => ({ 'data-testid': 'dropzone' }),
          getInputProps: () => ({ 'data-testid': 'file-input' }),
          isDragActive: false,
        };
      });

      renderWithProviders(
        <ImageUpload 
          {...defaultProps} 
          onUpload={mockOnUpload}
          showUploadProgress={true}
        />
      );

      onDropCallback([file]);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload selected images/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /upload selected images/i }));

      await waitFor(() => {
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for buttons', () => {
      renderWithProviders(<ImageUpload {...defaultProps} />);

      const uploadButton = screen.getByLabelText(/click to select images for upload/i);
      expect(uploadButton).toBeInTheDocument();
      expect(uploadButton).toHaveAttribute('title', 'Select images to upload');
    });

    it('has proper ARIA labels for file management buttons', async () => {
      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      
      let onDropCallback;
      mockUseDropzone.mockImplementation(({ onDrop }) => {
        onDropCallback = onDrop;
        return {
          getRootProps: () => ({ 'data-testid': 'dropzone' }),
          getInputProps: () => ({ 'data-testid': 'file-input' }),
          isDragActive: false,
        };
      });

      renderWithProviders(<ImageUpload {...defaultProps} />);

      onDropCallback([file]);

      await waitFor(() => {
        expect(screen.getByLabelText(/remove image 1/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/clear all selected images/i)).toBeInTheDocument();
      });
    });

    it('provides loading status for screen readers', async () => {
      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      
      let onDropCallback;
      mockUseDropzone.mockImplementation(({ onDrop }) => {
        onDropCallback = onDrop;
        return {
          getRootProps: () => ({ 'data-testid': 'dropzone' }),
          getInputProps: () => ({ 'data-testid': 'file-input' }),
          isDragActive: false,
        };
      });

      renderWithProviders(<ImageUpload {...defaultProps} />);

      onDropCallback([file]);

      await waitFor(() => {
        expect(screen.getByLabelText(/loading image preview/i)).toBeInTheDocument();
        expect(screen.getByText(/loading image preview/i, { selector: '.sr-only' })).toBeInTheDocument();
      });
    });
  });

  describe('File Size Formatting', () => {
    it('formats file sizes correctly', async () => {
      const files = [
        createMockFile('small.jpg', 1024, 'image/jpeg'), // 1KB
        createMockFile('medium.jpg', 1024 * 1024, 'image/jpeg'), // 1MB
        createMockFile('large.jpg', 2.5 * 1024 * 1024, 'image/jpeg'), // 2.5MB
      ];
      
      let onDropCallback;
      mockUseDropzone.mockImplementation(({ onDrop }) => {
        onDropCallback = onDrop;
        return {
          getRootProps: () => ({ 'data-testid': 'dropzone' }),
          getInputProps: () => ({ 'data-testid': 'file-input' }),
          isDragActive: false,
        };
      });

      renderWithProviders(<ImageUpload {...defaultProps} />);

      onDropCallback(files);

      await waitFor(() => {
        expect(screen.getByText('1 KB')).toBeInTheDocument();
        expect(screen.getByText('1 MB')).toBeInTheDocument();
        expect(screen.getByText('2.5 MB')).toBeInTheDocument();
      });
    });
  });

  describe('Tips and Help Text', () => {
    it('shows helpful tips when files are selected', async () => {
      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      
      let onDropCallback;
      mockUseDropzone.mockImplementation(({ onDrop }) => {
        onDropCallback = onDrop;
        return {
          getRootProps: () => ({ 'data-testid': 'dropzone' }),
          getInputProps: () => ({ 'data-testid': 'file-input' }),
          isDragActive: false,
        };
      });

      renderWithProviders(<ImageUpload {...defaultProps} />);

      onDropCallback([file]);

      await waitFor(() => {
        expect(screen.getByText(/the first image will be used as the primary photo/i)).toBeInTheDocument();
      });
    });
  });
});