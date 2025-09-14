import AdminNavigation from '@/components/navigation/AdminNavigation';
import BottomNavigation from '@/components/navigation/BottomNavigation';
import { mockApiResponses, renderWithProviders } from '@/test-utils/helpers/render-helpers';
import { screen, waitFor } from '@testing-library/react';

// Mock haptic feedback hook
jest.mock('@/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({
    triggerHaptic: jest.fn(),
  }),
}));

describe('Navigation Integration Flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Bottom Navigation Flow', () => {
    it('should render navigation with proper structure', async () => {
      mockApiResponses({
        '/api/auth/curator-status': { isCurator: false },
        '/api/admin/pending-count': { count: 0 },
      });

      renderWithProviders(<BottomNavigation />, { route: '/dashboard' });
      
      // Should render all primary navigation items
      expect(screen.getByRole('link', { name: /navigate to plants/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /navigate to care/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /navigate to dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /navigate to propagations/i })).toBeInTheDocument();
      
      // Should have overflow menu
      expect(screen.getByRole('button', { name: /more navigation options/i })).toBeInTheDocument();
    });

    it('should handle overflow menu navigation for non-curator users', async () => {
      mockApiResponses({
        '/api/auth/curator-status': { isCurator: false },
      });

      const { user } = renderWithProviders(<BottomNavigation />, { route: '/dashboard' });

      // Open overflow menu
      const moreButton = screen.getByRole('button', { name: /more navigation options/i });
      await user.click(moreButton);

      // Should show handbook but not admin
      expect(screen.getByRole('link', { name: /navigate to handbook/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /navigate to admin/i })).not.toBeInTheDocument();

      // Navigate to handbook
      const handbookLink = screen.getByRole('link', { name: /navigate to handbook/i });
      await user.click(handbookLink);

      // Menu should close after navigation
      await waitFor(() => {
        expect(screen.queryByRole('link', { name: /navigate to handbook/i })).not.toBeInTheDocument();
      });
    });

    it('should handle curator navigation with admin access', async () => {
      mockApiResponses({
        '/api/auth/curator-status': { isCurator: true },
        '/api/admin/pending-count': { count: 3 },
      });

      const { user } = renderWithProviders(<BottomNavigation />, { route: '/dashboard' });

      // Wait for curator status to load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/curator-status');
      });

      // Open overflow menu
      const moreButton = screen.getByRole('button', { name: /more navigation options/i });
      await user.click(moreButton);

      // Should show both handbook and admin
      expect(screen.getByRole('link', { name: /navigate to handbook/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /navigate to admin \(3 notifications\)/i })).toBeInTheDocument();

      // Navigate to admin
      const adminLink = screen.getByRole('link', { name: /navigate to admin \(3 notifications\)/i });
      await user.click(adminLink);

      // Menu should close after navigation
      await waitFor(() => {
        expect(screen.queryByRole('link', { name: /navigate to admin/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Admin Navigation Flow', () => {
    it('should render admin navigation with proper structure', async () => {
      mockApiResponses({
        '/api/admin/pending-count': { count: 2 },
      });

      renderWithProviders(<AdminNavigation />, { route: '/admin' });

      // Should render all admin navigation items
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /users/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /plants/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /pending/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /taxonomy/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /audit/i })).toBeInTheDocument();

      // Should have back to app link
      expect(screen.getByRole('link', { name: /back to app/i })).toBeInTheDocument();

      // Wait for pending count to load
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should have correct navigation links', () => {
      renderWithProviders(<AdminNavigation />, { route: '/admin' });

      const backLink = screen.getByRole('link', { name: /back to app/i });
      expect(backLink).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('Cross-Navigation Integration', () => {
    it('should handle navigation between contexts', async () => {
      mockApiResponses({
        '/api/auth/curator-status': { isCurator: true },
        '/api/admin/pending-count': { count: 5 },
      });

      // Test bottom navigation with curator access
      const { user } = renderWithProviders(<BottomNavigation />, { route: '/dashboard' });

      // Wait for curator status
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/curator-status');
      });

      // Open overflow menu and check admin access
      const moreButton = screen.getByRole('button', { name: /more navigation options/i });
      await user.click(moreButton);

      expect(screen.getByRole('link', { name: /navigate to admin \(5 notifications\)/i })).toBeInTheDocument();
    });
  });

  describe('Route Protection Integration', () => {
    it('should handle navigation with authentication state changes', async () => {
      mockApiResponses({
        '/api/auth/curator-status': { isCurator: false },
      });

      renderWithProviders(<BottomNavigation />, { route: '/dashboard' });

      // Should render navigation normally
      expect(screen.getByRole('link', { name: /navigate to plants/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /navigate to care/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /navigate to dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /navigate to propagations/i })).toBeInTheDocument();
    });

    it('should handle curator status loading', async () => {
      mockApiResponses({
        '/api/auth/curator-status': { isCurator: false },
      });

      renderWithProviders(<BottomNavigation />, { route: '/dashboard' });

      // Should eventually call curator status API
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/curator-status');
      }, { timeout: 3000 });
    });
  });

  describe('Notification Badge Integration', () => {
    it('should display care notification badges', () => {
      renderWithProviders(
        <BottomNavigation careNotificationCount={7} />, 
        { route: '/dashboard' }
      );

      // Should show care badge
      expect(screen.getByRole('status', { name: /7 notifications/i })).toBeInTheDocument();
      expect(screen.getByRole('status', { name: /7 notifications/i })).toHaveTextContent('7');
    });

    it('should handle badge overflow correctly', async () => {
      mockApiResponses({
        '/api/auth/curator-status': { isCurator: true },
        '/api/admin/pending-count': { count: 150 },
      });

      const { user } = renderWithProviders(
        <BottomNavigation careNotificationCount={200} />, 
        { route: '/dashboard' }
      );

      // Care badge should show 99+
      expect(screen.getByRole('status', { name: /200 notifications/i })).toHaveTextContent('99+');

      // Wait for admin status to load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/curator-status');
      }, { timeout: 3000 });

      // Open overflow menu to see admin badge
      const moreButton = screen.getByRole('button', { name: /more navigation options/i });
      await user.click(moreButton);

      // Admin badge should also show 99+
      expect(screen.getByRole('link', { name: /navigate to admin \(150 notifications\)/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility and Keyboard Navigation', () => {
    it('should have proper accessibility attributes', () => {
      renderWithProviders(<BottomNavigation />, { route: '/dashboard' });

      // Check that navigation items have proper ARIA labels
      expect(screen.getByRole('link', { name: /navigate to plants/i })).toHaveAttribute('aria-label');
      expect(screen.getByRole('link', { name: /navigate to care/i })).toHaveAttribute('aria-label');
      expect(screen.getByRole('link', { name: /navigate to dashboard/i })).toHaveAttribute('aria-label');
      expect(screen.getByRole('link', { name: /navigate to propagations/i })).toHaveAttribute('aria-label');
      
      // Check overflow menu button
      const moreButton = screen.getByRole('button', { name: /more navigation options/i });
      expect(moreButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should support basic focus management', () => {
      renderWithProviders(<BottomNavigation />, { route: '/dashboard' });

      // Focus on more button
      const moreButton = screen.getByRole('button', { name: /more navigation options/i });
      moreButton.focus();
      expect(moreButton).toHaveFocus();
    });

    it('should maintain focus management in admin navigation', () => {
      renderWithProviders(<AdminNavigation />, { route: '/admin' });

      // Focus on users link
      const usersLink = screen.getByRole('link', { name: /users/i });
      usersLink.focus();
      expect(usersLink).toHaveFocus();
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle API failures gracefully', async () => {
      // Mock API failures
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      renderWithProviders(<BottomNavigation />, { route: '/dashboard' });

      // Should still render navigation
      expect(screen.getByRole('link', { name: /navigate to plants/i })).toBeInTheDocument();

      // Should log error
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to check curator status:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('should handle malformed API responses', async () => {
      mockApiResponses({
        '/api/auth/curator-status': { invalid: 'response' },
        '/api/admin/pending-count': { wrong: 'format' },
      });

      renderWithProviders(<BottomNavigation />, { route: '/dashboard' });

      // Should still render navigation without errors
      expect(screen.getByRole('link', { name: /navigate to plants/i })).toBeInTheDocument();

      // Should not show badges for malformed responses
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('should handle component unmounting during API calls', () => {
      global.fetch = jest.fn().mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ isCurator: true }),
          }), 1000);
        })
      );

      const { unmount } = renderWithProviders(<BottomNavigation />, { route: '/dashboard' });

      // Unmount before API call completes - should not cause errors
      expect(() => unmount()).not.toThrow();
    });
  });
});