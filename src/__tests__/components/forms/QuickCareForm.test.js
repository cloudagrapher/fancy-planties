/**
 * @jest-environment jsdom
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockApiResponses, mockApiError } from '@/test-utils';
import QuickCareForm from '@/components/care/QuickCareForm';
import { useOffline } from '@/hooks/useOffline';

// Mock the offline hook
const mockAddPendingCareEntry = jest.fn();
const mockRegisterBackgroundSync = jest.fn();

jest.mock('@/hooks/useOffline', () => ({
  useOffline: jest.fn(),
}));

jest.mock('@/lib/utils/service-worker', () => ({
  useServiceWorker: () => ({
    registerBackgroundSync: mockRegisterBackgroundSync,
  }),
}));

describe('QuickCareForm', () => {
  const defaultProps = {
    plantInstanceId: 1,
    onSuccess: jest.fn(),
    onCancel: jest.fn(),
    defaultCareType: 'fertilizer',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API response by default
    mockApiResponses({
      '/api/care/log': { success: true, data: { id: 1 } },
    });

    // Reset offline hook to online state
    useOffline.mockReturnValue({
      isOnline: true,
      addPendingCareEntry: mockAddPendingCareEntry,
    });
  });

  describe('Form Rendering', () => {
    it('renders all care type options', () => {
      renderWithProviders(<QuickCareForm {...defaultProps} />);

      expect(screen.getByText('🌱')).toBeInTheDocument(); // Fertilizer
      expect(screen.getByText('💧')).toBeInTheDocument(); // Water
      expect(screen.getByText('🪴')).toBeInTheDocument(); // Repot
      expect(screen.getByText('✂️')).toBeInTheDocument(); // Prune
      expect(screen.getByText('🔍')).toBeInTheDocument(); // Inspect
      expect(screen.getByText('📝')).toBeInTheDocument(); // Other

      expect(screen.getByText('Fertilizer')).toBeInTheDocument();
      expect(screen.getByText('Water')).toBeInTheDocument();
      expect(screen.getByText('Repot')).toBeInTheDocument();
      expect(screen.getByText('Prune')).toBeInTheDocument();
      expect(screen.getByText('Inspect')).toBeInTheDocument();
      expect(screen.getByText('Other')).toBeInTheDocument();
    });

    it('renders care date field with today as default', () => {
      renderWithProviders(<QuickCareForm {...defaultProps} />);

      const dateInput = screen.getByLabelText(/care date/i);
      const today = new Date().toISOString().split('T')[0];
      
      expect(dateInput).toBeInTheDocument();
      expect(dateInput).toHaveValue(today);
      expect(dateInput).toHaveAttribute('max', today); // Cannot be in future
    });

    it('renders notes field', () => {
      renderWithProviders(<QuickCareForm {...defaultProps} />);

      const notesField = screen.getByLabelText(/notes/i);
      expect(notesField).toBeInTheDocument();
      expect(notesField).toHaveAttribute('placeholder', 'Any additional observations or notes...');
    });

    it('renders submit button', () => {
      renderWithProviders(<QuickCareForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: /log care/i })).toBeInTheDocument();
    });

    it('selects default care type', () => {
      renderWithProviders(<QuickCareForm {...defaultProps} defaultCareType="water" />);

      const waterButton = screen.getByRole('button', { name: /water/i });
      expect(waterButton).toHaveClass('btn--primary');
    });
  });

  describe('Care Type Selection', () => {
    it('allows selecting different care types', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuickCareForm {...defaultProps} />);

      const waterButton = screen.getByRole('button', { name: /water/i });
      await user.click(waterButton);

      expect(waterButton).toHaveClass('btn--primary');
    });

    it('shows conditional fields for fertilizer type', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuickCareForm {...defaultProps} defaultCareType="fertilizer" />);

      expect(screen.getByLabelText(/fertilizer type/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/liquid fertilizer, slow-release pellets/i)).toBeInTheDocument();
    });

    it('shows conditional fields for repotting', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuickCareForm {...defaultProps} />);

      const repotButton = screen.getByRole('button', { name: /repot/i });
      await user.click(repotButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/pot size/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/soil type/i)).toBeInTheDocument();
      });
    });

    it('hides conditional fields when switching care types', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuickCareForm {...defaultProps} defaultCareType="fertilizer" />);

      // Initially shows fertilizer field
      expect(screen.getByLabelText(/fertilizer type/i)).toBeInTheDocument();

      // Switch to water
      const waterButton = screen.getByRole('button', { name: /water/i });
      await user.click(waterButton);

      // Fertilizer field should be hidden
      expect(screen.queryByLabelText(/fertilizer type/i)).not.toBeInTheDocument();
    });

    it('shows care type description', () => {
      renderWithProviders(<QuickCareForm {...defaultProps} defaultCareType="fertilizer" />);

      const description = screen.getByText(/🌱 fertilizer:/i);
      expect(description).toBeInTheDocument();
    });
  });

  describe('Date Validation', () => {
    it('prevents selecting future dates', () => {
      renderWithProviders(<QuickCareForm {...defaultProps} />);

      const dateInput = screen.getByLabelText(/care date/i);
      const today = new Date().toISOString().split('T')[0];
      
      expect(dateInput).toHaveAttribute('max', today);
    });

    it('allows selecting past dates', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuickCareForm {...defaultProps} />);

      const dateInput = screen.getByLabelText(/care date/i);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];

      await user.clear(dateInput);
      await user.type(dateInput, yesterdayString);

      expect(dateInput).toHaveValue(yesterdayString);
    });
  });

  describe('Form Submission', () => {
    it('submits form with correct data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuickCareForm {...defaultProps} />);

      // Fill form
      await user.type(screen.getByLabelText(/notes/i), 'Plant looks healthy');
      
      // Submit
      await user.click(screen.getByRole('button', { name: /log care/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/care/log',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: expect.stringContaining('fertilizer'),
          })
        );
      });

      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });

    it('includes conditional field data in submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuickCareForm {...defaultProps} defaultCareType="fertilizer" />);

      await user.type(screen.getByLabelText(/fertilizer type/i), 'Liquid fertilizer');
      await user.click(screen.getByRole('button', { name: /log care/i }));

      await waitFor(() => {
        const fetchCall = global.fetch.mock.calls[0];
        const requestBody = JSON.parse(fetchCall[1].body);
        expect(requestBody.fertilizerType).toBe('Liquid fertilizer');
      });
    });

    it('includes repot-specific data in submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuickCareForm {...defaultProps} />);

      // Select repot care type
      await user.click(screen.getByRole('button', { name: /repot/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/pot size/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/pot size/i), '6 inch');
      await user.type(screen.getByLabelText(/soil type/i), 'Potting mix');
      await user.click(screen.getByRole('button', { name: /log care/i }));

      await waitFor(() => {
        const fetchCall = global.fetch.mock.calls[0];
        const requestBody = JSON.parse(fetchCall[1].body);
        expect(requestBody.potSize).toBe('6 inch');
        expect(requestBody.soilType).toBe('Potting mix');
      });
    });

    it('resets form after successful submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuickCareForm {...defaultProps} />);

      // Fill form
      await user.type(screen.getByLabelText(/notes/i), 'Test notes');
      
      // Submit
      await user.click(screen.getByRole('button', { name: /log care/i }));

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });

      // Form should be reset
      expect(screen.getByLabelText(/notes/i)).toHaveValue('');
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      
      // Mock delayed response
      global.fetch = jest.fn(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          }), 100)
        )
      );

      renderWithProviders(<QuickCareForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /log care/i });
      await user.click(submitButton);

      // Check loading state
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/logging/i)).toBeInTheDocument();
    });
  });

  describe('Offline Mode', () => {
    beforeEach(() => {
      // Mock offline state
      useOffline.mockReturnValue({
        isOnline: false,
        addPendingCareEntry: mockAddPendingCareEntry,
      });
    });

    it('shows offline mode indicator', () => {
      renderWithProviders(<QuickCareForm {...defaultProps} />);

      expect(screen.getByText(/offline mode/i)).toBeInTheDocument();
      expect(screen.getByText(/care will be logged when you're back online/i)).toBeInTheDocument();
    });

    it('changes submit button text in offline mode', () => {
      renderWithProviders(<QuickCareForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: /queue for sync/i })).toBeInTheDocument();
    });

    it('queues care entry when offline', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuickCareForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/notes/i), 'Offline care entry');
      await user.click(screen.getByRole('button', { name: /queue for sync/i }));

      expect(mockAddPendingCareEntry).toHaveBeenCalledWith({
        plantInstanceId: 1,
        careType: 'fertilizer',
        notes: 'Offline care entry',
      });

      expect(mockRegisterBackgroundSync).toHaveBeenCalled();
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });

    it('does not make API call when offline', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuickCareForm {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /queue for sync/i }));

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('displays API error messages', async () => {
      const user = userEvent.setup();
      mockApiError('/api/care/log', 400, { error: 'Invalid care data' });

      renderWithProviders(<QuickCareForm {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /log care/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid care data')).toBeInTheDocument();
      });

      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });

    it('handles network errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

      renderWithProviders(<QuickCareForm {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /log care/i }));

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('clears errors on retry', async () => {
      const user = userEvent.setup();
      mockApiError('/api/care/log', 400, { error: 'Invalid care data' });

      renderWithProviders(<QuickCareForm {...defaultProps} />);

      // First submission with error
      await user.click(screen.getByRole('button', { name: /log care/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid care data')).toBeInTheDocument();
      });

      // Mock successful response for retry
      mockApiResponses({
        '/api/care/log': { success: true },
      });

      // Retry submission
      await user.click(screen.getByRole('button', { name: /log care/i }));

      // Error should be cleared
      expect(screen.queryByText('Invalid care data')).not.toBeInTheDocument();
    });
  });

  describe('Plant Selection (when no plantInstanceId provided)', () => {
    it('shows plant selection dropdown when plantInstanceId not provided', () => {
      const propsWithoutPlant = { ...defaultProps };
      delete propsWithoutPlant.plantInstanceId;

      renderWithProviders(<QuickCareForm {...propsWithoutPlant} />);

      expect(screen.getByLabelText(/plant/i)).toBeInTheDocument();
      expect(screen.getByText(/select a plant/i)).toBeInTheDocument();
    });

    it('disables submit button when no plant selected', () => {
      const propsWithoutPlant = { ...defaultProps };
      delete propsWithoutPlant.plantInstanceId;

      renderWithProviders(<QuickCareForm {...propsWithoutPlant} />);

      const submitButton = screen.getByRole('button', { name: /log care/i });
      expect(submitButton).toBeDisabled();
    });

    it('shows implementation note for plant selection', () => {
      const propsWithoutPlant = { ...defaultProps };
      delete propsWithoutPlant.plantInstanceId;

      renderWithProviders(<QuickCareForm {...propsWithoutPlant} />);

      expect(screen.getByText(/plant selection will be implemented when plant instances are available/i)).toBeInTheDocument();
    });
  });

  describe('Cancel Functionality', () => {
    it('shows cancel button when onCancel provided', () => {
      renderWithProviders(<QuickCareForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('calls onCancel when cancel button clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuickCareForm {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it('does not show cancel button when onCancel not provided', () => {
      const propsWithoutCancel = { ...defaultProps };
      delete propsWithoutCancel.onCancel;

      renderWithProviders(<QuickCareForm {...propsWithoutCancel} />);

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper form structure', () => {
      renderWithProviders(<QuickCareForm {...defaultProps} />);

      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();
    });

    it('has proper labels for all inputs', () => {
      renderWithProviders(<QuickCareForm {...defaultProps} />);

      expect(screen.getByText(/care type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/care date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('has required attribute on date field', () => {
      renderWithProviders(<QuickCareForm {...defaultProps} />);

      const dateInput = screen.getByLabelText(/care date/i);
      expect(dateInput).toHaveAttribute('required');
    });

    it('disables form elements during submission', async () => {
      const user = userEvent.setup();
      
      // Mock delayed response
      global.fetch = jest.fn(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          }), 100)
        )
      );

      renderWithProviders(<QuickCareForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /log care/i });
      await user.click(submitButton);

      // All care type buttons should be disabled
      const careTypeButtons = screen.getAllByRole('button').filter(btn => 
        btn.textContent?.includes('Fertilizer') || 
        btn.textContent?.includes('Water') ||
        btn.textContent?.includes('Repot')
      );

      careTypeButtons.forEach(button => {
        expect(button).toBeDisabled();
      });

      // Date input should be disabled
      expect(screen.getByLabelText(/care date/i)).toBeDisabled();
    });
  });
});