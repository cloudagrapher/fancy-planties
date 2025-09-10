/**
 * @jest-environment jsdom
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test-utils/helpers/render-helpers';
import Modal, { ModalWithTabs, ConfirmationModal } from '@/components/shared/Modal';

// Mock createPortal to render in the same container for testing
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node) => node,
}));

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    children: <div data-testid="modal-content">Modal Content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset body overflow style
    document.body.style.overflow = 'unset';
  });

  describe('Basic Modal Rendering', () => {
    it('renders modal when isOpen is true', () => {
      renderWithProviders(<Modal {...defaultProps} />);

      expect(screen.getByTestId('modal-content')).toBeInTheDocument();
      expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
    });

    it('does not render modal when isOpen is false', () => {
      renderWithProviders(<Modal {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId('modal-content')).not.toBeInTheDocument();
    });

    it('renders modal with title', () => {
      renderWithProviders(<Modal {...defaultProps} title="Test Modal" />);

      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Test Modal');
    });

    it('renders modal without title', () => {
      renderWithProviders(<Modal {...defaultProps} />);

      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('renders modal with footer', () => {
      const footer = <div data-testid="modal-footer">Footer Content</div>;
      renderWithProviders(<Modal {...defaultProps} footer={footer} />);

      expect(screen.getByTestId('modal-footer')).toBeInTheDocument();
    });
  });

  describe('Modal Sizes', () => {
    it('renders default size modal', () => {
      renderWithProviders(<Modal {...defaultProps} />);

      const modalContent = document.querySelector('.modal-content');
      expect(modalContent).not.toHaveClass('modal-content--large');
    });

    it('renders large size modal', () => {
      renderWithProviders(<Modal {...defaultProps} size="large" />);

      const modalContent = document.querySelector('.modal-content');
      expect(modalContent).toHaveClass('modal-content--large');
    });
  });

  describe('Close Button', () => {
    it('shows close button by default', () => {
      renderWithProviders(<Modal {...defaultProps} title="Test Modal" />);

      expect(screen.getByLabelText(/close modal/i)).toBeInTheDocument();
    });

    it('hides close button when showCloseButton is false', () => {
      renderWithProviders(<Modal {...defaultProps} title="Test Modal" showCloseButton={false} />);

      expect(screen.queryByLabelText(/close modal/i)).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Modal {...defaultProps} title="Test Modal" />);

      await user.click(screen.getByLabelText(/close modal/i));

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Backdrop Interaction', () => {
    it('closes modal when backdrop is clicked by default', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Modal {...defaultProps} />);

      const overlay = document.querySelector('.modal-overlay');
      await user.click(overlay);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('does not close modal when backdrop is clicked and closeOnBackdropClick is false', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Modal {...defaultProps} closeOnBackdropClick={false} />);

      const overlay = document.querySelector('.modal-overlay');
      await user.click(overlay);

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('does not close modal when clicking on modal content', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Modal {...defaultProps} />);

      await user.click(screen.getByTestId('modal-content'));

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Interaction', () => {
    it('closes modal on Escape key by default', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Modal {...defaultProps} />);

      await user.keyboard('{Escape}');

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('does not close modal on Escape key when closeOnEscape is false', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Modal {...defaultProps} closeOnEscape={false} />);

      await user.keyboard('{Escape}');

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('ignores other keys', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Modal {...defaultProps} />);

      await user.keyboard('{Enter}');
      await user.keyboard('{Space}');
      await user.keyboard('a');

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Body Scroll Management', () => {
    it('prevents body scroll when modal is open', () => {
      renderWithProviders(<Modal {...defaultProps} />);

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body scroll when modal is closed', () => {
      const { rerender } = renderWithProviders(<Modal {...defaultProps} />);

      expect(document.body.style.overflow).toBe('hidden');

      rerender(<Modal {...defaultProps} isOpen={false} />);

      expect(document.body.style.overflow).toBe('unset');
    });

    it('restores body scroll on unmount', () => {
      const { unmount } = renderWithProviders(<Modal {...defaultProps} />);

      expect(document.body.style.overflow).toBe('hidden');

      unmount();

      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Accessibility', () => {
    it('has proper modal structure', () => {
      renderWithProviders(<Modal {...defaultProps} title="Test Modal" />);

      const modal = screen.getByRole('dialog', { hidden: true });
      expect(modal).toBeInTheDocument();
    });

    it('has accessible close button', () => {
      renderWithProviders(<Modal {...defaultProps} title="Test Modal" />);

      const closeButton = screen.getByLabelText(/close modal/i);
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('aria-label', 'Close modal');
    });

    it('focuses management works correctly', async () => {
      renderWithProviders(<Modal {...defaultProps} title="Test Modal" />);

      // Modal should be focusable
      const modal = screen.getByRole('dialog', { hidden: true });
      expect(modal).toBeInTheDocument();
    });
  });
});

describe('ModalWithTabs', () => {
  const tabs = [
    { id: 'tab1', label: 'Tab 1', icon: '📝', content: <div data-testid="tab1-content">Tab 1 Content</div> },
    { id: 'tab2', label: 'Tab 2', icon: '📊', content: <div data-testid="tab2-content">Tab 2 Content</div> },
    { id: 'tab3', label: 'Tab 3', content: <div data-testid="tab3-content">Tab 3 Content</div> },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: 'Tabbed Modal',
    tabs,
    activeTab: 'tab1',
    onTabChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tab Rendering', () => {
    it('renders all tabs', () => {
      renderWithProviders(<ModalWithTabs {...defaultProps} />);

      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 2')).toBeInTheDocument();
      expect(screen.getByText('Tab 3')).toBeInTheDocument();
    });

    it('renders tab icons when provided', () => {
      renderWithProviders(<ModalWithTabs {...defaultProps} />);

      expect(screen.getByText('📝')).toBeInTheDocument();
      expect(screen.getByText('📊')).toBeInTheDocument();
    });

    it('shows active tab content', () => {
      renderWithProviders(<ModalWithTabs {...defaultProps} />);

      expect(screen.getByTestId('tab1-content')).toBeInTheDocument();
      expect(screen.queryByTestId('tab2-content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tab3-content')).not.toBeInTheDocument();
    });

    it('marks active tab with active class', () => {
      renderWithProviders(<ModalWithTabs {...defaultProps} />);

      const tab1Button = screen.getByText('Tab 1').closest('button');
      const tab2Button = screen.getByText('Tab 2').closest('button');

      expect(tab1Button).toHaveClass('tab--active');
      expect(tab2Button).not.toHaveClass('tab--active');
    });
  });

  describe('Tab Interaction', () => {
    it('calls onTabChange when tab is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ModalWithTabs {...defaultProps} />);

      await user.click(screen.getByText('Tab 2'));

      expect(defaultProps.onTabChange).toHaveBeenCalledWith('tab2');
    });

    it('switches tab content when activeTab changes', () => {
      const { rerender } = renderWithProviders(<ModalWithTabs {...defaultProps} />);

      expect(screen.getByTestId('tab1-content')).toBeInTheDocument();

      rerender(<ModalWithTabs {...defaultProps} activeTab="tab2" />);

      expect(screen.queryByTestId('tab1-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('tab2-content')).toBeInTheDocument();
    });

    it('handles keyboard navigation between tabs', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ModalWithTabs {...defaultProps} />);

      const tab1 = screen.getByText('Tab 1');
      const tab2 = screen.getByText('Tab 2');

      tab1.focus();
      await user.tab();
      expect(tab2).toHaveFocus();
    });
  });

  describe('Modal Integration', () => {
    it('includes modal title', () => {
      renderWithProviders(<ModalWithTabs {...defaultProps} />);

      expect(screen.getByText('Tabbed Modal')).toBeInTheDocument();
    });

    it('has close button', () => {
      renderWithProviders(<ModalWithTabs {...defaultProps} />);

      expect(screen.getByLabelText(/close modal/i)).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ModalWithTabs {...defaultProps} />);

      await user.click(screen.getByLabelText(/close modal/i));

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });
});

describe('ConfirmationModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Confirmation Modal Rendering', () => {
    it('renders confirmation modal with title and message', () => {
      renderWithProviders(<ConfirmationModal {...defaultProps} />);

      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    });

    it('renders default button text', () => {
      renderWithProviders(<ConfirmationModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('renders custom button text', () => {
      renderWithProviders(
        <ConfirmationModal 
          {...defaultProps} 
          confirmText="Delete" 
          cancelText="Keep" 
        />
      );

      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /keep/i })).toBeInTheDocument();
    });

    it('renders danger variant styling', () => {
      renderWithProviders(<ConfirmationModal {...defaultProps} variant="danger" />);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      expect(confirmButton).toHaveClass('btn--danger');
    });

    it('renders default variant styling', () => {
      renderWithProviders(<ConfirmationModal {...defaultProps} variant="default" />);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      expect(confirmButton).toHaveClass('btn--primary');
    });
  });

  describe('Confirmation Modal Interaction', () => {
    it('calls onConfirm when confirm button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ConfirmationModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /confirm/i }));

      expect(defaultProps.onConfirm).toHaveBeenCalled();
    });

    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ConfirmationModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('calls onClose when modal is closed via backdrop', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ConfirmationModal {...defaultProps} />);

      const overlay = document.querySelector('.modal-overlay');
      await user.click(overlay);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('calls onClose when Escape key is pressed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ConfirmationModal {...defaultProps} />);

      await user.keyboard('{Escape}');

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('disables buttons when loading', () => {
      renderWithProviders(<ConfirmationModal {...defaultProps} isLoading={true} />);

      expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('shows loading class on confirm button', () => {
      renderWithProviders(<ConfirmationModal {...defaultProps} isLoading={true} />);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      expect(confirmButton).toHaveClass('btn--loading');
    });

    it('prevents modal close when loading', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ConfirmationModal {...defaultProps} isLoading={true} />);

      // Try to close via backdrop
      const overlay = document.querySelector('.modal-overlay');
      await user.click(overlay);

      expect(defaultProps.onClose).not.toHaveBeenCalled();

      // Try to close via Escape
      await user.keyboard('{Escape}');

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper button roles and labels', () => {
      renderWithProviders(<ConfirmationModal {...defaultProps} />);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      expect(confirmButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
    });

    it('focuses confirm button by default', async () => {
      renderWithProviders(<ConfirmationModal {...defaultProps} />);

      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        expect(confirmButton).toHaveFocus();
      });
    });

    it('allows keyboard navigation between buttons', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ConfirmationModal {...defaultProps} />);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      confirmButton.focus();
      await user.tab();
      expect(cancelButton).toHaveFocus();

      await user.tab({ shift: true });
      expect(confirmButton).toHaveFocus();
    });
  });
});