import { requireAuthSession } from '@/lib/auth/server';
import { render } from '@testing-library/react';
import { redirect } from 'next/navigation';
import React from 'react';
import AuthGuard from '../AuthGuard';

// Mock the auth server functions
jest.mock('@/lib/auth/server', () => ({
  requireAuthSession: jest.fn(),
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

const mockRequireAuthSession = requireAuthSession as jest.MockedFunction<typeof requireAuthSession>;
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;

describe('AuthGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Route Protection', () => {
    it('should render children when user is authenticated', async () => {
      // Mock successful authentication
      mockRequireAuthSession.mockResolvedValue({
        user: { id: 1, email: 'test@example.com' } as any,
        session: { id: 'session-1' } as any,
      });

      const TestComponent = () => <div>Protected Content</div>;
      
      // Since AuthGuard is an async server component, we need to await it
      const AuthGuardWithChildren = await AuthGuard({ children: <TestComponent /> });
      
      const { container } = render(AuthGuardWithChildren as React.ReactElement);
      
      expect(container.textContent).toBe('Protected Content');
      expect(mockRequireAuthSession).toHaveBeenCalledTimes(1);
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('should redirect to default signin page when authentication fails', async () => {
      // Mock authentication failure
      mockRequireAuthSession.mockRejectedValue(new Error('Unauthorized'));

      const TestComponent = () => <div>Protected Content</div>;
      
      try {
        await AuthGuard({ children: <TestComponent /> });
      } catch (error) {
        // The redirect function throws to stop execution
      }

      expect(mockRequireAuthSession).toHaveBeenCalledTimes(1);
      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin');
    });

    it('should redirect to custom redirect path when specified', async () => {
      // Mock authentication failure
      mockRequireAuthSession.mockRejectedValue(new Error('Unauthorized'));

      const TestComponent = () => <div>Protected Content</div>;
      
      try {
        await AuthGuard({ 
          children: <TestComponent />, 
          redirectTo: '/custom-login' 
        });
      } catch (error) {
        // The redirect function throws to stop execution
      }

      expect(mockRequireAuthSession).toHaveBeenCalledTimes(1);
      expect(mockRedirect).toHaveBeenCalledWith('/custom-login');
    });

    it('should handle different authentication error types', async () => {
      // Mock different types of authentication failures
      const errorTypes = [
        new Error('Session expired'),
        new Error('Invalid token'),
        new Error('User not found'),
      ];

      for (const error of errorTypes) {
        jest.clearAllMocks();
        mockRequireAuthSession.mockRejectedValue(error);

        const TestComponent = () => <div>Protected Content</div>;
        
        try {
          await AuthGuard({ children: <TestComponent /> });
        } catch (redirectError) {
          // The redirect function throws to stop execution
        }

        expect(mockRequireAuthSession).toHaveBeenCalledTimes(1);
        expect(mockRedirect).toHaveBeenCalledWith('/auth/signin');
      }
    });
  });

  describe('Props Handling', () => {
    it('should use default redirectTo when not provided', async () => {
      mockRequireAuthSession.mockRejectedValue(new Error('Unauthorized'));

      const TestComponent = () => <div>Protected Content</div>;
      
      try {
        await AuthGuard({ children: <TestComponent /> });
      } catch (error) {
        // The redirect function throws to stop execution
      }

      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin');
    });

    it('should pass through complex children components', async () => {
      mockRequireAuthSession.mockResolvedValue({
        user: { id: 1, email: 'test@example.com' } as any,
        session: { id: 'session-1' } as any,
      });

      const ComplexComponent = () => (
        <div>
          <h1>Dashboard</h1>
          <nav>Navigation</nav>
          <main>Main Content</main>
        </div>
      );
      
      const AuthGuardWithChildren = await AuthGuard({ children: <ComplexComponent /> });
      const { container } = render(AuthGuardWithChildren as React.ReactElement);
      
      expect(container.querySelector('h1')).toHaveTextContent('Dashboard');
      expect(container.querySelector('nav')).toHaveTextContent('Navigation');
      expect(container.querySelector('main')).toHaveTextContent('Main Content');
    });

    it('should handle multiple children elements', async () => {
      mockRequireAuthSession.mockResolvedValue({
        user: { id: 1, email: 'test@example.com' } as any,
        session: { id: 'session-1' } as any,
      });

      const children = (
        <>
          <div>First Child</div>
          <div>Second Child</div>
          <div>Third Child</div>
        </>
      );
      
      const AuthGuardWithChildren = await AuthGuard({ children });
      const { container } = render(AuthGuardWithChildren as React.ReactElement);
      
      expect(container.textContent).toContain('First Child');
      expect(container.textContent).toContain('Second Child');
      expect(container.textContent).toContain('Third Child');
    });
  });

  describe('Integration Scenarios', () => {
    it('should work with nested AuthGuards', async () => {
      mockRequireAuthSession.mockResolvedValue({
        user: { id: 1, email: 'test@example.com' } as any,
        session: { id: 'session-1' } as any,
      });

      const InnerComponent = () => <div>Deeply Protected Content</div>;
      
      const OuterAuthGuard = await AuthGuard({
        children: await AuthGuard({
          children: <InnerComponent />,
          redirectTo: '/inner-login'
        })
      });
      
      const { container } = render(OuterAuthGuard as React.ReactElement);
      
      expect(container.textContent).toBe('Deeply Protected Content');
      expect(mockRequireAuthSession).toHaveBeenCalledTimes(2);
    });

    it('should handle authentication check timing', async () => {
      // Simulate slow authentication check
      mockRequireAuthSession.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            user: { id: 1, email: 'test@example.com' } as any,
            session: { id: 'session-1' } as any,
          }), 100)
        )
      );

      const TestComponent = () => <div>Protected Content</div>;
      
      const startTime = Date.now();
      const AuthGuardWithChildren = await AuthGuard({ children: <TestComponent /> });
      const endTime = Date.now();
      
      const { container } = render(AuthGuardWithChildren as React.ReactElement);
      
      expect(container.textContent).toBe('Protected Content');
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle requireAuthSession throwing non-Error objects', async () => {
      // Mock throwing a non-Error object
      mockRequireAuthSession.mockRejectedValue('String error');

      const TestComponent = () => <div>Protected Content</div>;
      
      try {
        await AuthGuard({ children: <TestComponent /> });
      } catch (error) {
        // The redirect function throws to stop execution
      }

      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin');
    });

    it('should handle requireAuthSession throwing null/undefined', async () => {
      // Mock throwing null
      mockRequireAuthSession.mockRejectedValue(null);

      const TestComponent = () => <div>Protected Content</div>;
      
      try {
        await AuthGuard({ children: <TestComponent /> });
      } catch (error) {
        // The redirect function throws to stop execution
      }

      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin');
    });

    it('should handle redirect function errors', async () => {
      mockRequireAuthSession.mockRejectedValue(new Error('Unauthorized'));
      mockRedirect.mockImplementation(() => {
        throw new Error('Redirect failed');
      });

      const TestComponent = () => <div>Protected Content</div>;
      
      await expect(AuthGuard({ children: <TestComponent /> })).rejects.toThrow('Redirect failed');
    });
  });

  describe('TypeScript Interface Compliance', () => {
    it('should accept valid AuthGuardProps', async () => {
      mockRequireAuthSession.mockResolvedValue({
        user: { id: 1, email: 'test@example.com' } as any,
        session: { id: 'session-1' } as any,
      });

      // Test with all props
      const propsWithRedirect = {
        children: <div>Test</div>,
        redirectTo: '/custom-path'
      };

      const AuthGuardWithAllProps = await AuthGuard(propsWithRedirect);
      expect(AuthGuardWithAllProps).toBeDefined();

      // Test with minimal props
      const minimalProps = {
        children: <div>Test</div>
      };

      const AuthGuardWithMinimalProps = await AuthGuard(minimalProps);
      expect(AuthGuardWithMinimalProps).toBeDefined();
    });

    it('should handle React.ReactNode children types', async () => {
      mockRequireAuthSession.mockResolvedValue({
        user: { id: 1, email: 'test@example.com' } as any,
        session: { id: 'session-1' } as any,
      });

      // Test different ReactNode types
      const nodeTypes = [
        <div>Element</div>,
        'String child',
        123,
        null,
        undefined,
        [<div key="1">Array</div>, <div key="2">Children</div>],
      ];

      for (const child of nodeTypes) {
        const AuthGuardWithChild = await AuthGuard({ children: child });
        expect(AuthGuardWithChild).toBeDefined();
      }
    });
  });
});