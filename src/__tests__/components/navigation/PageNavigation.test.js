/**
 * @jest-environment jsdom
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test-utils/helpers/render-helpers';

// Mock Next.js navigation hooks
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockForward = jest.fn();
const mockRefresh = jest.fn();
const mockPathname = jest.fn();
const mockSearchParams = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    forward: mockForward,
    refresh: mockRefresh,
  }),
  usePathname: () => mockPathname(),
  useSearchParams: () => ({
    get: mockSearchParams,
    toString: () => 'param1=value1&param2=value2',
  }),
}));

// Test component that uses navigation
const NavigationTestComponent = () => {
  const router = require('next/navigation').useRouter();
  const pathname = require('next/navigation').usePathname();
  const searchParams = require('next/navigation').useSearchParams();

  return (
    <div data-testid="navigation-test">
      <div data-testid="current-path">{pathname}</div>
      <div data-testid="search-params">{searchParams.toString()}</div>
      
      <button onClick={() => router.push('/dashboard/plants')} data-testid="nav-to-plants">
        Go to Plants
      </button>
      <button onClick={() => router.replace('/dashboard/care')} data-testid="nav-replace-care">
        Replace with Care
      </button>
      <button onClick={() => router.back()} data-testid="nav-back">
        Go Back
      </button>
      <button onClick={() => router.forward()} data-testid="nav-forward">
        Go Forward
      </button>
      <button onClick={() => router.refresh()} data-testid="nav-refresh">
        Refresh
      </button>
      
      <button 
        onClick={() => router.push(`/dashboard/plants?filter=${searchParams.get('filter') || 'all'}`)}
        data-testid="nav-with-params"
      >
        Navigate with Params
      </button>
    </div>
  );
};

describe('Page Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname.mockReturnValue('/dashboard');
    mockSearchParams.mockReturnValue('all');
  });

  describe('Router Navigation Methods', () => {
    it('navigates using router.push', async () => {
      const user = userEvent.setup();
      renderWithProviders(<NavigationTestComponent />);

      await user.click(screen.getByTestId('nav-to-plants'));

      expect(mockPush).toHaveBeenCalledWith('/dashboard/plants');
    });

    it('navigates using router.replace', async () => {
      const user = userEvent.setup();
      renderWithProviders(<NavigationTestComponent />);

      await user.click(screen.getByTestId('nav-replace-care'));

      expect(mockReplace).toHaveBeenCalledWith('/dashboard/care');
    });

    it('navigates back using router.back', async () => {
      const user = userEvent.setup();
      renderWithProviders(<NavigationTestComponent />);

      await user.click(screen.getByTestId('nav-back'));

      expect(mockBack).toHaveBeenCalled();
    });

    it('navigates forward using router.forward', async () => {
      const user = userEvent.setup();
      renderWithProviders(<NavigationTestComponent />);

      await user.click(screen.getByTestId('nav-forward'));

      expect(mockForward).toHaveBeenCalled();
    });

    it('refreshes page using router.refresh', async () => {
      const user = userEvent.setup();
      renderWithProviders(<NavigationTestComponent />);

      await user.click(screen.getByTestId('nav-refresh'));

      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('URL Parameters and Query Strings', () => {
    it('reads current pathname', () => {
      mockPathname.mockReturnValue('/dashboard/plants');
      renderWithProviders(<NavigationTestComponent />);

      expect(screen.getByTestId('current-path')).toHaveTextContent('/dashboard/plants');
    });

    it('reads search parameters', () => {
      renderWithProviders(<NavigationTestComponent />);

      expect(screen.getByTestId('search-params')).toHaveTextContent('param1=value1&param2=value2');
    });

    it('navigates with query parameters', async () => {
      const user = userEvent.setup();
      mockSearchParams.mockReturnValue('indoor');
      renderWithProviders(<NavigationTestComponent />);

      await user.click(screen.getByTestId('nav-with-params'));

      expect(mockPush).toHaveBeenCalledWith('/dashboard/plants?filter=indoor');
    });

    it('handles missing query parameters gracefully', async () => {
      const user = userEvent.setup();
      mockSearchParams.mockReturnValue(null);
      renderWithProviders(<NavigationTestComponent />);

      await user.click(screen.getByTestId('nav-with-params'));

      expect(mockPush).toHaveBeenCalledWith('/dashboard/plants?filter=all');
    });
  });

  describe('Navigation State Management', () => {
    it('updates pathname when navigation occurs', () => {
      mockPathname.mockReturnValue('/dashboard');
      const { rerender } = renderWithProviders(<NavigationTestComponent />);

      expect(screen.getByTestId('current-path')).toHaveTextContent('/dashboard');

      // Simulate navigation
      mockPathname.mockReturnValue('/dashboard/plants');
      rerender(<NavigationTestComponent />);

      expect(screen.getByTestId('current-path')).toHaveTextContent('/dashboard/plants');
    });

    it('maintains navigation state consistency', () => {
      mockPathname.mockReturnValue('/dashboard/care');
      renderWithProviders(<NavigationTestComponent />);

      // Multiple renders should maintain consistent state
      expect(screen.getByTestId('current-path')).toHaveTextContent('/dashboard/care');
    });

    it('handles rapid navigation changes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<NavigationTestComponent />);

      // Rapid navigation calls
      await user.click(screen.getByTestId('nav-to-plants'));
      await user.click(screen.getByTestId('nav-replace-care'));
      await user.click(screen.getByTestId('nav-back'));

      expect(mockPush).toHaveBeenCalledWith('/dashboard/plants');
      expect(mockReplace).toHaveBeenCalledWith('/dashboard/care');
      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('Route Protection Integration', () => {
    const ProtectedNavigationComponent = () => {
      const router = require('next/navigation').useRouter();
      const [isAuthenticated, setIsAuthenticated] = React.useState(true);

      const handleProtectedNavigation = (path) => {
        if (isAuthenticated) {
          router.push(path);
        } else {
          router.push('/auth/signin?redirect=' + encodeURIComponent(path));
        }
      };

      return (
        <div>
          <button onClick={() => setIsAuthenticated(!isAuthenticated)} data-testid="toggle-auth">
            Toggle Auth: {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
          </button>
          <button 
            onClick={() => handleProtectedNavigation('/dashboard/admin')}
            data-testid="nav-to-admin"
          >
            Go to Admin
          </button>
        </div>
      );
    };

    it('navigates to protected route when authenticated', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProtectedNavigationComponent />);

      await user.click(screen.getByTestId('nav-to-admin'));

      expect(mockPush).toHaveBeenCalledWith('/dashboard/admin');
    });

    it('redirects to sign-in when not authenticated', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProtectedNavigationComponent />);

      // Toggle authentication off
      await user.click(screen.getByTestId('toggle-auth'));
      expect(screen.getByText(/not authenticated/i)).toBeInTheDocument();

      // Try to navigate to protected route
      await user.click(screen.getByTestId('nav-to-admin'));

      expect(mockPush).toHaveBeenCalledWith('/auth/signin?redirect=%2Fdashboard%2Fadmin');
    });
  });

  describe('Navigation Error Handling', () => {
    const ErrorHandlingNavigationComponent = () => {
      const router = require('next/navigation').useRouter();
      const [error, setError] = React.useState(null);

      const handleNavigationWithError = async (path) => {
        try {
          // Simulate navigation that might fail
          if (path === '/invalid-route') {
            throw new Error('Invalid route');
          }
          router.push(path);
          setError(null);
        } catch (err) {
          setError(err.message);
        }
      };

      return (
        <div>
          {error && <div data-testid="navigation-error">{error}</div>}
          <button 
            onClick={() => handleNavigationWithError('/dashboard/plants')}
            data-testid="nav-valid"
          >
            Valid Navigation
          </button>
          <button 
            onClick={() => handleNavigationWithError('/invalid-route')}
            data-testid="nav-invalid"
          >
            Invalid Navigation
          </button>
        </div>
      );
    };

    it('handles successful navigation without errors', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ErrorHandlingNavigationComponent />);

      await user.click(screen.getByTestId('nav-valid'));

      expect(mockPush).toHaveBeenCalledWith('/dashboard/plants');
      expect(screen.queryByTestId('navigation-error')).not.toBeInTheDocument();
    });

    it('handles navigation errors gracefully', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ErrorHandlingNavigationComponent />);

      await user.click(screen.getByTestId('nav-invalid'));

      expect(screen.getByTestId('navigation-error')).toHaveTextContent('Invalid route');
      expect(mockPush).not.toHaveBeenCalledWith('/invalid-route');
    });
  });

  describe('Breadcrumb Navigation', () => {
    const BreadcrumbComponent = () => {
      const pathname = require('next/navigation').usePathname();
      const router = require('next/navigation').useRouter();

      const pathSegments = pathname.split('/').filter(Boolean);
      
      const breadcrumbs = pathSegments.map((segment, index) => {
        const path = '/' + pathSegments.slice(0, index + 1).join('/');
        const label = segment.charAt(0).toUpperCase() + segment.slice(1);
        
        return { path, label, isLast: index === pathSegments.length - 1 };
      });

      return (
        <nav data-testid="breadcrumb-nav" aria-label="Breadcrumb">
          <ol className="breadcrumb-list">
            <li>
              <button onClick={() => router.push('/')} data-testid="breadcrumb-home">
                Home
              </button>
            </li>
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.path}>
                {crumb.isLast ? (
                  <span data-testid={`breadcrumb-current-${index}`} aria-current="page">
                    {crumb.label}
                  </span>
                ) : (
                  <button 
                    onClick={() => router.push(crumb.path)}
                    data-testid={`breadcrumb-link-${index}`}
                  >
                    {crumb.label}
                  </button>
                )}
              </li>
            ))}
          </ol>
        </nav>
      );
    };

    it('renders breadcrumb navigation correctly', () => {
      mockPathname.mockReturnValue('/dashboard/plants/123');
      renderWithProviders(<BreadcrumbComponent />);

      expect(screen.getByTestId('breadcrumb-nav')).toBeInTheDocument();
      expect(screen.getByTestId('breadcrumb-home')).toBeInTheDocument();
      expect(screen.getByTestId('breadcrumb-link-0')).toHaveTextContent('Dashboard');
      expect(screen.getByTestId('breadcrumb-link-1')).toHaveTextContent('Plants');
      expect(screen.getByTestId('breadcrumb-current-2')).toHaveTextContent('123');
    });

    it('handles breadcrumb navigation clicks', async () => {
      const user = userEvent.setup();
      mockPathname.mockReturnValue('/dashboard/plants/123');
      renderWithProviders(<BreadcrumbComponent />);

      await user.click(screen.getByTestId('breadcrumb-home'));
      expect(mockPush).toHaveBeenCalledWith('/');

      await user.click(screen.getByTestId('breadcrumb-link-0'));
      expect(mockPush).toHaveBeenCalledWith('/dashboard');

      await user.click(screen.getByTestId('breadcrumb-link-1'));
      expect(mockPush).toHaveBeenCalledWith('/dashboard/plants');
    });

    it('marks current page correctly in breadcrumbs', () => {
      mockPathname.mockReturnValue('/dashboard/plants');
      renderWithProviders(<BreadcrumbComponent />);

      const currentPage = screen.getByTestId('breadcrumb-current-1');
      expect(currentPage).toHaveAttribute('aria-current', 'page');
      expect(currentPage).toHaveTextContent('Plants');
    });

    it('handles root path breadcrumbs', () => {
      mockPathname.mockReturnValue('/');
      renderWithProviders(<BreadcrumbComponent />);

      expect(screen.getByTestId('breadcrumb-home')).toBeInTheDocument();
      expect(screen.queryByTestId('breadcrumb-link-0')).not.toBeInTheDocument();
    });
  });

  describe('Navigation Accessibility', () => {
    const AccessibleNavigationComponent = () => {
      const router = require('next/navigation').useRouter();
      const [isNavigating, setIsNavigating] = React.useState(false);

      const handleAccessibleNavigation = async (path, label) => {
        setIsNavigating(true);
        
        // Announce navigation to screen readers
        const announcement = `Navigating to ${label}`;
        
        // Simulate navigation delay
        setTimeout(() => {
          router.push(path);
          setIsNavigating(false);
        }, 100);

        return announcement;
      };

      return (
        <div>
          <div 
            role="status" 
            aria-live="polite" 
            data-testid="navigation-status"
            className={isNavigating ? '' : 'sr-only'}
          >
            {isNavigating ? 'Navigating...' : ''}
          </div>
          
          <nav role="navigation" aria-label="Main navigation">
            <button 
              onClick={() => handleAccessibleNavigation('/dashboard/plants', 'Plants page')}
              data-testid="accessible-nav-plants"
              aria-describedby="plants-description"
            >
              Plants
            </button>
            <div id="plants-description" className="sr-only">
              View and manage your plant collection
            </div>
            
            <button 
              onClick={() => handleAccessibleNavigation('/dashboard/care', 'Care page')}
              data-testid="accessible-nav-care"
              disabled={isNavigating}
            >
              Care
            </button>
          </nav>
        </div>
      );
    };

    it('provides navigation status for screen readers', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AccessibleNavigationComponent />);

      await user.click(screen.getByTestId('accessible-nav-plants'));

      expect(screen.getByTestId('navigation-status')).toHaveTextContent('Navigating...');
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/plants');
      });
    });

    it('has proper ARIA labels and roles', () => {
      renderWithProviders(<AccessibleNavigationComponent />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Main navigation');

      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');

      const plantsButton = screen.getByTestId('accessible-nav-plants');
      expect(plantsButton).toHaveAttribute('aria-describedby', 'plants-description');
    });

    it('disables navigation during transitions', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AccessibleNavigationComponent />);

      await user.click(screen.getByTestId('accessible-nav-plants'));

      const careButton = screen.getByTestId('accessible-nav-care');
      expect(careButton).toBeDisabled();
    });
  });
});