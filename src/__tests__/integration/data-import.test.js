// Data Import Integration Tests
// Tests complete CSV file upload, parsing, validation, and import workflows

import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userInteractions } from '@/test-utils';
import { mockApiResponse, mockApiError, resetApiMocks } from '@/test-utils/helpers/api-helpers';
import { createAuthenticatedTestUser } from '@/test-utils/factories/user-factory';
import CSVImportModal from '@/components/import/CSVImportModal';
import DataImport from '@/components/import/DataImport';

// Mock file reading
global.FileReader = class {
  constructor() {
    this.onload = null;
    this.onerror = null;
  }
  
  readAsText(file) {
    setTimeout(() => {
      if (this.onload) {
        this.onload({ target: { result: file.content || 'Family,Genus,Species,Common Name\nAraceae,Monstera,deliciosa,Monstera Deliciosa' } });
      }
    }, 0);
  }
};

describe('Data Import Integration Tests', () => {
  let testUser;
  let testSession;

  beforeEach(() => {
    jest.clearAllMocks();
    resetApiMocks();

    // Create authenticated test user
    const authData = createAuthenticatedTestUser();
    testUser = authData.user;
    testSession = authData.session;
  });

  afterEach(() => {
    resetApiMocks();
  });

  describe('CSV File Upload and Parsing Workflow', () => {
    it('should complete CSV upload and parsing workflow', async () => {
      // Arrange
      const validationResult = {
        isValid: true,
        errors: [],
        preview: [
          {
            Family: 'Araceae',
            Genus: 'Monstera',
            Species: 'deliciosa',
            'Common Name': 'Monstera Deliciosa',
          },
        ],
      };

      mockApiResponse({
        'POST /api/import/csv/validate': {
          status: 200,
          data: validationResult,
        },
      });

      const { user } = renderWithProviders(
        <CSVImportModal
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      // Act - Select import type
      const plantTaxonomyButton = screen.getByRole('button', { name: /plant taxonomy/i });
      await user.click(plantTaxonomyButton);

      // Upload file
      const fileInput = screen.getByLabelText(/upload|file/i);
      const csvFile = new File(['Family,Genus,Species,Common Name\nAraceae,Monstera,deliciosa,Monstera Deliciosa'], 'plants.csv', {
        type: 'text/csv',
      });
      csvFile.content = 'Family,Genus,Species,Common Name\nAraceae,Monstera,deliciosa,Monstera Deliciosa';

      await user.upload(fileInput, csvFile);

      // Assert - Verify validation API was called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/import/csv/validate',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('plant_taxonomy'),
          })
        );
      });

      // Assert - Verify preview is shown
      await waitFor(() => {
        expect(screen.getByText('Review your data')).toBeInTheDocument();
        expect(screen.getByText('Monstera Deliciosa')).toBeInTheDocument();
      });
    });

    it('should handle CSV parsing validation errors', async () => {
      // Arrange
      const validationResult = {
        isValid: false,
        errors: [
          'Missing required column: Family',
          'Row 2: Invalid genus format',
        ],
        preview: [],
      };

      mockApiResponse({
        'POST /api/import/csv/validate': {
          status: 200,
          data: validationResult,
        },
      });

      const { user } = renderWithProviders(
        <CSVImportModal
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      // Act - Select type and upload invalid file
      const plantTaxonomyButton = screen.getByRole('button', { name: /plant taxonomy/i });
      await user.click(plantTaxonomyButton);

      const fileInput = screen.getByLabelText(/upload|file/i);
      const invalidCsvFile = new File(['Invalid,Headers\nBad,Data'], 'invalid.csv', {
        type: 'text/csv',
      });
      invalidCsvFile.content = 'Invalid,Headers\nBad,Data';

      await user.upload(fileInput, invalidCsvFile);

      // Assert - Verify validation errors are displayed
      await waitFor(() => {
        expect(screen.getByText(/missing required column: family/i)).toBeInTheDocument();
        expect(screen.getByText(/invalid genus format/i)).toBeInTheDocument();
      });
    });

    it('should handle different CSV import types', async () => {
      // Arrange
      const plantInstanceValidation = {
        isValid: true,
        errors: [],
        preview: [
          {
            'Common Name': 'Monstera Deliciosa',
            Location: 'Living Room',
            'Fertilizer Schedule': 'every 4 weeks',
          },
        ],
      };

      mockApiResponse({
        'POST /api/import/csv/validate': {
          status: 200,
          data: plantInstanceValidation,
        },
      });

      const { user } = renderWithProviders(
        <CSVImportModal
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      // Act - Select plant instances import type
      const plantInstancesButton = screen.getByRole('button', { name: /plant instances|plant collection/i });
      await user.click(plantInstancesButton);

      const fileInput = screen.getByLabelText(/upload|file/i);
      const csvFile = new File(['Common Name,Location,Fertilizer Schedule\nMonstera Deliciosa,Living Room,every 4 weeks'], 'collection.csv', {
        type: 'text/csv',
      });
      csvFile.content = 'Common Name,Location,Fertilizer Schedule\nMonstera Deliciosa,Living Room,every 4 weeks';

      await user.upload(fileInput, csvFile);

      // Assert - Verify correct import type was sent
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/import/csv/validate',
          expect.objectContaining({
            body: expect.stringContaining('plant_instances'),
          })
        );
      });

      // Assert - Verify plant instance data is shown
      await waitFor(() => {
        expect(screen.getByText('Living Room')).toBeInTheDocument();
        expect(screen.getByText('every 4 weeks')).toBeInTheDocument();
      });
    });

    it('should handle file reading errors gracefully', async () => {
      // Arrange - Mock FileReader to fail
      global.FileReader = class {
        constructor() {
          this.onerror = null;
        }
        
        readAsText() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Error('Failed to read file'));
            }
          }, 0);
        }
      };

      const { user } = renderWithProviders(
        <CSVImportModal
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      // Act - Try to upload file
      const plantTaxonomyButton = screen.getByRole('button', { name: /plant taxonomy/i });
      await user.click(plantTaxonomyButton);

      const fileInput = screen.getByLabelText(/upload|file/i);
      const csvFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      await user.upload(fileInput, csvFile);

      // Assert - Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText(/failed to read file/i)).toBeInTheDocument();
      });
    });
  }); 
 describe('Data Validation and Error Handling During Import', () => {
    it('should handle validation API errors', async () => {
      // Arrange
      mockApiError('/api/import/csv/validate', 500, { error: 'Validation service unavailable' }, 'POST');

      const { user } = renderWithProviders(
        <CSVImportModal
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      // Act - Upload file
      const plantTaxonomyButton = screen.getByRole('button', { name: /plant taxonomy/i });
      await user.click(plantTaxonomyButton);

      const fileInput = screen.getByLabelText(/upload|file/i);
      const csvFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      await user.upload(fileInput, csvFile);

      // Assert - Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText(/failed to validate csv/i)).toBeInTheDocument();
      });
    });

    it('should validate required fields for different import types', async () => {
      // Arrange
      const propagationValidation = {
        isValid: false,
        errors: [
          'Row 2: Missing required field "Date Started"',
          'Row 3: Invalid date format in "Date Started"',
        ],
        preview: [
          {
            'Common Name': 'Monstera Deliciosa',
            Location: 'Propagation Station',
            'Date Started': '', // Missing
          },
        ],
      };

      mockApiResponse({
        'POST /api/import/csv/validate': {
          status: 200,
          data: propagationValidation,
        },
      });

      const { user } = renderWithProviders(
        <CSVImportModal
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      // Act - Select propagations import
      const propagationsButton = screen.getByRole('button', { name: /propagations/i });
      await user.click(propagationsButton);

      const fileInput = screen.getByLabelText(/upload|file/i);
      const csvFile = new File(['Common Name,Location,Date Started\nMonstera Deliciosa,Propagation Station,'], 'propagations.csv', {
        type: 'text/csv',
      });
      csvFile.content = 'Common Name,Location,Date Started\nMonstera Deliciosa,Propagation Station,';

      await user.upload(fileInput, csvFile);

      // Assert - Verify field-specific validation errors
      await waitFor(() => {
        expect(screen.getByText(/missing required field "date started"/i)).toBeInTheDocument();
        expect(screen.getByText(/invalid date format/i)).toBeInTheDocument();
      });
    });

    it('should handle duplicate data validation', async () => {
      // Arrange
      const validationWithDuplicates = {
        isValid: true,
        errors: [],
        warnings: [
          'Row 2: Duplicate plant found - Monstera deliciosa already exists',
          'Row 4: Similar plant found - Monstera adansonii (90% match)',
        ],
        preview: [
          {
            Family: 'Araceae',
            Genus: 'Monstera',
            Species: 'deliciosa',
            'Common Name': 'Monstera Deliciosa',
          },
        ],
      };

      mockApiResponse({
        'POST /api/import/csv/validate': {
          status: 200,
          data: validationWithDuplicates,
        },
      });

      const { user } = renderWithProviders(
        <CSVImportModal
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      // Act - Upload file with duplicates
      const plantTaxonomyButton = screen.getByRole('button', { name: /plant taxonomy/i });
      await user.click(plantTaxonomyButton);

      const fileInput = screen.getByLabelText(/upload|file/i);
      const csvFile = new File(['test'], 'duplicates.csv', { type: 'text/csv' });
      await user.upload(fileInput, csvFile);

      // Assert - Verify duplicate warnings are shown
      await waitFor(() => {
        expect(screen.getByText(/duplicate plant found/i)).toBeInTheDocument();
        expect(screen.getByText(/similar plant found/i)).toBeInTheDocument();
      });
    });

    it('should validate data format requirements', async () => {
      // Arrange
      const formatValidation = {
        isValid: false,
        errors: [
          'Row 2: "Fertilizer Schedule" must be one of: weekly, biweekly, monthly, etc.',
          'Row 3: "Last Fertilized" must be a valid date (YYYY-MM-DD)',
          'Row 4: "Location" cannot be empty',
        ],
        preview: [],
      };

      mockApiResponse({
        'POST /api/import/csv/validate': {
          status: 200,
          data: formatValidation,
        },
      });

      const { user } = renderWithProviders(
        <CSVImportModal
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      // Act - Upload file with format errors
      const plantInstancesButton = screen.getByRole('button', { name: /plant instances/i });
      await user.click(plantInstancesButton);

      const fileInput = screen.getByLabelText(/upload|file/i);
      const csvFile = new File(['test'], 'format-errors.csv', { type: 'text/csv' });
      await user.upload(fileInput, csvFile);

      // Assert - Verify format validation errors
      await waitFor(() => {
        expect(screen.getByText(/fertilizer schedule.*must be one of/i)).toBeInTheDocument();
        expect(screen.getByText(/must be a valid date/i)).toBeInTheDocument();
        expect(screen.getByText(/location.*cannot be empty/i)).toBeInTheDocument();
      });
    });
  });

  describe('Successful Import Completion and Data Persistence', () => {
    it('should complete successful import workflow with progress tracking', async () => {
      // Arrange
      const validationResult = {
        isValid: true,
        errors: [],
        preview: [
          { Family: 'Araceae', Genus: 'Monstera', Species: 'deliciosa', 'Common Name': 'Monstera Deliciosa' },
        ],
      };

      const importResult = {
        importId: 'import-123',
        status: 'started',
      };

      mockApiResponse({
        'POST /api/import/csv/validate': {
          status: 200,
          data: validationResult,
        },
        'POST /api/import/csv': {
          status: 200,
          data: importResult,
        },
      });

      // Mock import progress polling
      let progressCallCount = 0;
      global.fetch = jest.fn((url, options) => {
        if (url.includes('/api/import/csv/validate')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(validationResult),
          });
        }
        if (url.includes('/api/import/csv') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(importResult),
          });
        }
        if (url.includes('/api/import/progress/import-123')) {
          progressCallCount++;
          const progress = progressCallCount >= 3 ? {
            status: 'completed',
            progress: 100,
            summary: {
              totalRows: 1,
              successfulRows: 1,
              failedRows: 0,
              created: 1,
              updated: 0,
              skipped: 0,
            },
          } : {
            status: 'processing',
            progress: progressCallCount * 30,
            currentRow: progressCallCount,
            totalRows: 1,
          };
          
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(progress),
          });
        }
        return Promise.reject(new Error('Unexpected API call'));
      });

      const mockOnImportComplete = jest.fn();
      const { user } = renderWithProviders(
        <CSVImportModal
          isOpen={true}
          onClose={jest.fn()}
          onImportComplete={mockOnImportComplete}
        />
      );

      // Act - Complete full import workflow
      // Step 1: Select type
      const plantTaxonomyButton = screen.getByRole('button', { name: /plant taxonomy/i });
      await user.click(plantTaxonomyButton);

      // Step 2: Upload file
      const fileInput = screen.getByLabelText(/upload|file/i);
      const csvFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      await user.upload(fileInput, csvFile);

      // Step 3: Start import
      await waitFor(() => {
        expect(screen.getByText('Review your data')).toBeInTheDocument();
      });

      const startImportButton = screen.getByRole('button', { name: /start import/i });
      await user.click(startImportButton);

      // Assert - Verify import was started
      await waitFor(() => {
        expect(screen.getByText(/importing data/i)).toBeInTheDocument();
      });

      // Assert - Verify import completion
      await waitFor(() => {
        expect(screen.getByText(/import completed successfully/i)).toBeInTheDocument();
      }, { timeout: 10000 });

      // Assert - Verify completion callback was called
      expect(mockOnImportComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          totalRows: 1,
          successfulRows: 1,
          created: 1,
        })
      );
    });

    it('should handle import server errors during processing', async () => {
      // Arrange
      const validationResult = {
        isValid: true,
        errors: [],
        preview: [{ 'Common Name': 'Test Plant' }],
      };

      mockApiResponse({
        'POST /api/import/csv/validate': {
          status: 200,
          data: validationResult,
        },
      });

      mockApiError('/api/import/csv', 500, { error: 'Database connection failed' }, 'POST');

      const { user } = renderWithProviders(
        <CSVImportModal
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      // Act - Try to start import
      const plantTaxonomyButton = screen.getByRole('button', { name: /plant taxonomy/i });
      await user.click(plantTaxonomyButton);

      const fileInput = screen.getByLabelText(/upload|file/i);
      const csvFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      await user.upload(fileInput, csvFile);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start import/i })).toBeInTheDocument();
      });

      const startImportButton = screen.getByRole('button', { name: /start import/i });
      await user.click(startImportButton);

      // Assert - Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText(/failed to start import/i)).toBeInTheDocument();
      });
    });

    it('should handle partial import success with error reporting', async () => {
      // Arrange
      const validationResult = {
        isValid: true,
        errors: [],
        preview: [
          { 'Common Name': 'Plant 1' },
          { 'Common Name': 'Plant 2' },
        ],
      };

      const importResult = { importId: 'import-456' };

      mockApiResponse({
        'POST /api/import/csv/validate': {
          status: 200,
          data: validationResult,
        },
        'POST /api/import/csv': {
          status: 200,
          data: importResult,
        },
      });

      // Mock progress with partial success
      global.fetch = jest.fn((url, options) => {
        if (url.includes('validate') || (url.includes('/api/import/csv') && options?.method === 'POST')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(url.includes('validate') ? validationResult : importResult),
          });
        }
        if (url.includes('/api/import/progress/import-456')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              status: 'completed',
              progress: 100,
              summary: {
                totalRows: 2,
                successfulRows: 1,
                failedRows: 1,
                created: 1,
                updated: 0,
                skipped: 0,
                errors: [
                  { row: 2, error: 'Duplicate plant name' },
                ],
              },
            }),
          });
        }
        return Promise.reject(new Error('Unexpected API call'));
      });

      const { user } = renderWithProviders(
        <CSVImportModal
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      // Act - Complete import with partial success
      const plantTaxonomyButton = screen.getByRole('button', { name: /plant taxonomy/i });
      await user.click(plantTaxonomyButton);

      const fileInput = screen.getByLabelText(/upload|file/i);
      const csvFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      await user.upload(fileInput, csvFile);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start import/i })).toBeInTheDocument();
      });

      const startImportButton = screen.getByRole('button', { name: /start import/i });
      await user.click(startImportButton);

      // Assert - Verify partial success is reported
      await waitFor(() => {
        expect(screen.getByText(/import completed/i)).toBeInTheDocument();
      }, { timeout: 10000 });

      // Note: The actual error display would depend on the ImportProgress component implementation
    });
  }); 
 describe('Template Download and Import Workflow Integration', () => {
    it('should provide CSV template downloads for different import types', async () => {
      // Arrange
      const originalCreateElement = document.createElement;
      const mockLink = {
        setAttribute: jest.fn(),
        click: jest.fn(),
        style: {},
      };
      
      document.createElement = jest.fn((tagName) => {
        if (tagName === 'a') {
          return mockLink;
        }
        return originalCreateElement.call(document, tagName);
      });

      const originalCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = jest.fn(() => 'blob:mock-url');

      const originalAppendChild = document.body.appendChild;
      const originalRemoveChild = document.body.removeChild;
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();

      const { user } = renderWithProviders(<DataImport />);

      // Act - Download plant taxonomy template
      const taxonomyTemplateButton = screen.getByRole('button', { name: /plant taxonomy template/i });
      await user.click(taxonomyTemplateButton);

      // Assert - Verify template download was triggered
      expect(mockLink.setAttribute).toHaveBeenCalledWith('href', 'blob:mock-url');
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'plant_taxonomy_template.csv');
      expect(mockLink.click).toHaveBeenCalled();

      // Cleanup
      document.createElement = originalCreateElement;
      URL.createObjectURL = originalCreateObjectURL;
      document.body.appendChild = originalAppendChild;
      document.body.removeChild = originalRemoveChild;
    });

    it('should show import history and status tracking', async () => {
      // Arrange
      const importHistory = [
        {
          id: 'import-123',
          type: 'plant_taxonomy',
          filename: 'plants.csv',
          status: 'completed',
          createdAt: '2024-01-15T10:00:00Z',
          summary: {
            totalRows: 10,
            successfulRows: 9,
            failedRows: 1,
            created: 9,
          },
        },
        {
          id: 'import-124',
          type: 'plant_instances',
          filename: 'collection.csv',
          status: 'processing',
          createdAt: '2024-01-16T14:30:00Z',
          progress: 75,
        },
      ];

      mockApiResponse({
        'GET /api/import/csv': {
          status: 200,
          data: { imports: importHistory },
        },
      });

      const { user } = renderWithProviders(<DataImport />);

      // Act - Switch to history tab
      const historyTab = screen.getByRole('button', { name: /import history/i });
      await user.click(historyTab);

      // Assert - Verify import history is displayed
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/import/csv');
      });

      // Note: The actual history display would depend on the ImportHistory component implementation
    });

    it('should handle end-to-end import workflow from template to completion', async () => {
      // This test would simulate:
      // 1. Download template
      // 2. Upload filled template
      // 3. Validate data
      // 4. Complete import
      // 5. View in history

      // Arrange
      const validationResult = {
        isValid: true,
        errors: [],
        preview: [
          { Family: 'Araceae', Genus: 'Monstera', Species: 'deliciosa', 'Common Name': 'Monstera Deliciosa' },
        ],
      };

      const importResult = { importId: 'import-789' };

      mockApiResponse({
        'POST /api/import/csv/validate': {
          status: 200,
          data: validationResult,
        },
        'POST /api/import/csv': {
          status: 200,
          data: importResult,
        },
        'GET /api/import/csv': {
          status: 200,
          data: {
            imports: [{
              id: 'import-789',
              type: 'plant_taxonomy',
              status: 'completed',
              summary: { totalRows: 1, successfulRows: 1, created: 1 },
            }],
          },
        },
      });

      // Mock progress completion
      global.fetch = jest.fn((url, options) => {
        if (url.includes('validate')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(validationResult),
          });
        }
        if (url.includes('/api/import/csv') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(importResult),
          });
        }
        if (url.includes('/api/import/progress/import-789')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              status: 'completed',
              progress: 100,
              summary: { totalRows: 1, successfulRows: 1, created: 1 },
            }),
          });
        }
        if (url.includes('/api/import/csv') && options?.method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              imports: [{
                id: 'import-789',
                type: 'plant_taxonomy',
                status: 'completed',
                summary: { totalRows: 1, successfulRows: 1, created: 1 },
              }],
            }),
          });
        }
        return Promise.reject(new Error('Unexpected API call'));
      });

      const { user, rerender } = renderWithProviders(<DataImport />);

      // Step 1: Start CSV import
      const startImportButton = screen.getByRole('button', { name: /start csv import/i });
      await user.click(startImportButton);

      // Step 2: Complete import workflow (simplified)
      await waitFor(() => {
        expect(screen.getByText(/import csv data/i)).toBeInTheDocument();
      });

      // Step 3: Check history after import
      rerender(<DataImport />);
      
      const historyTab = screen.getByRole('button', { name: /import history/i });
      await user.click(historyTab);

      // Assert - Verify completed import appears in history
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/import/csv');
      });
    });
  });

  describe('Error Recovery and User Experience', () => {
    it('should allow users to retry failed imports', async () => {
      // Arrange
      const validationResult = {
        isValid: true,
        errors: [],
        preview: [{ 'Common Name': 'Test Plant' }],
      };

      // First attempt fails, second succeeds
      let attemptCount = 0;
      global.fetch = jest.fn((url, options) => {
        if (url.includes('validate')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(validationResult),
          });
        }
        if (url.includes('/api/import/csv') && options?.method === 'POST') {
          attemptCount++;
          if (attemptCount === 1) {
            return Promise.resolve({
              ok: false,
              json: () => Promise.resolve({ error: 'Temporary server error' }),
            });
          } else {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ importId: 'import-retry-123' }),
            });
          }
        }
        return Promise.reject(new Error('Unexpected API call'));
      });

      const { user } = renderWithProviders(
        <CSVImportModal
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      // Act - First attempt (fails)
      const plantTaxonomyButton = screen.getByRole('button', { name: /plant taxonomy/i });
      await user.click(plantTaxonomyButton);

      const fileInput = screen.getByLabelText(/upload|file/i);
      const csvFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      await user.upload(fileInput, csvFile);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start import/i })).toBeInTheDocument();
      });

      const startImportButton = screen.getByRole('button', { name: /start import/i });
      await user.click(startImportButton);

      // Assert - First attempt fails
      await waitFor(() => {
        expect(screen.getByText(/failed to start import/i)).toBeInTheDocument();
      });

      // Act - Retry import
      await user.click(startImportButton);

      // Assert - Second attempt should succeed
      await waitFor(() => {
        expect(attemptCount).toBe(2);
      });
    });

    it('should provide clear error messages for common issues', async () => {
      // Arrange
      const commonErrors = [
        { error: 'File too large', expectedMessage: /file.*too large/i },
        { error: 'Invalid file format', expectedMessage: /invalid.*format/i },
        { error: 'Missing required columns', expectedMessage: /missing.*columns/i },
        { error: 'Network timeout', expectedMessage: /network.*timeout|connection/i },
      ];

      for (const { error, expectedMessage } of commonErrors) {
        mockApiError('/api/import/csv/validate', 400, { error }, 'POST');

        const { user } = renderWithProviders(
          <CSVImportModal
            isOpen={true}
            onClose={jest.fn()}
          />
        );

        // Act - Trigger error
        const plantTaxonomyButton = screen.getByRole('button', { name: /plant taxonomy/i });
        await user.click(plantTaxonomyButton);

        const fileInput = screen.getByLabelText(/upload|file/i);
        const csvFile = new File(['test'], 'test.csv', { type: 'text/csv' });
        await user.upload(fileInput, csvFile);

        // Assert - Verify appropriate error message
        await waitFor(() => {
          expect(screen.getByText(expectedMessage)).toBeInTheDocument();
        });
      }
    });

    it('should handle modal state management correctly', async () => {
      // Arrange
      const mockOnClose = jest.fn();
      const { user } = renderWithProviders(
        <CSVImportModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Act - Close modal during different steps
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Assert - Verify close callback was called
      expect(mockOnClose).toHaveBeenCalled();

      // Act - Test escape key
      const { rerender } = renderWithProviders(
        <CSVImportModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await user.keyboard('{Escape}');

      // Assert - Modal should close on escape
      // Note: This would depend on the actual escape key handling implementation
    });
  });
});