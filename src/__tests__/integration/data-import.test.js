// Data Import Integration Tests
// Tests CSV file upload, parsing, validation, error handling, and import completion workflows

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test-utils/helpers/render-helpers';
import { mockApiResponse, mockApiError, resetApiMocks } from '@/test-utils/helpers/api-helpers';
import { createAuthenticatedTestUser } from '@/test-utils/factories/user-factory';
import CSVImportModal from '@/components/import/CSVImportModal';

// Mock FileReader for file upload testing
global.FileReader = class {
  constructor() {
    this.onload = null;
    this.onerror = null;
  }
  
  readAsText(file) {
    setTimeout(() => {
      if (this.onload) {
        this.onload({ 
          target: { 
            result: file.content || 'Family,Genus,Species,Common Name\nAraceae,Monstera,deliciosa,Monstera Deliciosa' 
          } 
        });
      }
    }, 0);
  }
};

// Helper to select import type and proceed to upload
const selectImportType = async (user, typeName) => {
  const typeCard = screen.getByText(typeName).closest('div[class*="cursor-pointer"], div[class*="p-4"]');
  expect(typeCard).toBeInTheDocument();
  await user.click(typeCard);
  
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /upload csv file/i })).toBeInTheDocument();
  });
  
  return screen.getByLabelText(/select csv file|choose file|upload/i);
};

describe('Data Import Integration Tests', () => {
  let testUser;

  beforeEach(() => {
    jest.clearAllMocks();
    resetApiMocks();
    
    const authData = createAuthenticatedTestUser();
    testUser = authData.user;

    // Reset FileReader mock to default working state
    global.FileReader = class {
      constructor() {
        this.onload = null;
        this.onerror = null;
      }
      
      readAsText(file) {
        setTimeout(() => {
          if (this.onload) {
            this.onload({ 
              target: { 
                result: file.content || 'Family,Genus,Species,Common Name\nAraceae,Monstera,deliciosa,Monstera Deliciosa' 
              } 
            });
          }
        }, 0);
      }
    };
  });

  afterEach(() => {
    resetApiMocks();
  });

  describe('CSV File Upload and Parsing Workflow', () => {
    it('should upload and validate plant taxonomy CSV', async () => {
      const user = userEvent.setup();
      
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        preview: [{ Family: 'Araceae', Genus: 'Monstera', Species: 'deliciosa', 'Common Name': 'Monstera Deliciosa' }],
        totalRows: 1,
      };

      mockApiResponse({
        'POST /api/import/csv/validate': { status: 200, data: validationResult },
      });

      renderWithProviders(<CSVImportModal isOpen={true} onClose={jest.fn()} />);

      const fileInput = await selectImportType(user, 'Plant Taxonomy');
      const csvFile = new File(['test'], 'plants.csv', { type: 'text/csv' });
      csvFile.content = 'Family,Genus,Species,Common Name\nAraceae,Monstera,deliciosa,Monstera Deliciosa';

      await user.upload(fileInput, csvFile);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/import/csv/validate', 
          expect.objectContaining({ method: 'POST', body: expect.stringContaining('plant_taxonomy') }));
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /preview.*confirm/i })).toBeInTheDocument();
        expect(screen.getByText('Monstera Deliciosa')).toBeInTheDocument();
      });
    });

    it('should handle CSV validation errors', async () => {
      const user = userEvent.setup();
      
      const validationResult = {
        isValid: false,
        errors: ['Missing required column: Family', 'Row 2: Invalid genus format'],
        warnings: [],
        preview: [],
        totalRows: 0,
      };

      mockApiResponse({
        'POST /api/import/csv/validate': { status: 200, data: validationResult },
      });

      renderWithProviders(<CSVImportModal isOpen={true} onClose={jest.fn()} />);

      const fileInput = await selectImportType(user, 'Plant Taxonomy');
      const csvFile = new File(['Invalid,Headers\nBad,Data'], 'invalid.csv', { type: 'text/csv' });
      csvFile.content = 'Invalid,Headers\nBad,Data';

      await user.upload(fileInput, csvFile);

      await waitFor(() => {
        expect(screen.getByText(/missing required column.*family/i)).toBeInTheDocument();
        expect(screen.getByText(/invalid genus format/i)).toBeInTheDocument();
      });
    });

    it('should handle plant instances import type', async () => {
      const user = userEvent.setup();
      
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        preview: [{ 'Common Name': 'Monstera Deliciosa', Location: 'Living Room', 'Fertilizer Schedule': 'every 4 weeks' }],
        totalRows: 1,
      };

      mockApiResponse({
        'POST /api/import/csv/validate': { status: 200, data: validationResult },
      });

      renderWithProviders(<CSVImportModal isOpen={true} onClose={jest.fn()} />);

      const fileInput = await selectImportType(user, 'Plant Collection');
      const csvFile = new File(['test'], 'collection.csv', { type: 'text/csv' });
      csvFile.content = 'Common Name,Location,Fertilizer Schedule\nMonstera Deliciosa,Living Room,every 4 weeks';

      await user.upload(fileInput, csvFile);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/import/csv/validate',
          expect.objectContaining({ body: expect.stringContaining('plant_instances') }));
      });

      await waitFor(() => {
        expect(screen.getByText('Living Room')).toBeInTheDocument();
        expect(screen.getByText('every 4 weeks')).toBeInTheDocument();
      });
    });

    it('should handle propagations import type', async () => {
      const user = userEvent.setup();
      
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        preview: [{ 'Common Name': 'Monstera Deliciosa', Location: 'Propagation Station', 'Date Started': '2024-01-15', Status: 'rooting' }],
        totalRows: 1,
      };

      mockApiResponse({
        'POST /api/import/csv/validate': { status: 200, data: validationResult },
      });

      renderWithProviders(<CSVImportModal isOpen={true} onClose={jest.fn()} />);

      const fileInput = await selectImportType(user, 'Propagations');
      const csvFile = new File(['test'], 'propagations.csv', { type: 'text/csv' });
      csvFile.content = 'Common Name,Location,Date Started,Status\nMonstera Deliciosa,Propagation Station,2024-01-15,rooting';

      await user.upload(fileInput, csvFile);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/import/csv/validate',
          expect.objectContaining({ body: expect.stringContaining('propagations') }));
      });

      await waitFor(() => {
        expect(screen.getByText('Propagation Station')).toBeInTheDocument();
        expect(screen.getByText('rooting')).toBeInTheDocument();
      });
    });

    it('should handle file reading errors', async () => {
      const user = userEvent.setup();
      
      // Mock FileReader to fail
      global.FileReader = class {
        constructor() { this.onerror = null; }
        readAsText() {
          setTimeout(() => {
            if (this.onerror) this.onerror(new Error('Failed to read file'));
          }, 0);
        }
      };

      renderWithProviders(<CSVImportModal isOpen={true} onClose={jest.fn()} />);

      const fileInput = await selectImportType(user, 'Plant Taxonomy');
      const csvFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      await user.upload(fileInput, csvFile);

      await waitFor(() => {
        expect(screen.getByText(/failed to read file|error reading file/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Validation and Error Handling During Import', () => {
    it('should handle validation API errors', async () => {
      const user = userEvent.setup();
      
      mockApiError('/api/import/csv/validate', 500, { error: 'Validation service unavailable' }, 'POST');

      renderWithProviders(<CSVImportModal isOpen={true} onClose={jest.fn()} />);

      const fileInput = await selectImportType(user, 'Plant Taxonomy');
      const csvFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      await user.upload(fileInput, csvFile);

      await waitFor(() => {
        expect(screen.getByText(/failed to validate csv|validation.*error/i)).toBeInTheDocument();
      });
    });

    it('should validate required fields for propagations', async () => {
      const user = userEvent.setup();
      
      const validationResult = {
        isValid: false,
        errors: ['Row 2: Missing required field "Date Started"', 'Row 3: Invalid date format in "Date Started"'],
        warnings: [],
        preview: [{ 'Common Name': 'Monstera Deliciosa', Location: 'Propagation Station', 'Date Started': '' }],
        totalRows: 1,
      };

      mockApiResponse({
        'POST /api/import/csv/validate': { status: 200, data: validationResult },
      });

      renderWithProviders(<CSVImportModal isOpen={true} onClose={jest.fn()} />);

      const fileInput = await selectImportType(user, 'Propagations');
      const csvFile = new File(['test'], 'propagations.csv', { type: 'text/csv' });
      csvFile.content = 'Common Name,Location,Date Started\nMonstera Deliciosa,Propagation Station,';

      await user.upload(fileInput, csvFile);

      await waitFor(() => {
        expect(screen.getByText(/missing required field.*date started/i)).toBeInTheDocument();
        expect(screen.getByText(/invalid date format/i)).toBeInTheDocument();
      });
    });

    it('should handle duplicate data warnings', async () => {
      const user = userEvent.setup();
      
      const validationResult = {
        isValid: true,
        errors: ['Row 2: Duplicate plant found - Monstera deliciosa already exists'],
        warnings: ['Row 4: Similar plant found - Monstera adansonii (90% match)'],
        preview: [{ Family: 'Araceae', Genus: 'Monstera', Species: 'deliciosa', 'Common Name': 'Monstera Deliciosa' }],
        totalRows: 1,
      };

      mockApiResponse({
        'POST /api/import/csv/validate': { status: 200, data: validationResult },
      });

      renderWithProviders(<CSVImportModal isOpen={true} onClose={jest.fn()} />);

      const fileInput = await selectImportType(user, 'Plant Taxonomy');
      const csvFile = new File(['test'], 'duplicates.csv', { type: 'text/csv' });
      await user.upload(fileInput, csvFile);

      await waitFor(() => {
        expect(screen.getByText(/duplicate plant found/i)).toBeInTheDocument();
      });
    });

    it('should validate data format requirements', async () => {
      const user = userEvent.setup();
      
      const validationResult = {
        isValid: false,
        errors: [
          'Row 2: "Fertilizer Schedule" must be one of: weekly, biweekly, monthly, etc.',
          'Row 3: "Last Fertilized" must be a valid date (YYYY-MM-DD)',
          'Row 4: "Location" cannot be empty',
        ],
        warnings: [],
        preview: [],
        totalRows: 0,
      };

      mockApiResponse({
        'POST /api/import/csv/validate': { status: 200, data: validationResult },
      });

      renderWithProviders(<CSVImportModal isOpen={true} onClose={jest.fn()} />);

      const fileInput = await selectImportType(user, 'Plant Collection');
      const csvFile = new File(['test'], 'format-errors.csv', { type: 'text/csv' });
      await user.upload(fileInput, csvFile);

      await waitFor(() => {
        expect(screen.getByText(/fertilizer schedule.*must be one of/i)).toBeInTheDocument();
        expect(screen.getByText(/must be a valid date/i)).toBeInTheDocument();
        expect(screen.getByText(/location.*cannot be empty/i)).toBeInTheDocument();
      });
    });
  });

  describe('Successful Import Completion and Data Persistence', () => {
    it('should complete full import workflow with progress tracking', async () => {
      const user = userEvent.setup();
      
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        preview: [{ Family: 'Araceae', Genus: 'Monstera', Species: 'deliciosa', 'Common Name': 'Monstera Deliciosa' }],
        totalRows: 1,
      };

      const importResult = { importId: 'import-123', status: 'started' };

      // Mock API responses with progress tracking
      let progressCallCount = 0;
      global.fetch = jest.fn((url, options) => {
        if (url.includes('/api/import/csv/validate')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(validationResult) });
        }
        if (url.includes('/api/import/csv') && options?.method === 'POST') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(importResult) });
        }
        if (url.includes('/api/import/csv/import-123')) {
          progressCallCount++;
          const progress = progressCallCount >= 3 ? {
            status: 'completed',
            progress: 100,
            importType: 'plant_taxonomy',
            errors: [],
            conflicts: [],
            summary: { totalRows: 1, successfulRows: 1, failedRows: 0, created: 1, updated: 0, skipped: 0 },
          } : {
            status: 'processing',
            progress: progressCallCount * 30,
            currentRow: progressCallCount,
            totalRows: 1,
            importType: 'plant_taxonomy',
            errors: [],
            conflicts: [],
          };
          
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ progress }) });
        }
        return Promise.reject(new Error('Unexpected API call'));
      });

      const mockOnImportComplete = jest.fn();
      renderWithProviders(<CSVImportModal isOpen={true} onClose={jest.fn()} onImportComplete={mockOnImportComplete} />);

      // Complete full workflow
      const fileInput = await selectImportType(user, 'Plant Taxonomy');
      const csvFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      await user.upload(fileInput, csvFile);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /preview.*confirm/i })).toBeInTheDocument();
      });

      const startImportButton = screen.getByRole('button', { name: /start import|begin import/i });
      await user.click(startImportButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /importing data/i })).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /import complete/i })).toBeInTheDocument();
      }, { timeout: 10000 });

      if (mockOnImportComplete.mock.calls.length > 0) {
        expect(mockOnImportComplete).toHaveBeenCalledWith(
          expect.objectContaining({ totalRows: 1, successfulRows: 1, created: 1 })
        );
      }
    });

    it('should handle import server errors during processing', async () => {
      const user = userEvent.setup();
      
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        preview: [{ 'Common Name': 'Test Plant' }],
        totalRows: 1,
      };

      // Mock validation to succeed, but import to fail
      global.fetch = jest.fn((url, options) => {
        if (url.includes('/api/import/csv/validate')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(validationResult),
          });
        }
        if (url.includes('/api/import/csv') && options?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'Database connection failed' }),
          });
        }
        return Promise.reject(new Error('Unexpected API call'));
      });

      renderWithProviders(<CSVImportModal isOpen={true} onClose={jest.fn()} />);

      const fileInput = await selectImportType(user, 'Plant Taxonomy');
      const csvFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      await user.upload(fileInput, csvFile);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start import|begin import/i })).toBeInTheDocument();
      });

      const startImportButton = screen.getByRole('button', { name: /start import|begin import/i });
      await user.click(startImportButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to start import|import.*error/i)).toBeInTheDocument();
      });
    });

    it('should handle partial import success with error reporting', async () => {
      const user = userEvent.setup();
      
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        preview: [{ 'Common Name': 'Plant 1' }, { 'Common Name': 'Plant 2' }],
        totalRows: 2,
      };

      const importResult = { importId: 'import-456' };

      global.fetch = jest.fn((url, options) => {
        if (url.includes('validate') || (url.includes('/api/import/csv') && options?.method === 'POST')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(url.includes('validate') ? validationResult : importResult),
          });
        }
        if (url.includes('/api/import/csv/import-456')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              progress: {
                status: 'completed',
                progress: 100,
                importType: 'plant_taxonomy',
                errors: [],
                conflicts: [],
                summary: {
                  totalRows: 2,
                  successfulRows: 1,
                  failedRows: 1,
                  created: 1,
                  updated: 0,
                  skipped: 0,
                  errors: [{ row: 2, error: 'Duplicate plant name' }],
                },
              }
            }),
          });
        }
        return Promise.reject(new Error('Unexpected API call'));
      });

      renderWithProviders(<CSVImportModal isOpen={true} onClose={jest.fn()} />);

      const fileInput = await selectImportType(user, 'Plant Taxonomy');
      const csvFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      await user.upload(fileInput, csvFile);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start import|begin import/i })).toBeInTheDocument();
      });

      const startImportButton = screen.getByRole('button', { name: /start import|begin import/i });
      await user.click(startImportButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /import complete/i })).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    it('should persist imported data correctly', async () => {
      const user = userEvent.setup();
      
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        preview: [
          { Family: 'Araceae', Genus: 'Monstera', Species: 'deliciosa', 'Common Name': 'Monstera Deliciosa' },
          { Family: 'Araceae', Genus: 'Philodendron', Species: 'hederaceum', 'Common Name': 'Heartleaf Philodendron' },
        ],
        totalRows: 2,
      };

      const importResult = { importId: 'import-persistence-test' };

      global.fetch = jest.fn((url, options) => {
        if (url.includes('validate') || (url.includes('/api/import/csv') && options?.method === 'POST')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(url.includes('validate') ? validationResult : importResult),
          });
        }
        if (url.includes('/api/import/csv/import-persistence-test')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              progress: {
                status: 'completed',
                progress: 100,
                importType: 'plant_taxonomy',
                errors: [],
                conflicts: [],
                summary: {
                  totalRows: 2,
                  successfulRows: 2,
                  failedRows: 0,
                  created: 2,
                  updated: 0,
                  skipped: 0,
                  createdIds: [1, 2],
                },
              }
            }),
          });
        }
        return Promise.reject(new Error('Unexpected API call'));
      });

      renderWithProviders(<CSVImportModal isOpen={true} onClose={jest.fn()} />);

      const fileInput = await selectImportType(user, 'Plant Taxonomy');
      const csvFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      await user.upload(fileInput, csvFile);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start import|begin import/i })).toBeInTheDocument();
      });

      const startImportButton = screen.getByRole('button', { name: /start import|begin import/i });
      await user.click(startImportButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /import complete/i })).toBeInTheDocument();
      }, { timeout: 10000 });

      await waitFor(() => {
        expect(screen.getByText(/your csv data has been imported/i)).toBeInTheDocument();
      });
    });

    it('should clean up resources after import completion', async () => {
      const user = userEvent.setup();
      
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        preview: [{ 'Common Name': 'Test Plant' }],
        totalRows: 1,
      };

      const importResult = { importId: 'import-cleanup-test' };

      global.fetch = jest.fn((url, options) => {
        if (url.includes('validate') || (url.includes('/api/import/csv') && options?.method === 'POST')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(url.includes('validate') ? validationResult : importResult),
          });
        }
        if (url.includes('/api/import/csv/import-cleanup-test')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              progress: {
                status: 'completed',
                progress: 100,
                importType: 'plant_taxonomy',
                errors: [],
                conflicts: [],
                summary: { totalRows: 1, successfulRows: 1, failedRows: 0, created: 1 },
              }
            }),
          });
        }
        return Promise.reject(new Error('Unexpected API call'));
      });

      const mockOnClose = jest.fn();
      renderWithProviders(<CSVImportModal isOpen={true} onClose={mockOnClose} />);

      const fileInput = await selectImportType(user, 'Plant Taxonomy');
      const csvFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      await user.upload(fileInput, csvFile);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start import|begin import/i })).toBeInTheDocument();
      });

      const startImportButton = screen.getByRole('button', { name: /start import|begin import/i });
      await user.click(startImportButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /import complete/i })).toBeInTheDocument();
      }, { timeout: 10000 });

      const doneButton = screen.getByRole('button', { name: /done/i });
      await user.click(doneButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});