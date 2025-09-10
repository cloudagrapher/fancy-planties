// Component render test helpers

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from '@/components/auth/UserProvider';
import { createTestUser, createAuthenticatedTestUser } from '../factories/user-factory';

// Mock Next.js router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
  pathname: '/',
  route: '/',
  query: {},
  asPath: '/',
  basePath: '',
  isLocaleDomain: true,
  isReady: true,
  isPreview: false,
};

// Mock useRouter hook
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

/**
 * Creates a test QueryClient with optimized settings for testing
 * @returns {QueryClient} Configured QueryClient for testing
 */
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
};

/**
 * Wrapper component that provides all necessary providers for testing
 * @param {Object} props - Wrapper props
 * @param {React.ReactNode} props.children - Child components
 * @param {Object} props.user - User object for UserProvider
 * @param {QueryClient} props.queryClient - QueryClient instance
 * @returns {JSX.Element} Wrapped component
 */
export const TestProviders = ({ 
  children, 
  user = null, 
  queryClient = createTestQueryClient() 
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider user={user}>
        {children}
      </UserProvider>
    </QueryClientProvider>
  );
};

/**
 * Enhanced render function with all providers and utilities
 * @param {React.ReactElement} ui - Component to render
 * @param {Object} options - Render options
 * @param {Object} options.user - User object for authentication context
 * @param {QueryClient} options.queryClient - Custom QueryClient
 * @param {string} options.route - Initial route for router mock
 * @param {Object} options.routerMock - Custom router mock overrides
 * @param {Object} options.renderOptions - Additional render options
 * @returns {Object} Render result with additional utilities
 */
export const renderWithProviders = (ui, options = {}) => {
  const {
    user = null,
    queryClient = createTestQueryClient(),
    route = '/',
    routerMock = {},
    ...renderOptions
  } = options;

  // Update router mock with custom values
  Object.assign(mockRouter, {
    pathname: route,
    asPath: route,
    route: route,
    ...routerMock,
  });

  // Create wrapper with providers
  const Wrapper = ({ children }) => (
    <TestProviders user={user} queryClient={queryClient}>
      {children}
    </TestProviders>
  );

  // Render component
  const renderResult = render(ui, { wrapper: Wrapper, ...renderOptions });

  // Return enhanced result with utilities
  return {
    ...renderResult,
    user: userEvent.setup(),
    queryClient,
    router: mockRouter,
  };
};

/**
 * Render component with authenticated user context
 * @param {React.ReactElement} ui - Component to render
 * @param {Object} options - Render options
 * @param {Object} options.userOverrides - User object overrides
 * @param {Object} options.sessionOverrides - Session object overrides
 * @returns {Object} Render result with user and session data
 */
export const renderWithAuthenticatedUser = (ui, options = {}) => {
  const { userOverrides = {}, sessionOverrides = {}, ...renderOptions } = options;
  
  const { user, session } = createAuthenticatedTestUser(userOverrides, sessionOverrides);
  
  const result = renderWithProviders(ui, {
    user,
    ...renderOptions,
  });

  return {
    ...result,
    testUser: user,
    testSession: session,
  };
};

/**
 * Render component with curator/admin user context
 * @param {React.ReactElement} ui - Component to render
 * @param {Object} options - Render options
 * @returns {Object} Render result with curator user data
 */
export const renderWithCuratorUser = (ui, options = {}) => {
  return renderWithAuthenticatedUser(ui, {
    userOverrides: { isCurator: true },
    ...options,
  });
};

/**
 * Render component and wait for loading states to complete
 * @param {React.ReactElement} ui - Component to render
 * @param {Object} options - Render options
 * @returns {Object} Render result after loading completion
 */
export const renderAndWaitForLoading = async (ui, options = {}) => {
  const result = renderWithProviders(ui, options);
  
  // Wait for any loading indicators to disappear
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  }, { timeout: 5000 });
  
  return result;
};

/**
 * Mock API responses for testing
 * @param {Object} responses - Object mapping endpoints to response data
 */
export const mockApiResponses = (responses) => {
  global.fetch = jest.fn((url) => {
    const endpoint = url.toString();
    
    for (const [pattern, response] of Object.entries(responses)) {
      if (endpoint.includes(pattern)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(response),
          text: () => Promise.resolve(JSON.stringify(response)),
        });
      }
    }
    
    // Default response for unmatched endpoints
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found' }),
    });
  });
};

/**
 * Mock API error responses for testing error handling
 * @param {string} endpoint - Endpoint pattern to mock
 * @param {number} status - HTTP status code
 * @param {Object} error - Error response data
 */
export const mockApiError = (endpoint, status = 500, error = { error: 'Internal server error' }) => {
  global.fetch = jest.fn((url) => {
    if (url.toString().includes(endpoint)) {
      return Promise.resolve({
        ok: false,
        status,
        json: () => Promise.resolve(error),
        text: () => Promise.resolve(JSON.stringify(error)),
      });
    }
    
    // Call original fetch for other endpoints
    return jest.requireActual('node-fetch')(url);
  });
};

/**
 * Wait for element to appear with custom timeout
 * @param {Function} query - Query function (e.g., () => screen.getByText('text'))
 * @param {Object} options - Wait options
 * @returns {Promise} Promise that resolves when element appears
 */
export const waitForElement = async (query, options = {}) => {
  const { timeout = 5000, interval = 50 } = options;
  
  return waitFor(query, { timeout, interval });
};

/**
 * Simulate user interactions with common patterns
 */
export const userInteractions = {
  /**
   * Fill out a form with provided data
   * @param {Object} formData - Object with field names and values
   * @param {Object} user - userEvent instance
   */
  fillForm: async (formData, user) => {
    for (const [fieldName, value] of Object.entries(formData)) {
      const field = screen.getByLabelText(new RegExp(fieldName, 'i')) || 
                   screen.getByPlaceholderText(new RegExp(fieldName, 'i')) ||
                   screen.getByRole('textbox', { name: new RegExp(fieldName, 'i') });
      
      if (field) {
        await user.clear(field);
        await user.type(field, value);
      }
    }
  },

  /**
   * Submit a form by clicking submit button
   * @param {Object} user - userEvent instance
   * @param {string} buttonText - Submit button text (default: 'submit')
   */
  submitForm: async (user, buttonText = 'submit') => {
    const submitButton = screen.getByRole('button', { name: new RegExp(buttonText, 'i') });
    await user.click(submitButton);
  },

  /**
   * Navigate using router mock
   * @param {string} path - Path to navigate to
   */
  navigate: (path) => {
    mockRouter.push(path);
  },

  /**
   * Select option from dropdown/select
   * @param {string} selectLabel - Label of the select element
   * @param {string} optionText - Text of the option to select
   * @param {Object} user - userEvent instance
   */
  selectOption: async (selectLabel, optionText, user) => {
    const select = screen.getByLabelText(new RegExp(selectLabel, 'i'));
    await user.selectOptions(select, optionText);
  },

  /**
   * Upload file to file input
   * @param {string} inputLabel - Label of the file input
   * @param {File} file - File object to upload
   * @param {Object} user - userEvent instance
   */
  uploadFile: async (inputLabel, file, user) => {
    const fileInput = screen.getByLabelText(new RegExp(inputLabel, 'i'));
    await user.upload(fileInput, file);
  },
};

/**
 * Common test utilities for assertions
 */
export const testUtils = {
  /**
   * Assert that an element has specific text content
   * @param {string} text - Text to search for
   * @param {Object} options - Query options
   */
  expectTextToBeInDocument: (text, options = {}) => {
    expect(screen.getByText(text, options)).toBeInTheDocument();
  },

  /**
   * Assert that an element is not in the document
   * @param {string} text - Text to search for
   */
  expectTextNotToBeInDocument: (text) => {
    expect(screen.queryByText(text)).not.toBeInTheDocument();
  },

  /**
   * Assert that a form field has specific value
   * @param {string} fieldName - Field label or placeholder
   * @param {string} expectedValue - Expected field value
   */
  expectFieldValue: (fieldName, expectedValue) => {
    const field = screen.getByLabelText(new RegExp(fieldName, 'i')) || 
                 screen.getByPlaceholderText(new RegExp(fieldName, 'i'));
    expect(field).toHaveValue(expectedValue);
  },

  /**
   * Assert that an API call was made with specific parameters
   * @param {string} endpoint - Endpoint pattern
   * @param {Object} expectedData - Expected request data
   */
  expectApiCall: (endpoint, expectedData = null) => {
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(endpoint),
      expectedData ? expect.objectContaining({
        body: JSON.stringify(expectedData)
      }) : expect.any(Object)
    );
  },
};

/**
 * Reset all mocks and test state
 */
export const resetTestState = () => {
  jest.clearAllMocks();
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  
  // Reset fetch mock
  if (global.fetch && global.fetch.mockRestore) {
    global.fetch.mockRestore();
  }
};