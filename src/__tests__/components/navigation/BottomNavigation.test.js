/**
 * @jest-environment jsdom
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test-utils/helpers/render-helpers';
import BottomNavigation from '@/components/navigation/BottomNavigation';

// Mock Next.js navigation
const mockPathname = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

// Mock haptic feedback hook
const mockTriggerHaptic = jest.fn();

jest.mock('@/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({
    triggerHaptic: mockTriggerHaptic,
  }),
}));

describe('BottomNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname.mockReturnValue('/dashboard');
  });

  describe('Navigation Rendering', () => {
    it('renders all navigation items', () => {
      renderWithProviders(<BottomNavigation />);

      expect(screen.getByRole('link', { name: /navigate to plants/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /navigate to care/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /navigate to dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /navigate to propagations/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /navigate to handbook/i })).toBeInTheDocument();
    });

    it('renders navigation icons', () => {
      renderWithProviders(<BottomNavigation />);

      expect(screen.getByText('🌱')).toBeInTheDocument(); // Plants
      expect(screen.getByText('💧')).toBeInTheDocument(); // Care
      expect(screen.getByText('🏠')).toBeInTheDocument(); // Dashboard
      expect(screen.getByText('🌿')).toBeInTheDocument(); // Propagations
      expect(screen.getByText('📖')).toBeInTheDocument(); // Handbook
    });

    it('renders navigation labels', () => {
      renderWithProviders(<BottomNavigation />);

      expect(screen.getByText('Plants')).toBeInTheDocument();
      expect(screen.getByText('Care')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Propagations')).toBeInTheDocument();
      expect(screen.getByText('Handbook')).toBeInTheDocument();
    });

    it('has proper navigation structure', () => {
      renderWithProviders(<BottomNavigation />);

      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveClass('bottom-nav');

      const container = nav.querySelector('.bottom-nav-container');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Active State Management', () => {
    it('marks dashboard as active when on dashboard route', () => {
      mockPathname.mockReturnValue('/dashboard');
      renderWithProviders(<BottomNavigation />);

      const dashboardLink = screen.getByRole('link', { name: /navigate to dashboard/i });
      expect(dashboardLink).toHaveClass('bottom-nav-item--active');
    });

    it('marks plants as active when on plants route', () => {
      mockPathname.mockReturnValue('/dashboard/plants');
      renderWithProviders(<BottomNavigation />);

      const plantsLink = screen.getByRole('link', { name: /navigate to plants/i });
      expect(plantsLink).toHaveClass('bottom-nav-item--active');
    });

    it('marks care as active when on care route', () => {
      mockPathname.mockReturnValue('/dashboard/care');
      renderWithProviders(<BottomNavigation />);

      const careLink = screen.getByRole('link', { name: /navigate to care/i });
      expect(careLink).toHaveClass('bottom-nav-item--active');
    });

    it('marks propagations as active when on propagations route', () => {
      mockPathname.mockReturnValue('/dashboard/propagations');
      renderWithProviders(<BottomNavigation />);

      const propagationsLink = screen.getByRole('link', { name: /navigate to propagations/i });
      expect(propagationsLink).toHaveClass('bottom-nav-item--active');
    });

    it('marks handbook as active when on handbook route', () => {
      mockPathname.mockReturnValue('/dashboard/handbook');
      renderWithProviders(<BottomNavigation />);

      const handbookLink = screen.getByRole('link', { name: /navigate to handbook/i });
      expect(handbookLink).toHaveClass('bottom-nav-item--active');
    });

    it('handles nested routes correctly', () => {
      mockPathname.mockReturnValue('/dashboard/plants/123');
      renderWithProviders(<BottomNavigation />);

      const plantsLink = screen.getByRole('link', { name: /navigate to plants/i });
      expect(plantsLink).toHaveClass('bottom-nav-item--active');
    });

    it('only marks dashboard as active for exact dashboard route', () => {
      mockPathname.mockReturnValue('/dashboard/plants');
      renderWithProviders(<BottomNavigation />);

      const dashboardLink = screen.getByRole('link', { name: /navigate to dashboard/i });
      expect(dashboardLink).not.toHaveClass('bottom-nav-item--active');
      expect(dashboardLink).toHaveClass('bottom-nav-item--inactive');
    });

    it('marks inactive items with inactive class', () => {
      mockPathname.mockReturnValue('/dashboard/plants');
      renderWithProviders(<BottomNavigation />);

      const careLink = screen.getByRole('link', { name: /navigate to care/i });
      const dashboardLink = screen.getByRole('link', { name: /navigate to dashboard/i });
      const propagationsLink = screen.getByRole('link', { name: /navigate to propagations/i });

      expect(careLink).toHaveClass('bottom-nav-item--inactive');
      expect(dashboardLink).toHaveClass('bottom-nav-item--inactive');
      expect(propagationsLink).toHaveClass('bottom-nav-item--inactive');
    });
  });

  describe('Navigation Links', () => {
    it('has correct href attributes', () => {
      renderWithProviders(<BottomNavigation />);

      expect(screen.getByRole('link', { name: /navigate to plants/i })).toHaveAttribute('href', '/dashboard/plants');
      expect(screen.getByRole('link', { name: /navigate to care/i })).toHaveAttribute('href', '/dashboard/care');
      expect(screen.getByRole('link', { name: /navigate to dashboard/i })).toHaveAttribute('href', '/dashboard');
      expect(screen.getByRole('link', { name: /navigate to propagations/i })).toHaveAttribute('href', '/dashboard/propagations');
      expect(screen.getByRole('link', { name: /navigate to handbook/i })).toHaveAttribute('href', '/dashboard/handbook');
    });

    it('has proper title attributes for tooltips', () => {
      renderWithProviders(<BottomNavigation />);

      expect(screen.getByRole('link', { name: /navigate to plants/i })).toHaveAttribute('title', 'Navigate to Plants');
      expect(screen.getByRole('link', { name: /navigate to care/i })).toHaveAttribute('title', 'Navigate to Care');
      expect(screen.getByRole('link', { name: /navigate to dashboard/i })).toHaveAttribute('title', 'Navigate to Dashboard');
    });
  });

  describe('Care Notification Badge', () => {
    it('does not show badge when no notifications', () => {
      renderWithProviders(<BottomNavigation careNotificationCount={0} />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('shows badge with notification count', () => {
      renderWithProviders(<BottomNavigation careNotificationCount={5} />);

      const badge = screen.getByRole('status', { name: /5 notifications/i });
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('5');
      expect(badge).toHaveClass('bottom-nav-badge');
    });

    it('shows 99+ for counts over 99', () => {
      renderWithProviders(<BottomNavigation careNotificationCount={150} />);

      const badge = screen.getByRole('status', { name: /150 notifications/i });
      expect(badge).toHaveTextContent('99+');
    });

    it('updates care link aria-label with notification count', () => {
      renderWithProviders(<BottomNavigation careNotificationCount={3} />);

      const careLink = screen.getByRole('link', { name: /navigate to care \(3 notifications\)/i });
      expect(careLink).toBeInTheDocument();
      expect(careLink).toHaveAttribute('title', 'Navigate to Care (3 notifications)');
    });

    it('badge has proper accessibility attributes', () => {
      renderWithProviders(<BottomNavigation careNotificationCount={7} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', '7 notifications');
    });
  });

  describe('User Interactions', () => {
    it('triggers haptic feedback on touch', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BottomNavigation />);

      const plantsLink = screen.getByRole('link', { name: /navigate to plants/i });
      
      // Simulate touch start
      await user.pointer({ keys: '[TouchA>]', target: plantsLink });

      expect(mockTriggerHaptic).toHaveBeenCalledWith('selection');
    });

    it('triggers haptic feedback on mouse down', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BottomNavigation />);

      const plantsLink = screen.getByRole('link', { name: /navigate to plants/i });
      
      // Simulate mouse down
      await user.pointer({ keys: '[MouseLeft>]', target: plantsLink });

      expect(mockTriggerHaptic).toHaveBeenCalledWith('selection');
    });

    it('applies pressed state temporarily', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BottomNavigation />);

      const plantsLink = screen.getByRole('link', { name: /navigate to plants/i });
      
      // Simulate touch start
      await user.pointer({ keys: '[TouchA>]', target: plantsLink });

      // Should have pressed class temporarily
      expect(plantsLink).toHaveClass('bottom-nav-item--pressed');

      // Wait for pressed state to be removed
      await waitFor(() => {
        expect(plantsLink).not.toHaveClass('bottom-nav-item--pressed');
      }, { timeout: 200 });
    });

    it('handles multiple rapid taps correctly', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BottomNavigation />);

      const plantsLink = screen.getByRole('link', { name: /navigate to plants/i });
      
      // Rapid taps
      await user.pointer({ keys: '[TouchA>]', target: plantsLink });
      await user.pointer({ keys: '[TouchA>]', target: plantsLink });
      await user.pointer({ keys: '[TouchA>]', target: plantsLink });

      expect(mockTriggerHaptic).toHaveBeenCalledTimes(3);
    });
  });

  describe('Accessibility', () => {
    it('has proper navigation landmark', () => {
      renderWithProviders(<BottomNavigation />);

      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('has descriptive aria-labels for all links', () => {
      renderWithProviders(<BottomNavigation />);

      expect(screen.getByLabelText(/navigate to plants/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/navigate to care/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/navigate to dashboard/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/navigate to propagations/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/navigate to handbook/i)).toBeInTheDocument();
    });

    it('marks icons as decorative with aria-hidden', () => {
      renderWithProviders(<BottomNavigation />);

      const icons = screen.getAllByText(/[🌱💧🏠🌿📖]/);
      icons.forEach(icon => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('provides screen reader context for notification badges', () => {
      renderWithProviders(<BottomNavigation careNotificationCount={5} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', '5 notifications');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BottomNavigation />);

      // Tab through navigation items
      await user.tab();
      expect(screen.getByRole('link', { name: /navigate to plants/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('link', { name: /navigate to care/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('link', { name: /navigate to dashboard/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('link', { name: /navigate to propagations/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('link', { name: /navigate to handbook/i })).toHaveFocus();
    });

    it('supports Enter key activation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BottomNavigation />);

      const plantsLink = screen.getByRole('link', { name: /navigate to plants/i });
      plantsLink.focus();

      await user.keyboard('{Enter}');

      // Link should be activated (Next.js Link handles navigation)
      expect(plantsLink).toHaveAttribute('href', '/dashboard/plants');
    });
  });

  describe('Responsive Behavior', () => {
    it('maintains consistent structure across screen sizes', () => {
      renderWithProviders(<BottomNavigation />);

      const nav = screen.getByRole('navigation');
      const container = nav.querySelector('.bottom-nav-container');
      const items = screen.getAllByRole('link');

      expect(nav).toHaveClass('bottom-nav');
      expect(container).toHaveClass('bottom-nav-container');
      expect(items).toHaveLength(5);
    });

    it('preserves all navigation items on mobile', () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(<BottomNavigation />);

      const items = screen.getAllByRole('link');
      expect(items).toHaveLength(5);
    });
  });

  describe('State Consistency', () => {
    it('maintains active state when component re-renders', () => {
      mockPathname.mockReturnValue('/dashboard/plants');
      const { rerender } = renderWithProviders(<BottomNavigation />);

      let plantsLink = screen.getByRole('link', { name: /navigate to plants/i });
      expect(plantsLink).toHaveClass('bottom-nav-item--active');

      // Re-render with same pathname
      rerender(<BottomNavigation />);

      plantsLink = screen.getByRole('link', { name: /navigate to plants/i });
      expect(plantsLink).toHaveClass('bottom-nav-item--active');
    });

    it('updates active state when pathname changes', () => {
      mockPathname.mockReturnValue('/dashboard/plants');
      const { rerender } = renderWithProviders(<BottomNavigation />);

      let plantsLink = screen.getByRole('link', { name: /navigate to plants/i });
      let careLink = screen.getByRole('link', { name: /navigate to care/i });
      
      expect(plantsLink).toHaveClass('bottom-nav-item--active');
      expect(careLink).toHaveClass('bottom-nav-item--inactive');

      // Change pathname
      mockPathname.mockReturnValue('/dashboard/care');
      rerender(<BottomNavigation />);

      plantsLink = screen.getByRole('link', { name: /navigate to plants/i });
      careLink = screen.getByRole('link', { name: /navigate to care/i });

      expect(plantsLink).toHaveClass('bottom-nav-item--inactive');
      expect(careLink).toHaveClass('bottom-nav-item--active');
    });

    it('updates notification badge when count changes', () => {
      const { rerender } = renderWithProviders(<BottomNavigation careNotificationCount={3} />);

      expect(screen.getByRole('status', { name: /3 notifications/i })).toBeInTheDocument();

      // Update notification count
      rerender(<BottomNavigation careNotificationCount={7} />);

      expect(screen.getByRole('status', { name: /7 notifications/i })).toBeInTheDocument();
      expect(screen.queryByRole('status', { name: /3 notifications/i })).not.toBeInTheDocument();
    });

    it('removes badge when notification count becomes zero', () => {
      const { rerender } = renderWithProviders(<BottomNavigation careNotificationCount={5} />);

      expect(screen.getByRole('status')).toBeInTheDocument();

      // Set count to zero
      rerender(<BottomNavigation careNotificationCount={0} />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
});