/**
 * @jest-environment jsdom
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test-utils/helpers/render-helpers';
import AuthGuard from '@/components/auth/AuthGuard';

// Mock Next.js navigation
const mockRedirect = jest.fn();

jest.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

// Mock auth server functions
jest.mock('@/lib/auth/server', () => ({
  requireAuthSession: jest.fn(),
}));

// Import the mocked function
import { requireAuthSession } from '@/lib/auth/server';
const mockRequireAuthSession = requireAuthSession as jest.MockedFunction<typeof requireAuthSession>;

describe('AuthGuard', () => {
  const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Success', () => {
    beforeEach(() => {
      mockRequireAuthSession.mockResolvedValue({
        user: { id: 1, email: 'test@example.com' },
        session: { id: 'session-123' },
      });
    });

    it('renders children when user is authenticated', async () => {
      renderWithProviders(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(mockRequireAuthSession).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('passes through multiple children', async () => {
      renderWithProviders(
        <AuthGuard>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <TestComponent />
        </AuthGuard>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('preserves child component props and state', async () => {
      const ChildWithProps = ({ title, count }) => (
        <div data-testid="child-with-props">
          {title}: {count}
        </div>
      );

      renderWithProviders(
        <AuthGuard>
          <ChildWithProps title="Test" count={42} />
        </AuthGuard>
      );

      expect(screen.getByTestId('child-with-props')).toHaveTextContent('Test: 42');
    });
  });

  describe('Authentication Failure', () => {
    beforeEach(() => {
      mockRequireAuthSession.mockRejectedValue(new Error('Not authenticated'));
    });

    it('redirects to default sign-in page when authentication fails', async () => {
      renderWithProviders(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>
      );

      expect(mockRequireAuthSession).toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin');
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('redirects to custom redirect URL when provided', async () => {
      renderWithProviders(
        <AuthGuard redirectTo="/custom-login">
          <TestComponent />
        </AuthGuard>
      );

      expect(mockRedirect).toHaveBeenCalledWith('/custom-login');
    });

    it('handles different authentication error types', async () => {
      const errorTypes = [
        new Error('Session expired'),
        new Error('Invalid token'),
        new Error('User not found'),
        'String error',
        null,
        undefined,
      ];

      for (const error of errorTypes) {
        jest.clearAllMocks();
        mockRequireAuthSession.mockRejectedValue(error);

        renderWithProviders(
          <AuthGuard>
            <TestComponent />
          </AuthGuard>
        );

        expect(mockRedirect).toHaveBeenCalledWith('/auth/signin');
      }
    });
  });

  describe('Route Protection Scenarios', () => {
    it('protects admin routes', async () => {
      mockRequireAuthSession.mockRejectedValue(new Error('Insufficient permissions'));

      renderWithProviders(
        <AuthGuard redirectTo="/auth/signin?redirect=/admin">
          <div data-testid="admin-panel">Admin Panel</div>
        </AuthGuard>
      );

      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin?redirect=/admin');
      expect(screen.queryByTestId('admin-panel')).not.toBeInTheDocument();
    });

    it('protects user dashboard', async () => {
      mockRequireAuthSession.mockRejectedValue(new Error('Not authenticated'));

      renderWithProviders(
        <AuthGuard>
          <div data-testid="user-dashboard">User Dashboard</div>
        </AuthGuard>
      );

      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin');
      expect(screen.queryByTestId('user-dashboard')).not.toBeInTheDocument();
    });

    it('protects API-dependent components', async () => {
      mockRequireAuthSession.mockRejectedValue(new Error('Token invalid'));

      const ApiComponent = () => (
        <div data-testid="api-component">
          Component that requires API access
        </div>
      );

      renderWithProviders(
        <AuthGuard>
          <ApiComponent />
        </AuthGuard>
      );

      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin');
      expect(screen.queryByTestId('api-component')).not.toBeInTheDocument();
    });
  });

  describe('Session Validation', () => {
    it('validates session on each render', async () => {
      mockRequireAuthSession.mockResolvedValue({
        user: { id: 1, email: 'test@example.com' },
        session: { id: 'session-123' },
      });

      const { rerender } = renderWithProviders(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>
      );

      expect(mockRequireAuthSession).toHaveBeenCalledTimes(1);

      // Re-render should trigger validation again
      rerender(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>
      );

      expect(mockRequireAuthSession).toHaveBeenCalledTimes(2);
    });

    it('handles session expiration during component lifecycle', async () => {
      // Initially authenticated
      mockRequireAuthSession.mockResolvedValue({
        user: { id: 1, email: 'test@example.com' },
        session: { id: 'session-123' },
      });

      const { rerender } = renderWithProviders(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();

      // Session expires
      mockRequireAuthSession.mockRejectedValue(new Error('Session expired'));

      rerender(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>
      );

      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin');
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      mockRequireAuthSession.mockRejectedValue(new Error('Network error'));

      renderWithProviders(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>
      );

      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin');
    });

    it('handles server errors gracefully', async () => {
      mockRequireAuthSession.mockRejectedValue(new Error('Internal server error'));

      renderWithProviders(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>
      );

      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin');
    });

    it('handles malformed responses gracefully', async () => {
      mockRequireAuthSession.mockRejectedValue(new Error('Invalid response format'));

      renderWithProviders(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>
      );

      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin');
    });
  });

  describe('Integration with Authentication Flow', () => {
    it('works with sign-in redirect flow', async () => {
      mockRequireAuthSession.mockRejectedValue(new Error('Not authenticated'));

      renderWithProviders(
        <AuthGuard redirectTo="/auth/signin?redirect=/dashboard/plants">
          <div data-testid="plants-page">Plants Page</div>
        </AuthGuard>
      );

      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin?redirect=/dashboard/plants');
    });

    it('preserves query parameters in redirect', async () => {
      mockRequireAuthSession.mockRejectedValue(new Error('Not authenticated'));

      renderWithProviders(
        <AuthGuard redirectTo="/auth/signin?redirect=/dashboard/care&tab=overdue">
          <div data-testid="care-page">Care Page</div>
        </AuthGuard>
      );

      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin?redirect=/dashboard/care&tab=overdue');
    });

    it('handles successful authentication after redirect', async () => {
      // Simulate successful authentication after redirect
      mockRequireAuthSession.mockResolvedValue({
        user: { id: 1, email: 'test@example.com' },
        session: { id: 'session-123' },
      });

      renderWithProviders(
        <AuthGuard>
          <div data-testid="protected-page">Protected Page</div>
        </AuthGuard>
      );

      expect(screen.getByTestId('protected-page')).toBeInTheDocument();
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe('Performance Considerations', () => {
    it('does not cause unnecessary re-renders', async () => {
      mockRequireAuthSession.mockResolvedValue({
        user: { id: 1, email: 'test@example.com' },
        session: { id: 'session-123' },
      });

      let renderCount = 0;
      const CountingComponent = () => {
        renderCount++;
        return <div data-testid="counting-component">Render count: {renderCount}</div>;
      };

      renderWithProviders(
        <AuthGuard>
          <CountingComponent />
        </AuthGuard>
      );

      expect(screen.getByTestId('counting-component')).toHaveTextContent('Render count: 1');
    });

    it('handles rapid authentication state changes', async () => {
      // Simulate rapid state changes
      mockRequireAuthSession
        .mockResolvedValueOnce({
          user: { id: 1, email: 'test@example.com' },
          session: { id: 'session-123' },
        })
        .mockRejectedValueOnce(new Error('Session expired'))
        .mockResolvedValueOnce({
          user: { id: 1, email: 'test@example.com' },
          session: { id: 'session-456' },
        });

      const { rerender } = renderWithProviders(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>
      );

      // First render - authenticated
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();

      // Second render - session expired
      rerender(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>
      );

      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin');

      // Third render - re-authenticated
      jest.clearAllMocks();
      rerender(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('Component Composition', () => {
    it('works with nested components', async () => {
      mockRequireAuthSession.mockResolvedValue({
        user: { id: 1, email: 'test@example.com' },
        session: { id: 'session-123' },
      });

      const NestedComponent = ({ children }) => (
        <div data-testid="nested-wrapper">
          <header>Header</header>
          {children}
          <footer>Footer</footer>
        </div>
      );

      renderWithProviders(
        <AuthGuard>
          <NestedComponent>
            <TestComponent />
          </NestedComponent>
        </AuthGuard>
      );

      expect(screen.getByTestId('nested-wrapper')).toBeInTheDocument();
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });

    it('works with conditional rendering', async () => {
      mockRequireAuthSession.mockResolvedValue({
        user: { id: 1, email: 'test@example.com' },
        session: { id: 'session-123' },
      });

      const ConditionalComponent = ({ showContent }) => (
        <div>
          {showContent && <TestComponent />}
          <div data-testid="always-visible">Always visible</div>
        </div>
      );

      renderWithProviders(
        <AuthGuard>
          <ConditionalComponent showContent={true} />
        </AuthGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.getByTestId('always-visible')).toBeInTheDocument();
    });

    it('works with React fragments', async () => {
      mockRequireAuthSession.mockResolvedValue({
        user: { id: 1, email: 'test@example.com' },
        session: { id: 'session-123' },
      });

      renderWithProviders(
        <AuthGuard>
          <>
            <div data-testid="fragment-child-1">Fragment Child 1</div>
            <TestComponent />
            <div data-testid="fragment-child-2">Fragment Child 2</div>
          </>
        </AuthGuard>
      );

      expect(screen.getByTestId('fragment-child-1')).toBeInTheDocument();
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.getByTestId('fragment-child-2')).toBeInTheDocument();
    });
  });
});