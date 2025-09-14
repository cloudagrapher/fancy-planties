// Test for render helpers functionality

import React from 'react';
import { screen } from '@testing-library/react';
import {
  renderWithProviders,
  renderWithAuthenticatedUser,
  renderWithCuratorUser,
  mockApiResponses,
  userInteractions,
  testUtils,
  resetTestState,
  createTestFile,
  setupTestEnvironment,
} from '../render-helpers';

// Simple test component
const TestComponent: React.FC<{ title?: string }> = ({ title = 'Test Component' }) => {
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={() => console.log('clicked')}>Click me</button>
    </div>
  );
};

// Component that uses authentication context
const AuthTestComponent: React.FC = () => {
  return (
    <div>
      <h1>Auth Test</h1>
      <p>This component uses auth context</p>
    </div>
  );
};

describe('Render Helpers', () => {
  beforeEach(() => {
    resetTestState();
  });

  describe('renderWithProviders', () => {
    it('should render component with all providers', () => {
      const result = renderWithProviders(<TestComponent />);
      
      expect(screen.getByText('Test Component')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
      
      // Should return enhanced result with utilities
      expect(result.user).toBeDefined();
      expect(result.queryClient).toBeDefined();
      expect(result.router).toBeDefined();
    });

    it('should handle custom route configuration', () => {
      const result = renderWithProviders(<TestComponent />, {
        route: '/dashboard',
      });
      
      expect(result.router.pathname).toBe('/dashboard');
      expect(result.router.asPath).toBe('/dashboard');
    });

    it('should handle custom router mock overrides', () => {
      const customPush = jest.fn();
      const result = renderWithProviders(<TestComponent />, {
        routerMock: { push: customPush },
      });
      
      expect(result.router.push).toBe(customPush);
    });
  });

  describe('renderWithAuthenticatedUser', () => {
    it('should render component with authenticated user context', () => {
      const result = renderWithAuthenticatedUser(<AuthTestComponent />);
      
      expect(screen.getByText('Auth Test')).toBeInTheDocument();
      expect(result.testUser).toBeDefined();
      expect(result.testSession).toBeDefined();
    });

    it('should handle user overrides', () => {
      const result = renderWithAuthenticatedUser(<AuthTestComponent />, {
        userOverrides: { name: 'Custom Test User' },
      });
      
      expect(result.testUser.name).toBe('Custom Test User');
    });
  });

  describe('renderWithCuratorUser', () => {
    it('should render component with curator user context', () => {
      const result = renderWithCuratorUser(<AuthTestComponent />);
      
      expect(screen.getByText('Auth Test')).toBeInTheDocument();
      expect(result.testUser.isCurator).toBe(true);
    });
  });

  describe('API mocking', () => {
    it('should mock API responses correctly', () => {
      mockApiResponses({
        '/api/test': { message: 'success' },
        '/api/error': { ok: false, status: 400, data: { error: 'Bad request' } },
      });

      // Test successful response
      expect(global.fetch).toBeDefined();
      
      // Call the mocked fetch
      global.fetch('/api/test').then(response => response.json()).then(data => {
        expect(data.message).toBe('success');
      });
    });
  });

  describe('userInteractions', () => {
    it('should provide navigation utilities', () => {
      const result = renderWithProviders(<TestComponent />);
      
      userInteractions.navigate('/new-path');
      expect(result.router.pathname).toBe('/new-path');
      expect(result.router.push).toHaveBeenCalledWith('/new-path');
    });

    it('should handle form filling', async () => {
      const FormComponent = () => (
        <form>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" />
        </form>
      );

      const result = renderWithProviders(<FormComponent />);
      
      await userInteractions.fillForm(
        { email: 'test@example.com', password: 'password123' },
        result.user
      );

      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('password123')).toBeInTheDocument();
    });
  });

  describe('testUtils', () => {
    it('should provide assertion utilities', () => {
      renderWithProviders(<TestComponent title="Custom Title" />);
      
      testUtils.expectTextToBeInDocument('Custom Title');
      testUtils.expectTextNotToBeInDocument('Non-existent text');
    });

    it('should handle field value assertions', () => {
      const FormComponent = () => (
        <form>
          <label htmlFor="name">Name</label>
          <input id="name" defaultValue="John Doe" />
        </form>
      );

      renderWithProviders(<FormComponent />);
      testUtils.expectFieldValue('name', 'John Doe');
    });
  });

  describe('utility functions', () => {
    it('should create test files correctly', () => {
      const file = createTestFile('test.txt', 'test content', 'text/plain');
      
      expect(file.name).toBe('test.txt');
      expect(file.type).toBe('text/plain');
    });

    it('should setup test environment correctly', () => {
      const env = setupTestEnvironment({
        route: '/dashboard',
        mockApis: {
          '/api/test': { success: true },
        },
      });

      expect(env.queryClient).toBeDefined();
      expect(env.user).toBeDefined();
      expect(env.router).toBeDefined();
      expect(env.router.pathname).toBe('/dashboard');
      expect(global.fetch).toBeDefined();
    });
  });

  describe('provider mocking', () => {
    it('should handle custom query client', () => {
      const customQueryClient = setupTestEnvironment().queryClient;
      const result = renderWithProviders(<TestComponent />, {
        queryClient: customQueryClient,
      });

      expect(result.queryClient).toBe(customQueryClient);
    });
  });
});