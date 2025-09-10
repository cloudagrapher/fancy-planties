/**
 * @jest-environment jsdom
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test-utils/helpers/render-helpers';
import ErrorDisplay, { InlineErrorDisplay, ErrorToast } from '@/components/shared/ErrorDisplay';

describe('ErrorDisplay', () => {
  const defaultError = {
    message: 'Something went wrong',
    retryable: true,
  };

  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders error message', () => {
      renderWithProviders(
        <ErrorDisplay error={defaultError} onRetry={mockOnRetry} />
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('does not render when error is null', () => {
      renderWithProviders(
        <ErrorDisplay error={null} onRetry={mockOnRetry} />
      );

      expect(screen.queryByText('Error')).not.toBeInTheDocument();
    });

    it('does not render when error is undefined', () => {
      renderWithProviders(
        <ErrorDisplay error={undefined} onRetry={mockOnRetry} />
      );

      expect(screen.queryByText('Error')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      renderWithProviders(
        <ErrorDisplay 
          error={defaultError} 
          className="custom-error-class"
          onRetry={mockOnRetry} 
        />
      );

      const errorContainer = screen.getByText('Error').closest('div');
      expect(errorContainer).toHaveClass('custom-error-class');
    });
  });

  describe('Error Details', () => {
    it('shows error details when showDetails is true and details exist', () => {
      const errorWithDetails = {
        message: 'API Error',
        details: { status: 500, endpoint: '/api/plants' },
      };

      renderWithProviders(
        <ErrorDisplay 
          error={errorWithDetails} 
          showDetails={true}
          onRetry={mockOnRetry} 
        />
      );

      expect(screen.getByText('Show technical details')).toBeInTheDocument();
    });

    it('does not show details section when showDetails is false', () => {
      const errorWithDetails = {
        message: 'API Error',
        details: { status: 500, endpoint: '/api/plants' },
      };

      renderWithProviders(
        <ErrorDisplay 
          error={errorWithDetails} 
          showDetails={false}
          onRetry={mockOnRetry} 
        />
      );

      expect(screen.queryByText('Show technical details')).not.toBeInTheDocument();
    });

    it('does not show details section when no details exist', () => {
      renderWithProviders(
        <ErrorDisplay 
          error={defaultError} 
          showDetails={true}
          onRetry={mockOnRetry} 
        />
      );

      expect(screen.queryByText('Show technical details')).not.toBeInTheDocument();
    });

    it('expands details when clicked', async () => {
      const user = userEvent.setup();
      const errorWithDetails = {
        message: 'API Error',
        details: { status: 500, endpoint: '/api/plants' },
      };

      renderWithProviders(
        <ErrorDisplay 
          error={errorWithDetails} 
          showDetails={true}
          onRetry={mockOnRetry} 
        />
      );

      await user.click(screen.getByText('Show technical details'));

      expect(screen.getByText(/"status": 500/)).toBeInTheDocument();
      expect(screen.getByText(/"endpoint": "\/api\/plants"/)).toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('shows retry button when error is retryable and onRetry is provided', () => {
      renderWithProviders(
        <ErrorDisplay error={defaultError} onRetry={mockOnRetry} />
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('does not show retry button when error is not retryable', () => {
      const nonRetryableError = {
        message: 'Permanent error',
        retryable: false,
      };

      renderWithProviders(
        <ErrorDisplay error={nonRetryableError} onRetry={mockOnRetry} />
      );

      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('does not show retry button when onRetry is not provided', () => {
      renderWithProviders(
        <ErrorDisplay error={defaultError} />
      );

      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ErrorDisplay error={defaultError} onRetry={mockOnRetry} />
      );

      await user.click(screen.getByRole('button', { name: /try again/i }));

      expect(mockOnRetry).toHaveBeenCalled();
    });

    it('retry button has proper styling and icon', () => {
      renderWithProviders(
        <ErrorDisplay error={defaultError} onRetry={mockOnRetry} />
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toHaveClass('bg-red-100', 'border-red-300', 'text-red-800');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      renderWithProviders(
        <ErrorDisplay error={defaultError} onRetry={mockOnRetry} />
      );

      const errorMessage = screen.getByText('Something went wrong');
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(errorMessage).toHaveAttribute('aria-live', 'polite');
    });

    it('has proper alert icon with aria-hidden', () => {
      renderWithProviders(
        <ErrorDisplay error={defaultError} onRetry={mockOnRetry} />
      );

      const alertIcon = document.querySelector('[aria-hidden="true"]');
      expect(alertIcon).toBeInTheDocument();
    });

    it('retry button is keyboard accessible', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ErrorDisplay error={defaultError} onRetry={mockOnRetry} />
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      retryButton.focus();
      
      await user.keyboard('{Enter}');
      expect(mockOnRetry).toHaveBeenCalled();
    });
  });

  describe('Visual Structure', () => {
    it('has proper error styling classes', () => {
      renderWithProviders(
        <ErrorDisplay error={defaultError} onRetry={mockOnRetry} />
      );

      const container = screen.getByText('Error').closest('div');
      expect(container).toHaveClass('border-red-200', 'bg-red-50');
    });

    it('has proper icon and text layout', () => {
      renderWithProviders(
        <ErrorDisplay error={defaultError} onRetry={mockOnRetry} />
      );

      const container = screen.getByText('Error').closest('div');
      expect(container.querySelector('.flex')).toBeInTheDocument();
    });
  });
});

describe('InlineErrorDisplay', () => {
  describe('Basic Rendering', () => {
    it('renders error message', () => {
      renderWithProviders(
        <InlineErrorDisplay error="Field is required" />
      );

      expect(screen.getByText('Field is required')).toBeInTheDocument();
    });

    it('does not render when error is null', () => {
      renderWithProviders(
        <InlineErrorDisplay error={null} />
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('does not render when error is empty string', () => {
      renderWithProviders(
        <InlineErrorDisplay error="" />
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      renderWithProviders(
        <InlineErrorDisplay error="Error message" className="custom-inline-error" />
      );

      const errorElement = screen.getByRole('alert');
      expect(errorElement).toHaveClass('custom-inline-error');
    });
  });

  describe('Accessibility', () => {
    it('has proper role attribute', () => {
      renderWithProviders(
        <InlineErrorDisplay error="Validation error" />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('has error icon with aria-hidden', () => {
      renderWithProviders(
        <InlineErrorDisplay error="Error message" />
      );

      const icon = document.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Visual Structure', () => {
    it('has proper styling classes', () => {
      renderWithProviders(
        <InlineErrorDisplay error="Error message" />
      );

      const errorElement = screen.getByRole('alert');
      expect(errorElement).toHaveClass('text-red-600', 'text-sm');
    });

    it('displays error icon', () => {
      renderWithProviders(
        <InlineErrorDisplay error="Error message" />
      );

      const errorElement = screen.getByRole('alert');
      expect(errorElement.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Form Integration', () => {
    it('works correctly in form context', () => {
      const FormWithError = ({ hasError }) => (
        <div>
          <input type="text" />
          <InlineErrorDisplay error={hasError ? 'This field is required' : null} />
        </div>
      );

      const { rerender } = renderWithProviders(<FormWithError hasError={false} />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      rerender(<FormWithError hasError={true} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });
  });
});

describe('ErrorToast', () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders error toast with message', () => {
      renderWithProviders(
        <ErrorToast error="Network connection failed" onDismiss={mockOnDismiss} />
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Network connection failed')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      renderWithProviders(
        <ErrorToast 
          error="Error message" 
          onDismiss={mockOnDismiss}
          className="custom-toast-class"
        />
      );

      const toastContainer = screen.getByText('Error').closest('div');
      expect(toastContainer).toHaveClass('custom-toast-class');
    });
  });

  describe('Dismiss Functionality', () => {
    it('shows dismiss button', () => {
      renderWithProviders(
        <ErrorToast error="Error message" onDismiss={mockOnDismiss} />
      );

      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
    });

    it('calls onDismiss when dismiss button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ErrorToast error="Error message" onDismiss={mockOnDismiss} />
      );

      await user.click(screen.getByRole('button', { name: /dismiss/i }));

      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it('dismiss button is keyboard accessible', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ErrorToast error="Error message" onDismiss={mockOnDismiss} />
      );

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      dismissButton.focus();
      
      await user.keyboard('{Enter}');
      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper screen reader text for dismiss button', () => {
      renderWithProviders(
        <ErrorToast error="Error message" onDismiss={mockOnDismiss} />
      );

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      expect(dismissButton.querySelector('.sr-only')).toHaveTextContent('Dismiss');
    });

    it('has proper focus management', () => {
      renderWithProviders(
        <ErrorToast error="Error message" onDismiss={mockOnDismiss} />
      );

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      expect(dismissButton).toHaveClass('focus:ring-2', 'focus:ring-red-500');
    });
  });

  describe('Visual Structure', () => {
    it('has proper toast positioning classes', () => {
      renderWithProviders(
        <ErrorToast error="Error message" onDismiss={mockOnDismiss} />
      );

      const toastContainer = screen.getByText('Error').closest('div');
      expect(toastContainer).toHaveClass('fixed', 'top-4', 'right-4', 'z-50');
    });

    it('has proper error styling', () => {
      renderWithProviders(
        <ErrorToast error="Error message" onDismiss={mockOnDismiss} />
      );

      const toastContainer = screen.getByText('Error').closest('div');
      expect(toastContainer).toHaveClass('bg-red-50', 'border-red-200', 'shadow-lg');
    });

    it('displays error icon', () => {
      renderWithProviders(
        <ErrorToast error="Error message" onDismiss={mockOnDismiss} />
      );

      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Toast Behavior', () => {
    it('renders as fixed positioned element', () => {
      renderWithProviders(
        <ErrorToast error="Error message" onDismiss={mockOnDismiss} />
      );

      const toastContainer = screen.getByText('Error').closest('div');
      expect(toastContainer).toHaveClass('fixed');
    });

    it('has proper z-index for overlay', () => {
      renderWithProviders(
        <ErrorToast error="Error message" onDismiss={mockOnDismiss} />
      );

      const toastContainer = screen.getByText('Error').closest('div');
      expect(toastContainer).toHaveClass('z-50');
    });

    it('has responsive width classes', () => {
      renderWithProviders(
        <ErrorToast error="Error message" onDismiss={mockOnDismiss} />
      );

      const toastContainer = screen.getByText('Error').closest('div');
      expect(toastContainer).toHaveClass('max-w-sm', 'w-full');
    });
  });
});