// Component render test helpers

import React from 'react';
import { render, screen, waitFor, RenderOptions, RenderResult } from '@testing-library/react';
import userEvent, { UserEvent } from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from '@/components/auth/UserProvider';
import { createTestUser, createAuthenticatedTestUser } from '../factories/user-factory';
import type { User } from '@/lib/auth/client';

// Enhanced router mock with better type safety
interface MockRouter {
  push: jest.MockedFunction<(url: string) => void>;
  replace: jest.MockedFunction<(url: string) => void>;
  back: jest.MockedFunction<() => void>;
  forward: jest.MockedFunction<() => void>;
  refresh: jest.MockedFunction<() => void>;
  prefetch: jest.MockedFunction<(url: string) => void>;
  pathname: string;
  route: string;
  query: Record<string, string | string[]>;
  asPath: string;
  basePath: string;
  isLocaleDomain: boolean;
  isReady: boolean;
  isPreview: boolean;
}

const mockRouter: MockRouter = {
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

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockRouter.pathname,
  useSearchParams: () => new URLSearchParams(),
  notFound: jest.fn(),
  redirect: jest.fn(),
}));

// Provider configuration interfaces
interface TestProvidersProps {
  children: React.ReactNode;
  user?: User | null;
  queryClient?: QueryClient;
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: User | null;
  queryClient?: QueryClient;
  route?: string;
  routerMock?: Partial<MockRouter>;
  initialEntries?: string[];
}

interface EnhancedRenderResult extends RenderResult {
  user: UserEvent;
  queryClient: QueryClient;
  router: MockRouter;
}

/**
 * Creates a test QueryClient with optimized settings for testing
 * @returns Configured QueryClient for testing
 */
export const createTestQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
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
 * @param props - Wrapper props
 * @returns Wrapped component with all providers
 */
export const TestProviders: React.FC<TestProvidersProps> = ({ 
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
 * @param ui - Component to render
 * @param options - Render options
 * @returns Render result with additional utilities
 */
export const renderWithProviders = (
  ui: React.ReactElement,
  options: RenderWithProvidersOptions = {}
): EnhancedRenderResult => {
  const {
    user = null,
    queryClient = createTestQueryClient(),
    route = '/',
    routerMock = {},
    initialEntries = ['/'],
    ...renderOptions
  } = options;

  // Reset router mock to default state
  Object.assign(mockRouter, {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
    pathname: route,
    route: route,
    asPath: route,
    query: {},
    basePath: '',
    isLocaleDomain: true,
    isReady: true,
    isPreview: false,
    ...routerMock,
  });

  // Create wrapper with providers
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
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

// Authentication-specific render options
interface AuthenticatedRenderOptions extends RenderWithProvidersOptions {
  userOverrides?: Partial<User>;
  sessionOverrides?: any;
}

interface AuthenticatedRenderResult extends EnhancedRenderResult {
  testUser: User;
  testSession: any;
}

/**
 * Render component with authenticated user context
 * @param ui - Component to render
 * @param options - Render options
 * @returns Render result with user and session data
 */
export const renderWithAuthenticatedUser = (
  ui: React.ReactElement,
  options: AuthenticatedRenderOptions = {}
): AuthenticatedRenderResult => {
  const { userOverrides = {}, sessionOverrides = {}, ...renderOptions } = options;
  
  const { user, session } = createAuthenticatedTestUser(userOverrides, sessionOverrides);
  
  const result = renderWithProviders(ui, {
    user: user as User,
    ...renderOptions,
  });

  return {
    ...result,
    testUser: user as User,
    testSession: session,
  };
};

/**
 * Render component with curator/admin user context
 * @param ui - Component to render
 * @param options - Render options
 * @returns Render result with curator user data
 */
export const renderWithCuratorUser = (
  ui: React.ReactElement,
  options: AuthenticatedRenderOptions = {}
): AuthenticatedRenderResult => {
  return renderWithAuthenticatedUser(ui, {
    userOverrides: { isCurator: true },
    ...options,
  });
};

/**
 * Render component with unverified user context
 * @param ui - Component to render
 * @param options - Render options
 * @returns Render result with unverified user data
 */
export const renderWithUnverifiedUser = (
  ui: React.ReactElement,
  options: AuthenticatedRenderOptions = {}
): AuthenticatedRenderResult => {
  return renderWithAuthenticatedUser(ui, {
    userOverrides: { isEmailVerified: false },
    ...options,
  });
};

/**
 * Render component and wait for loading states to complete
 * @param ui - Component to render
 * @param options - Render options
 * @returns Render result after loading completion
 */
export const renderAndWaitForLoading = async (
  ui: React.ReactElement,
  options: RenderWithProvidersOptions = {}
): Promise<EnhancedRenderResult> => {
  const result = renderWithProviders(ui, options);
  
  // Wait for any loading indicators to disappear
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  }, { timeout: 5000 });
  
  return result;
};

// API mocking interfaces
interface MockResponse {
  ok?: boolean;
  status?: number;
  data?: any;
  headers?: Record<string, string>;
}

interface ApiMockConfig {
  [endpoint: string]: MockResponse | any;
}

/**
 * Mock API responses for testing
 * @param responses - Object mapping endpoints to response data
 */
export const mockApiResponses = (responses: ApiMockConfig): void => {
  global.fetch = jest.fn((url: string | URL, options?: RequestInit) => {
    const endpoint = url.toString();

    for (const [pattern, response] of Object.entries(responses)) {
      if (endpoint.includes(pattern)) {
        const mockResponse = typeof response === 'object' && 'status' in response 
          ? response 
          : { ok: true, status: 200, data: response };

        return Promise.resolve({
          ok: mockResponse.ok ?? true,
          status: mockResponse.status ?? 200,
          headers: new Headers(mockResponse.headers || {}),
          json: () => Promise.resolve(mockResponse.data || response),
          text: () => Promise.resolve(JSON.stringify(mockResponse.data || response)),
          blob: () => Promise.resolve(new Blob([JSON.stringify(mockResponse.data || response)])),
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        } as Response);
      }
    }

    // Default response for unmatched endpoints
    return Promise.resolve({
      ok: false,
      status: 404,
      headers: new Headers(),
      json: () => Promise.resolve({ error: 'Not found' }),
      text: () => Promise.resolve(JSON.stringify({ error: 'Not found' })),
      blob: () => Promise.resolve(new Blob([JSON.stringify({ error: 'Not found' })])),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    } as Response);
  }) as jest.MockedFunction<typeof fetch>;
};

/**
 * Mock API error responses for testing error handling
 * @param endpoint - Endpoint pattern to mock
 * @param status - HTTP status code
 * @param error - Error response data
 */
export const mockApiError = (
  endpoint: string, 
  status = 500, 
  error: any = { error: 'Internal server error' }
): void => {
  global.fetch = jest.fn((url: string | URL, options?: RequestInit) => {
    if (url.toString().includes(endpoint)) {
      return Promise.resolve({
        ok: false,
        status,
        headers: new Headers(),
        json: () => Promise.resolve(error),
        text: () => Promise.resolve(JSON.stringify(error)),
        blob: () => Promise.resolve(new Blob([JSON.stringify(error)])),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      } as Response);
    }

    // Default fallback response for other endpoints
    return Promise.resolve({
      ok: false,
      status: 404,
      headers: new Headers(),
      json: () => Promise.resolve({ error: 'Not found' }),
      text: () => Promise.resolve(JSON.stringify({ error: 'Not found' })),
      blob: () => Promise.resolve(new Blob([JSON.stringify({ error: 'Not found' })])),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    } as Response);
  }) as jest.MockedFunction<typeof fetch>;
};

// Utility function interfaces
interface WaitForElementOptions {
  timeout?: number;
  interval?: number;
}

/**
 * Wait for element to appear with custom timeout
 * @param query - Query function (e.g., () => screen.getByText('text'))
 * @param options - Wait options
 * @returns Promise that resolves when element appears
 */
export const waitForElement = async <T>(
  query: () => T,
  options: WaitForElementOptions = {}
): Promise<T> => {
  const { timeout = 5000, interval = 50 } = options;
  
  return waitFor(query, { timeout, interval });
};

/**
 * Create a mock provider for testing provider-dependent components
 * @param ProviderComponent - The provider component to mock
 * @param mockValue - The value to provide
 * @returns Mock provider component
 */
export const createMockProvider = <T>(
  ProviderComponent: React.ComponentType<any>,
  mockValue: T
): React.FC<{ children: React.ReactNode }> => {
  return ({ children }) => (
    <ProviderComponent value={mockValue}>
      {children}
    </ProviderComponent>
  );
};

/**
 * Mock multiple providers in a single wrapper
 * @param providers - Array of provider configurations
 * @returns Combined provider wrapper
 */
export const createMultiProvider = (
  providers: Array<{
    Provider: React.ComponentType<any>;
    props?: any;
  }>
): React.FC<{ children: React.ReactNode }> => {
  return ({ children }) => {
    return providers.reduceRight(
      (acc, { Provider, props = {} }) => (
        <Provider {...props}>{acc}</Provider>
      ),
      children as React.ReactElement
    );
  };
};

// Enhanced user interaction utilities
interface FormData {
  [fieldName: string]: string | number | boolean;
}

interface NavigationOptions {
  replace?: boolean;
  scroll?: boolean;
}

/**
 * Enhanced user interaction utilities with better type safety
 */
export const userInteractions = {
  /**
   * Fill out a form with provided data
   * @param formData - Object with field names and values
   * @param userEventInstance - userEvent instance
   */
  fillForm: async (formData: FormData, userEventInstance: UserEvent): Promise<void> => {
    for (const [fieldName, value] of Object.entries(formData)) {
      if (value === null || value === undefined) continue;
      
      try {
        const field = screen.getByLabelText(new RegExp(fieldName, 'i')) || 
                     screen.getByPlaceholderText(new RegExp(fieldName, 'i')) ||
                     screen.getByRole('textbox', { name: new RegExp(fieldName, 'i') });
        
        if (field) {
          await userEventInstance.clear(field);
          await userEventInstance.type(field, String(value));
        }
      } catch (error) {
        console.warn(`Could not fill field "${fieldName}":`, error);
      }
    }
  },

  /**
   * Submit a form by clicking submit button
   * @param userEventInstance - userEvent instance
   * @param buttonText - Submit button text (default: 'submit')
   */
  submitForm: async (userEventInstance: UserEvent, buttonText = 'submit'): Promise<void> => {
    const submitButton = screen.getByRole('button', { name: new RegExp(buttonText, 'i') });
    await userEventInstance.click(submitButton);
  },

  /**
   * Navigate using router mock
   * @param path - Path to navigate to
   * @param options - Navigation options
   */
  navigate: (path: string, options: NavigationOptions = {}): void => {
    if (options.replace) {
      mockRouter.replace(path);
    } else {
      mockRouter.push(path);
    }
    
    // Update router state
    mockRouter.pathname = path;
    mockRouter.asPath = path;
    mockRouter.route = path;
  },

  /**
   * Select option from dropdown/select
   * @param selectLabel - Label of the select element
   * @param optionText - Text of the option to select
   * @param userEventInstance - userEvent instance
   */
  selectOption: async (selectLabel: string, optionText: string, userEventInstance: UserEvent): Promise<void> => {
    const select = screen.getByLabelText(new RegExp(selectLabel, 'i'));
    await userEventInstance.selectOptions(select, optionText);
  },

  /**
   * Upload file to file input
   * @param inputLabel - Label of the file input
   * @param file - File object to upload
   * @param userEventInstance - userEvent instance
   */
  uploadFile: async (inputLabel: string, file: File, userEventInstance: UserEvent): Promise<void> => {
    const fileInput = screen.getByLabelText(new RegExp(inputLabel, 'i'));
    await userEventInstance.upload(fileInput, file);
  },

  /**
   * Complete authentication flow
   * @param credentials - Login credentials
   * @param userEventInstance - userEvent instance
   */
  signIn: async (
    credentials: { email: string; password: string }, 
    userEventInstance: UserEvent
  ): Promise<void> => {
    await userInteractions.fillForm(credentials, userEventInstance);
    await userInteractions.submitForm(userEventInstance, 'sign in');
  },

  /**
   * Complete registration flow
   * @param userData - Registration data
   * @param userEventInstance - userEvent instance
   */
  signUp: async (
    userData: { email: string; password: string; name: string; confirmPassword?: string }, 
    userEventInstance: UserEvent
  ): Promise<void> => {
    const formData = {
      ...userData,
      'confirm password': userData.confirmPassword || userData.password,
    };
    await userInteractions.fillForm(formData, userEventInstance);
    await userInteractions.submitForm(userEventInstance, 'sign up');
  },

  /**
   * Wait for navigation to complete
   * @param expectedPath - Expected path after navigation
   * @param timeout - Timeout in milliseconds
   */
  waitForNavigation: async (expectedPath: string, timeout = 5000): Promise<void> => {
    await waitFor(() => {
      expect(mockRouter.pathname).toBe(expectedPath);
    }, { timeout });
  },

  /**
   * Simulate keyboard navigation
   * @param key - Key to press
   * @param userEventInstance - userEvent instance
   */
  pressKey: async (key: string, userEventInstance: UserEvent): Promise<void> => {
    await userEventInstance.keyboard(`{${key}}`);
  },

  /**
   * Simulate tab navigation
   * @param userEventInstance - userEvent instance
   * @param direction - Direction to tab ('forward' or 'backward')
   */
  tabNavigate: async (userEventInstance: UserEvent, direction: 'forward' | 'backward' = 'forward'): Promise<void> => {
    if (direction === 'backward') {
      await userEventInstance.keyboard('{Shift>}{Tab}{/Shift}');
    } else {
      await userEventInstance.keyboard('{Tab}');
    }
  },
};

// Test assertion utilities
interface QueryOptions {
  exact?: boolean;
  normalizer?: (text: string) => string;
}

interface ApiCallExpectation {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

/**
 * Enhanced test utilities for assertions with better type safety
 */
export const testUtils = {
  /**
   * Assert that an element has specific text content
   * @param text - Text to search for
   * @param options - Query options
   */
  expectTextToBeInDocument: (text: string | RegExp, options: QueryOptions = {}): void => {
    expect(screen.getByText(text, options)).toBeInTheDocument();
  },

  /**
   * Assert that an element is not in the document
   * @param text - Text to search for
   */
  expectTextNotToBeInDocument: (text: string | RegExp): void => {
    expect(screen.queryByText(text)).not.toBeInTheDocument();
  },

  /**
   * Assert that a form field has specific value
   * @param fieldName - Field label or placeholder
   * @param expectedValue - Expected field value
   */
  expectFieldValue: (fieldName: string, expectedValue: string | number): void => {
    const field = screen.getByLabelText(new RegExp(fieldName, 'i')) || 
                 screen.getByPlaceholderText(new RegExp(fieldName, 'i'));
    expect(field).toHaveValue(expectedValue);
  },

  /**
   * Assert that an API call was made with specific parameters
   * @param endpoint - Endpoint pattern
   * @param expectedCall - Expected request details
   */
  expectApiCall: (endpoint: string, expectedCall: ApiCallExpectation = {}): void => {
    const { method = 'GET', headers, body } = expectedCall;
    
    const expectedOptions: any = expect.objectContaining({
      method: method.toUpperCase(),
    });

    if (headers) {
      expectedOptions.headers = expect.objectContaining(headers);
    }

    if (body) {
      expectedOptions.body = JSON.stringify(body);
    }

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(endpoint),
      expectedOptions
    );
  },

  /**
   * Assert that router navigation occurred
   * @param expectedPath - Expected navigation path
   * @param method - Navigation method ('push' or 'replace')
   */
  expectNavigation: (expectedPath: string, method: 'push' | 'replace' = 'push'): void => {
    expect(mockRouter[method]).toHaveBeenCalledWith(expectedPath);
  },

  /**
   * Assert that an element has specific accessibility attributes
   * @param element - Element to check
   * @param attributes - Expected attributes
   */
  expectAccessibility: (element: HTMLElement, attributes: Record<string, string | boolean>): void => {
    Object.entries(attributes).forEach(([attr, value]) => {
      if (typeof value === 'boolean') {
        if (value) {
          expect(element).toHaveAttribute(attr);
        } else {
          expect(element).not.toHaveAttribute(attr);
        }
      } else {
        expect(element).toHaveAttribute(attr, value);
      }
    });
  },

  /**
   * Assert that loading states are handled correctly
   * @param timeout - Timeout for waiting
   */
  expectLoadingComplete: async (timeout = 5000): Promise<void> => {
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    }, { timeout });
  },

  /**
   * Assert that error states are displayed correctly
   * @param errorMessage - Expected error message
   */
  expectErrorMessage: (errorMessage: string | RegExp): void => {
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  },

  /**
   * Assert that form validation works correctly
   * @param fieldName - Field name to check
   * @param validationMessage - Expected validation message
   */
  expectValidationError: (fieldName: string, validationMessage: string | RegExp): void => {
    const field = screen.getByLabelText(new RegExp(fieldName, 'i'));
    expect(field).toBeInvalid();
    expect(screen.getByText(validationMessage)).toBeInTheDocument();
  },
};

/**
 * Reset all mocks and test state
 */
export const resetTestState = (): void => {
  jest.clearAllMocks();
  
  // Reset router mocks
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.back.mockClear();
  mockRouter.forward.mockClear();
  mockRouter.refresh.mockClear();
  mockRouter.prefetch.mockClear();

  // Reset router state
  Object.assign(mockRouter, {
    pathname: '/',
    route: '/',
    query: {},
    asPath: '/',
    basePath: '',
    isLocaleDomain: true,
    isReady: true,
    isPreview: false,
  });

  // Reset fetch mock
  if (global.fetch && typeof global.fetch.mockRestore === 'function') {
    global.fetch.mockRestore();
  }

  // Clear any global fetch mock
  delete (global as any).fetch;
};

/**
 * Setup common test environment for component testing
 * @param options - Setup options
 */
export const setupTestEnvironment = (options: {
  mockApis?: ApiMockConfig;
  user?: User | null;
  route?: string;
} = {}): {
  queryClient: QueryClient;
  user: UserEvent;
  router: MockRouter;
} => {
  const { mockApis, user = null, route = '/' } = options;

  // Reset state first
  resetTestState();

  // Setup API mocks if provided
  if (mockApis) {
    mockApiResponses(mockApis);
  }

  // Setup router state
  if (route !== '/') {
    userInteractions.navigate(route);
  }

  const queryClient = createTestQueryClient();
  const userEventInstance = userEvent.setup();

  return {
    queryClient,
    user: userEventInstance,
    router: mockRouter,
  };
};

/**
 * Create a test file for file upload testing
 * @param name - File name
 * @param content - File content
 * @param type - MIME type
 * @returns File object for testing
 */
export const createTestFile = (
  name = 'test.txt',
  content = 'test content',
  type = 'text/plain'
): File => {
  return new File([content], name, { type });
};

/**
 * Create test image file for image upload testing
 * @param name - File name
 * @param width - Image width
 * @param height - Image height
 * @returns File object for testing
 */
export const createTestImageFile = (
  name = 'test.jpg',
  width = 100,
  height = 100
): File => {
  // Create a simple canvas and convert to blob
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, width, height);
  }
  
  // Convert canvas to blob and create file
  const dataURL = canvas.toDataURL('image/jpeg');
  const byteString = atob(dataURL.split(',')[1]);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  
  return new File([arrayBuffer], name, { type: 'image/jpeg' });
};

/**
 * Wait for React Query to settle (useful for testing async operations)
 * @param queryClient - QueryClient instance
 * @param timeout - Timeout in milliseconds
 */
export const waitForQueryToSettle = async (
  queryClient: QueryClient,
  timeout = 5000
): Promise<void> => {
  await waitFor(() => {
    expect(queryClient.isFetching()).toBe(0);
  }, { timeout });
};

// Export the mock router for direct access in tests
export { mockRouter };