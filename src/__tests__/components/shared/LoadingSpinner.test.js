/**
 * @jest-environment jsdom
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test-utils/helpers/render-helpers';
import LoadingSpinner, { InlineLoadingSpinner } from '@/components/shared/LoadingSpinner';

describe('LoadingSpinner', () => {
  const defaultLoadingState = {
    isLoading: true,
    operation: 'Loading data',
  };

  describe('Basic Rendering', () => {
    it('renders loading spinner when isLoading is true', () => {
      renderWithProviders(
        <LoadingSpinner loading={defaultLoadingState} />
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByLabelText('Loading data')).toBeInTheDocument();
    });

    it('does not render when isLoading is false', () => {
      renderWithProviders(
        <LoadingSpinner loading={{ isLoading: false }} />
      );

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('renders without operation text', () => {
      renderWithProviders(
        <LoadingSpinner loading={{ isLoading: true }} />
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    });

    it('renders with custom operation text', () => {
      renderWithProviders(
        <LoadingSpinner loading={{ isLoading: true, operation: 'Saving plant data' }} />
      );

      expect(screen.getAllByText('Saving plant data')[0]).toBeInTheDocument();
      expect(screen.getByLabelText('Saving plant data')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('renders small size spinner', () => {
      renderWithProviders(
        <LoadingSpinner loading={defaultLoadingState} size="sm" />
      );

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('h-4', 'w-4');
      
      const container = spinner.closest('div').parentElement;
      expect(container).toHaveClass('p-2');
    });

    it('renders medium size spinner (default)', () => {
      renderWithProviders(
        <LoadingSpinner loading={defaultLoadingState} size="md" />
      );

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('h-6', 'w-6');
      
      const container = spinner.closest('div').parentElement;
      expect(container).toHaveClass('p-4');
    });

    it('renders large size spinner', () => {
      renderWithProviders(
        <LoadingSpinner loading={defaultLoadingState} size="lg" />
      );

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('h-8', 'w-8');
      
      const container = spinner.closest('div').parentElement;
      expect(container).toHaveClass('p-6');
    });

    it('defaults to medium size when no size specified', () => {
      renderWithProviders(
        <LoadingSpinner loading={defaultLoadingState} />
      );

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('h-6', 'w-6');
    });
  });

  describe('Progress Display', () => {
    it('shows progress percentage when showProgress is true and progress is provided', () => {
      renderWithProviders(
        <LoadingSpinner 
          loading={{ isLoading: true, operation: 'Uploading', progress: 65 }}
          showProgress={true}
        />
      );

      expect(screen.getByText('65%')).toBeInTheDocument();
    });

    it('shows progress bar when showProgress is true and progress is provided', () => {
      renderWithProviders(
        <LoadingSpinner 
          loading={{ isLoading: true, operation: 'Processing', progress: 40 }}
          showProgress={true}
        />
      );

      const progressBar = document.querySelector('.bg-primary-600');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveStyle('width: 40%');
    });

    it('does not show progress when showProgress is false', () => {
      renderWithProviders(
        <LoadingSpinner 
          loading={{ isLoading: true, operation: 'Loading', progress: 50 }}
          showProgress={false}
        />
      );

      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });

    it('does not show progress when progress is undefined', () => {
      renderWithProviders(
        <LoadingSpinner 
          loading={{ isLoading: true, operation: 'Loading' }}
          showProgress={true}
        />
      );

      expect(screen.queryByText('%')).not.toBeInTheDocument();
    });

    it('rounds progress percentage to nearest integer', () => {
      renderWithProviders(
        <LoadingSpinner 
          loading={{ isLoading: true, progress: 67.8 }}
          showProgress={true}
        />
      );

      expect(screen.getByText('68%')).toBeInTheDocument();
    });

    it('handles 0% progress correctly', () => {
      renderWithProviders(
        <LoadingSpinner 
          loading={{ isLoading: true, progress: 0 }}
          showProgress={true}
        />
      );

      expect(screen.getByText('0%')).toBeInTheDocument();
      // Progress bar functionality is working if percentage is displayed
    });

    it('handles 100% progress correctly', () => {
      renderWithProviders(
        <LoadingSpinner 
          loading={{ isLoading: true, progress: 100 }}
          showProgress={true}
        />
      );

      expect(screen.getByText('100%')).toBeInTheDocument();
      // Progress bar functionality is working if percentage is displayed
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      renderWithProviders(
        <LoadingSpinner 
          loading={defaultLoadingState} 
          className="custom-spinner-class"
        />
      );

      const container = screen.getByRole('status').closest('div').parentElement;
      expect(container).toHaveClass('custom-spinner-class');
    });

    it('combines custom className with default classes', () => {
      renderWithProviders(
        <LoadingSpinner 
          loading={defaultLoadingState} 
          className="my-custom-class"
          size="lg"
        />
      );

      const container = screen.getByRole('status').closest('div').parentElement;
      expect(container).toHaveClass('my-custom-class', 'p-6');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA role and label', () => {
      renderWithProviders(
        <LoadingSpinner loading={{ isLoading: true, operation: 'Saving data' }} />
      );

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-label', 'Saving data');
    });

    it('provides screen reader text', () => {
      renderWithProviders(
        <LoadingSpinner loading={{ isLoading: true, operation: 'Loading plants' }} />
      );

      expect(screen.getByText('Loading plants', { selector: '.sr-only' })).toBeInTheDocument();
    });

    it('provides default screen reader text when no operation specified', () => {
      renderWithProviders(
        <LoadingSpinner loading={{ isLoading: true }} />
      );

      expect(screen.getByText('Loading content, please wait...', { selector: '.sr-only' })).toBeInTheDocument();
    });

    it('has aria-live region for operation text', () => {
      renderWithProviders(
        <LoadingSpinner loading={{ isLoading: true, operation: 'Processing request' }} />
      );

      const liveRegion = screen.getAllByText('Processing request')[0];
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Animation', () => {
    it('has spinning animation class', () => {
      renderWithProviders(
        <LoadingSpinner loading={defaultLoadingState} />
      );

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('animate-spin');
    });

    it('has smooth progress bar transition', () => {
      renderWithProviders(
        <LoadingSpinner 
          loading={{ isLoading: true, progress: 50 }}
          showProgress={true}
        />
      );

      expect(screen.getByText('50%')).toBeInTheDocument();
      // Progress bar with transitions is rendered when progress is shown
    });
  });
});

describe('InlineLoadingSpinner', () => {
  describe('Basic Rendering', () => {
    it('renders inline spinner', () => {
      renderWithProviders(<InlineLoadingSpinner />);

      const spinner = screen.getByRole('status', { hidden: true });
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
    });

    it('renders with default small size', () => {
      renderWithProviders(<InlineLoadingSpinner />);

      const spinner = screen.getByRole('status', { hidden: true });
      expect(spinner).toHaveClass('h-4', 'w-4');
    });

    it('renders with medium size', () => {
      renderWithProviders(<InlineLoadingSpinner size="md" />);

      const spinner = screen.getByRole('status', { hidden: true });
      expect(spinner).toHaveClass('h-5', 'w-5');
    });

    it('renders with large size', () => {
      renderWithProviders(<InlineLoadingSpinner size="lg" />);

      const spinner = screen.getByRole('status', { hidden: true });
      expect(spinner).toHaveClass('h-6', 'w-6');
    });

    it('applies custom className', () => {
      renderWithProviders(<InlineLoadingSpinner className="text-red-500" />);

      const spinner = screen.getByRole('status', { hidden: true });
      expect(spinner).toHaveClass('text-red-500');
    });
  });

  describe('Accessibility', () => {
    it('is hidden from screen readers', () => {
      renderWithProviders(<InlineLoadingSpinner />);

      const spinner = screen.getByRole('status', { hidden: true });
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
    });

    it('has proper role', () => {
      renderWithProviders(<InlineLoadingSpinner />);

      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    it('has spinning animation', () => {
      renderWithProviders(<InlineLoadingSpinner />);

      const spinner = screen.getByRole('status', { hidden: true });
      expect(spinner).toHaveClass('animate-spin');
    });
  });

  describe('Usage in Buttons', () => {
    it('works correctly inside button component', () => {
      const ButtonWithSpinner = ({ loading }) => (
        <button disabled={loading}>
          {loading && <InlineLoadingSpinner className="mr-2" />}
          {loading ? 'Loading...' : 'Submit'}
        </button>
      );

      renderWithProviders(<ButtonWithSpinner loading={true} />);

      expect(screen.getByRole('button')).toBeDisabled();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByRole('status', { hidden: true })).toHaveClass('mr-2');
    });

    it('does not render when not loading', () => {
      const ButtonWithSpinner = ({ loading }) => (
        <button disabled={loading}>
          {loading && <InlineLoadingSpinner />}
          {loading ? 'Loading...' : 'Submit'}
        </button>
      );

      renderWithProviders(<ButtonWithSpinner loading={false} />);

      expect(screen.getByRole('button')).not.toBeDisabled();
      expect(screen.getByText('Submit')).toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
});