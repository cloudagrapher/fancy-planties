import { mockApiResponses, renderWithProviders } from '@/test-utils/helpers/render-helpers';
import { screen, waitFor } from '@testing-library/react';
import AdminNavigation from '../AdminNavigation';

describe('AdminNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API responses
    mockApiResponses({
      '/api/admin/pending-count': { count: 0 },
    });
  });

  describe('Basic Navigation', () => {
    it('should render all admin navigation items', () => {
      renderWithProviders(<AdminNavigation />, { route: '/admin' });

      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /users/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /plants/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /pending/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /taxonomy/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /audit/i })).toBeInTheDocument();
    });

    it('should render admin panel header', () => {
      renderWithProviders(<AdminNavigation />, { route: '/admin' });

      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });

    it('should render back to app link', () => {
      renderWithProviders(<AdminNavigation />, { route: '/admin' });

      const backLink = screen.getByRole('link', { name: /back to app/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('Active State Management', () => {
    it('should highlight active admin dashboard route', () => {
      renderWithProviders(<AdminNavigation />, { route: '/admin' });

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toHaveClass('admin-nav-item--active');
    });

    it('should highlight active users route', () => {
      renderWithProviders(<AdminNavigation />, { route: '/admin/users' });

      const usersLink = screen.getByRole('link', { name: /users/i });
      expect(usersLink).toHaveClass('admin-nav-item--active');
    });

    it('should highlight active plants route', () => {
      renderWithProviders(<AdminNavigation />, { route: '/admin/plants' });

      const plantsLink = screen.getByRole('link', { name: /plants/i });
      expect(plantsLink).toHaveClass('admin-nav-item--active');
    });

    it('should highlight active pending route', () => {
      renderWithProviders(<AdminNavigation />, { route: '/admin/plants/pending' });

      const pendingLink = screen.getByRole('link', { name: /pending/i });
      expect(pendingLink).toHaveClass('admin-nav-item--active');
    });

    it('should highlight active taxonomy route', () => {
      renderWithProviders(<AdminNavigation />, { route: '/admin/taxonomy' });

      const taxonomyLink = screen.getByRole('link', { name: /taxonomy/i });
      expect(taxonomyLink).toHaveClass('admin-nav-item--active');
    });

    it('should highlight active audit route', () => {
      renderWithProviders(<AdminNavigation />, { route: '/admin/audit' });

      const auditLink = screen.getByRole('link', { name: /audit/i });
      expect(auditLink).toHaveClass('admin-nav-item--active');
    });

    it('should handle nested routes correctly', () => {
      renderWithProviders(<AdminNavigation />, { route: '/admin/users/123' });

      const usersLink = screen.getByRole('link', { name: /users/i });
      expect(usersLink).toHaveClass('admin-nav-item--active');
    });

    it('should only highlight admin dashboard for exact admin route', () => {
      renderWithProviders(<AdminNavigation />, { route: '/admin/users' });

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).not.toHaveClass('admin-nav-item--active');
    });
  });

  describe('Pending Approvals Badge', () => {
    it('should display pending approvals badge when count > 0', async () => {
      mockApiResponses({
        '/api/admin/pending-count': { count: 5 },
      });

      renderWithProviders(<AdminNavigation />, { route: '/admin' });

      await waitFor(() => {
        const badge = screen.getByText('5');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass('admin-nav-badge');
      });
    });

    it('should display 99+ for large pending counts', async () => {
      mockApiResponses({
        '/api/admin/pending-count': { count: 150 },
      });

      renderWithProviders(<AdminNavigation />, { route: '/admin' });

      await waitFor(() => {
        const badge = screen.getByText('99+');
        expect(badge).toBeInTheDocument();
      });
    });

    it('should not display badge when count is zero', async () => {
      mockApiResponses({
        '/api/admin/pending-count': { count: 0 },
      });

      renderWithProviders(<AdminNavigation />, { route: '/admin' });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/pending-count');
      });

      expect(screen.queryByText('0')).not.toBeInTheDocument();
      expect(document.querySelector('.admin-nav-badge')).not.toBeInTheDocument();
    });

    it('should handle missing count property', async () => {
      mockApiResponses({
        '/api/admin/pending-count': {},
      });

      renderWithProviders(<AdminNavigation />, { route: '/admin' });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/pending-count');
      });

      expect(document.querySelector('.admin-nav-badge')).not.toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    it('should fetch pending count on mount', async () => {
      renderWithProviders(<AdminNavigation />, { route: '/admin' });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/pending-count');
      });
    });

    it('should handle fetch errors gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      renderWithProviders(<AdminNavigation />, { route: '/admin' });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch pending approvals:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('should handle non-ok responses gracefully', async () => {
      mockApiResponses({
        '/api/admin/pending-count': { ok: false, status: 500 },
      });

      renderWithProviders(<AdminNavigation />, { route: '/admin' });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/pending-count');
      });

      // Should not display any badge
      expect(document.querySelector('.admin-nav-badge')).not.toBeInTheDocument();
    });
  });

  describe('Periodic Updates', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should refresh pending count every 30 seconds', async () => {
      mockApiResponses({
        '/api/admin/pending-count': { count: 1 },
      });

      renderWithProviders(<AdminNavigation />, { route: '/admin' });

      // Wait for initial load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/pending-count');
      });

      // Clear the mock to count only interval calls
      (global.fetch as jest.Mock).mockClear();

      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/pending-count');
      });
    });

    it('should clear interval on unmount', async () => {
      mockApiResponses({
        '/api/admin/pending-count': { count: 1 },
      });

      const { unmount } = renderWithProviders(<AdminNavigation />, { route: '/admin' });

      // Wait for initial load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/pending-count');
      });

      // Unmount component
      unmount();

      // Clear the mock
      (global.fetch as jest.Mock).mockClear();

      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000);

      // Should not call API after unmount
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Navigation Links', () => {
    it('should have correct href attributes', () => {
      renderWithProviders(<AdminNavigation />, { route: '/admin' });

      expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/admin');
      expect(screen.getByRole('link', { name: /users/i })).toHaveAttribute('href', '/admin/users');
      expect(screen.getByRole('link', { name: /plants/i })).toHaveAttribute('href', '/admin/plants');
      expect(screen.getByRole('link', { name: /pending/i })).toHaveAttribute('href', '/admin/plants/pending');
      expect(screen.getByRole('link', { name: /taxonomy/i })).toHaveAttribute('href', '/admin/taxonomy');
      expect(screen.getByRole('link', { name: /audit/i })).toHaveAttribute('href', '/admin/audit');
    });

    it('should display correct icons and labels', () => {
      renderWithProviders(<AdminNavigation />, { route: '/admin' });

      // Check that icons are present (they should be in the DOM)
      const dashboardIcon = document.querySelector('.admin-nav-icon');
      expect(dashboardIcon).toBeInTheDocument();

      // Check labels
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Plants')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Taxonomy')).toBeInTheDocument();
      expect(screen.getByText('Audit')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should have proper CSS classes', () => {
      renderWithProviders(<AdminNavigation />, { route: '/admin' });

      expect(document.querySelector('.admin-nav')).toBeInTheDocument();
      expect(document.querySelector('.admin-nav-header')).toBeInTheDocument();
      expect(document.querySelector('.admin-nav-items')).toBeInTheDocument();
      expect(document.querySelector('.admin-nav-back')).toBeInTheDocument();
    });

    it('should render navigation items with proper structure', () => {
      renderWithProviders(<AdminNavigation />, { route: '/admin' });

      const navItems = document.querySelectorAll('.admin-nav-item');
      expect(navItems).toHaveLength(6); // 6 navigation items

      navItems.forEach(item => {
        expect(item.querySelector('.admin-nav-icon')).toBeInTheDocument();
        expect(item.querySelector('.admin-nav-label')).toBeInTheDocument();
      });
    });
  });
});