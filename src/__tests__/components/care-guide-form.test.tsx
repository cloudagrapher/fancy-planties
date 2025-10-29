/**
 * Care Guide Form Changes Tests
 * 
 * Tests watering method field removal
 * Tests description field prominence and functionality
 * Tests S3 image upload functionality
 * Tests form submission with S3 images
 * Tests form validation
 * 
 * Requirements: 1, 2, 4.1
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CareGuideForm from '@/components/handbook/CareGuideForm';

// Mock S3ImageUpload component
jest.mock('@/components/shared/S3ImageUpload', () => {
  return function MockS3ImageUpload({ onUploadComplete }: any) {
    return (
      <div data-testid="s3-image-upload">
        <button
          onClick={() => onUploadComplete(['test-key-1.jpg', 'test-key-2.jpg'])}
        >
          Upload Images
        </button>
      </div>
    );
  };
});

describe('Care Guide Form Changes', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();
  const mockUserId = 1;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Watering Method Field Removal (Requirement 1)', () => {
    it('should not display method field in watering section', () => {
      render(
        <CareGuideForm
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          userId={mockUserId}
        />
      );

      // Switch to Care Details tab
      const careTab = screen.getByRole('button', { name: /care details/i });
      fireEvent.click(careTab);

      // Verify watering section exists but method field does not
      expect(screen.queryByLabelText(/method/i)).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/method/i)).not.toBeInTheDocument();
    });

    it('should not include method in watering data structure', () => {
      render(
        <CareGuideForm
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          userId={mockUserId}
        />
      );

      // Fill required fields first
      const titleInput = screen.getByPlaceholderText(/complete monstera care guide/i);
      fireEvent.change(titleInput, { target: { value: 'Test Guide' } });
      
      const familyInput = screen.getByPlaceholderText(/e\.g\., araceae/i);
      fireEvent.change(familyInput, { target: { value: 'Araceae' } });

      // Fill in watering frequency
      const careTab = screen.getByRole('button', { name: /care details/i });
      fireEvent.click(careTab);

      const frequencyInput = screen.getByPlaceholderText(/weekly.*when soil is dry/i);
      fireEvent.change(frequencyInput, { target: { value: 'Weekly' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create guide/i });
      fireEvent.click(submitButton);

      // Verify submitted data does not contain method field
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          watering: expect.objectContaining({
            frequency: 'Weekly',
            tips: expect.any(String)
          })
        })
      );

      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData.watering).not.toHaveProperty('method');
    });
  });

  describe('Description Field Prominence (Requirement 2)', () => {
    it('should display description field in Basic Info tab', () => {
      render(
        <CareGuideForm
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          userId={mockUserId}
        />
      );

      // Verify description field is visible in Basic Info tab
      const descriptionField = screen.getByPlaceholderText(/comprehensive overview.*care requirements/i);
      expect(descriptionField).toBeInTheDocument();
      expect(descriptionField.tagName).toBe('TEXTAREA');
    });

    it('should accept and store description text', () => {
      render(
        <CareGuideForm
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          userId={mockUserId}
        />
      );

      const descriptionText = 'This is a comprehensive care guide for tropical plants.';
      const descriptionField = screen.getByPlaceholderText(/comprehensive overview.*care requirements/i);
      
      fireEvent.change(descriptionField, { target: { value: descriptionText } });

      // Fill required fields
      const titleInput = screen.getByPlaceholderText(/complete monstera care guide/i);
      fireEvent.change(titleInput, { target: { value: 'Test Guide' } });
      
      const familyInput = screen.getByPlaceholderText(/e\.g\., araceae/i);
      fireEvent.change(familyInput, { target: { value: 'Araceae' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create guide/i });
      fireEvent.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: descriptionText
        })
      );
    });

    it('should have textarea with multiple rows for better visibility', () => {
      render(
        <CareGuideForm
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          userId={mockUserId}
        />
      );

      const descriptionField = screen.getByPlaceholderText(/comprehensive overview.*care requirements/i);
      const rows = descriptionField.getAttribute('rows');
      
      // Verify textarea has 4-5 rows as per design
      expect(parseInt(rows || '0')).toBeGreaterThanOrEqual(4);
    });
  });

  describe('S3 Image Upload Integration (Requirement 4.1)', () => {
    it('should render S3ImageUpload component', () => {
      render(
        <CareGuideForm
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          userId={mockUserId}
        />
      );

      expect(screen.getByTestId('s3-image-upload')).toBeInTheDocument();
    });

    it('should update form state with S3 image keys on upload', async () => {
      render(
        <CareGuideForm
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          userId={mockUserId}
        />
      );

      // Fill required fields
      const titleInput = screen.getByPlaceholderText(/complete monstera care guide/i);
      fireEvent.change(titleInput, { target: { value: 'Test Guide' } });
      
      const familyInput = screen.getByPlaceholderText(/e\.g\., araceae/i);
      fireEvent.change(familyInput, { target: { value: 'Araceae' } });

      // Trigger image upload
      const uploadButton = screen.getByText('Upload Images');
      fireEvent.click(uploadButton);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create guide/i });
      fireEvent.click(submitButton);

      // Verify S3 keys are included in submission
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            s3ImageKeys: ['test-key-1.jpg', 'test-key-2.jpg']
          })
        );
      });
    });

    it('should not include Base64 images in form submission', () => {
      render(
        <CareGuideForm
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          userId={mockUserId}
        />
      );

      // Fill required fields
      const titleInput = screen.getByPlaceholderText(/complete monstera care guide/i);
      fireEvent.change(titleInput, { target: { value: 'Test Guide' } });
      
      const familyInput = screen.getByPlaceholderText(/e\.g\., araceae/i);
      fireEvent.change(familyInput, { target: { value: 'Araceae' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create guide/i });
      fireEvent.click(submitButton);

      const submittedData = mockOnSubmit.mock.calls[0][0];
      
      // Verify no Base64 image data is present
      expect(submittedData).not.toHaveProperty('images');
      expect(submittedData.s3ImageKeys).toBeDefined();
    });
  });

  describe('Form Validation', () => {
    it('should require taxonomy level selection', () => {
      render(
        <CareGuideForm
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          userId={mockUserId}
        />
      );

      // Verify taxonomy level selector exists
      const taxonomySelect = screen.getByRole('combobox');
      expect(taxonomySelect).toBeInTheDocument();
    });

    it('should require title field', () => {
      render(
        <CareGuideForm
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          userId={mockUserId}
        />
      );

      const titleInput = screen.getByPlaceholderText(/complete monstera care guide/i);
      expect(titleInput).toBeInTheDocument();
      expect(titleInput).toHaveAttribute('required');
    });

    it('should submit form with valid data', () => {
      render(
        <CareGuideForm
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          userId={mockUserId}
        />
      );

      // Fill required fields
      const titleInput = screen.getByPlaceholderText(/complete monstera care guide/i);
      fireEvent.change(titleInput, { target: { value: 'Monstera Care Guide' } });

      const familyInput = screen.getByPlaceholderText(/e\.g\., araceae/i);
      fireEvent.change(familyInput, { target: { value: 'Araceae' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /create guide/i });
      fireEvent.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Form Initialization with Existing Data', () => {
    it('should populate form with initial data for editing', () => {
      const initialData = {
        title: 'Existing Care Guide',
        description: 'Existing description',
        family: 'Araceae',
        s3ImageKeys: ['existing-key-1.jpg'],
        watering: {
          frequency: 'Weekly',
          tips: 'Water thoroughly'
        }
      };

      render(
        <CareGuideForm
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          userId={mockUserId}
          initialData={initialData}
        />
      );

      // Verify fields are populated
      expect(screen.getByDisplayValue('Existing Care Guide')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Existing description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Araceae')).toBeInTheDocument();
    });

    it('should not have method field even with legacy data', () => {
      const legacyData = {
        title: 'Legacy Guide',
        watering: {
          frequency: 'Weekly',
          tips: 'Water well'
        }
      };

      render(
        <CareGuideForm
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          userId={mockUserId}
          initialData={legacyData}
        />
      );

      // Switch to Care Details tab
      const careTab = screen.getByRole('button', { name: /care details/i });
      fireEvent.click(careTab);

      // Verify method field is not rendered
      expect(screen.queryByLabelText(/method/i)).not.toBeInTheDocument();
    });
  });
});
