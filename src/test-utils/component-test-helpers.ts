/**
 * Component Test Helpers - Properly mock dependencies for component tests
 * Implements Requirements 4.3, 4.4
 */

import React from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { createMockFetch, createMockNavigator } from './mock-factories';
import type { TestUser, TestPlant, TestPlantInstance } from './database-test-manager';

export interface ComponentTestConfig {
  mockUser?: TestUser;
  mockPlants?: TestPlant[];
  mockPlantInstances?: TestPlantInstance[];
  mockApiResponses?: Record<string, any>;
  mockHooks?: Record<string, any>;
  enableQueryClient?: boolean;
  enableUserEvents?: boolean;
}

export interface TestRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  config?: ComponentTestConfig;
  wrapper?: React.ComponentType<any>;
}

/**
 * Enhanced render function with comprehensive mocking
 */
export function renderWithTestConfig(
  component: React.ReactElement,
  options: TestRenderOptions = {}
): RenderResult & { user?: ReturnType<typeof userEvent.setup> } {
  const { config = {}, wrapper: CustomWrapper, ...renderOptions } = options;
  
  // Setup mocks based on config
  setupComponentMocks(config);
  
  // Create wrapper with providers
  const AllProviders = ({ children }: { children: React.ReactNode }) => {
    let content = children;
    
    // Wrap with QueryClient if enabled
    if (config.enableQueryClient !== false) {
      const queryClient = new QueryClient({
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
      
      content = React.createElement(QueryClientProvider, { client: queryClient }, content);
    }
    
    // Wrap with custom wrapper if provided
    if (CustomWrapper) {
      content = React.createElement(CustomWrapper, {}, content);
    }
    
    return React.createElement(React.Fragment, {}, content);
  };
  
  const result = render(component, { wrapper: AllProviders, ...renderOptions });
  
  // Setup user events if enabled
  const user = config.enableUserEvents !== false ? userEvent.setup() : undefined;
  
  return { ...result, user };
}

/**
 * Setup component mocks based on configuration
 */
function setupComponentMocks(config: ComponentTestConfig): void {
  const {
    mockUser,
    mockPlants = [],
    mockPlantInstances = [],
    mockApiResponses = {},
    mockHooks = {},
  } = config;
  
  // Setup fetch mocks
  setupFetchMocks(mockApiResponses, mockPlants, mockPlantInstances, mockUser);
  
  // Setup hook mocks
  setupHookMocks(mockHooks, mockPlantInstances, mockUser);
  
  // Setup browser API mocks
  setupBrowserAPIMocks();
  
  // Setup Next.js mocks
  setupNextJSMocks();
}

/**
 * Setup fetch mocks with realistic API responses
 */
function setupFetchMocks(
  customResponses: Record<string, any>,
  plants: TestPlant[],
  plantInstances: TestPlantInstance[],
  user?: TestUser
): void {
  const defaultResponses = {
    '/api/plants/search': {
      success: true,
      data: {
        plants: plants.slice(0, 10),
        total: plants.length,
      },
    },
    '/api/plants/suggestions': {
      success: true,
      data: {
        quickSelect: {
          recent: plants.slice(0, 3),
          popular: plants.slice(3, 6),
        },
      },
    },
    '/api/plant-instances': {
      success: true,
      data: {
        instances: plantInstances,
        totalCount: plantInstances.length,
        hasMore: false,
        searchTime: 10,
        filters: {},
      },
    },
    '/api/auth/user': user ? {
      success: true,
      data: user,
    } : {
      success: false,
      error: 'Not authenticated',
    },
    '/api/care/log': {
      success: true,
      data: {
        id: 1,
        careType: 'fertilizer',
        careDate: new Date().toISOString(),
      },
    },
    '/api/propagations': {
      success: true,
      data: [],
    },
  };
  
  const allResponses = { ...defaultResponses, ...customResponses };
  
  const mockFetch = jest.fn((url: string, options?: RequestInit) => {
    const method = options?.method || 'GET';
    
    // Find matching response
    let responseData = { success: false, error: 'Not found' };
    
    for (const [pattern, response] of Object.entries(allResponses)) {
      if (url.includes(pattern)) {
        responseData = response;
        break;
      }
    }
    
    // Handle different HTTP methods
    if (method === 'POST' && url.includes('/api/plant-instances')) {
      responseData = {
        success: true,
        data: {
          id: Date.now(),
          ...JSON.parse(options?.body as string || '{}'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    }
    
    return Promise.resolve({
      ok: responseData.success !== false,
      status: responseData.success !== false ? 200 : 400,
      statusText: responseData.success !== false ? 'OK' : 'Bad Request',
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve(responseData),
      text: () => Promise.resolve(JSON.stringify(responseData)),
      blob: () => Promise.resolve(new Blob()),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      clone: function() { return this; },
      body: null,
      bodyUsed: false,
    });
  });
  
  global.fetch = mockFetch;
}

/**
 * Setup hook mocks for React hooks used in components
 */
function setupHookMocks(
  customHooks: Record<string, any>,
  plantInstances: TestPlantInstance[],
  user?: TestUser
): void {
  // Mock usePlantInstances hook
  const mockUsePlantInstances = jest.fn(() => ({
    data: {
      instances: plantInstances,
      totalCount: plantInstances.length,
      hasMore: false,
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...customHooks.usePlantInstances,
  }));
  
  // Mock usePlantSelection hook
  const mockUsePlantSelection = jest.fn(() => ({
    selectedPlant: null,
    setSelectedPlant: jest.fn(),
    clearSelection: jest.fn(),
    ...customHooks.usePlantSelection,
  }));
  
  // Mock useOffline hook
  const mockUseOffline = jest.fn(() => ({
    isOffline: false,
    isOnline: true,
    ...customHooks.useOffline,
  }));
  
  // Mock usePWAInstall hook
  const mockUsePWAInstall = jest.fn(() => ({
    canInstall: false,
    install: jest.fn(),
    ...customHooks.usePWAInstall,
  }));
  
  // Mock usePerformanceOptimization hook
  const mockUsePerformanceOptimization = jest.fn(() => ({
    isOptimized: true,
    optimizationLevel: 'high',
    ...customHooks.usePerformanceOptimization,
  }));
  
  // Mock usePullToRefresh hook
  const mockUsePullToRefresh = jest.fn(() => ({
    isRefreshing: false,
    refresh: jest.fn(),
    getRefreshIndicatorStyle: jest.fn(() => ({ transform: 'translateY(0px)' })),
    ...customHooks.usePullToRefresh,
  }));
  
  // Mock useSwipeGestures hook
  const mockUseSwipeGestures = jest.fn(() => ({
    onTouchStart: jest.fn(),
    onTouchMove: jest.fn(),
    onTouchEnd: jest.fn(),
    ...customHooks.useSwipeGestures,
  }));
  
  // Mock useHapticFeedback hook
  const mockUseHapticFeedback = jest.fn(() => ({
    vibrate: jest.fn(),
    isSupported: true,
    ...customHooks.useHapticFeedback,
  }));
  
  // Apply hook mocks
  jest.doMock('@/hooks/usePlantInstances', () => ({
    usePlantInstances: mockUsePlantInstances,
  }));
  
  jest.doMock('@/hooks/usePlantSelection', () => ({
    usePlantSelection: mockUsePlantSelection,
  }));
  
  jest.doMock('@/hooks/useOffline', () => ({
    useOffline: mockUseOffline,
  }));
  
  jest.doMock('@/hooks/usePWAInstall', () => ({
    usePWAInstall: mockUsePWAInstall,
  }));
  
  jest.doMock('@/hooks/usePerformanceOptimization', () => ({
    usePerformanceOptimization: mockUsePerformanceOptimization,
  }));
  
  jest.doMock('@/hooks/usePullToRefresh', () => ({
    usePullToRefresh: mockUsePullToRefresh,
  }));
  
  jest.doMock('@/hooks/useSwipeGestures', () => ({
    useSwipeGestures: mockUseSwipeGestures,
  }));
  
  jest.doMock('@/hooks/useHapticFeedback', () => ({
    useHapticFeedback: mockUseHapticFeedback,
  }));
}

/**
 * Setup browser API mocks
 */
function setupBrowserAPIMocks(): void {
  // Setup navigator mock
  const mockNavigator = createMockNavigator();
  Object.defineProperty(global, 'navigator', {
    value: mockNavigator,
    writable: true,
    configurable: true,
  });
  
  // Setup performance mock
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'performance', {
      writable: true,
      value: {
        now: jest.fn(() => Date.now()),
        mark: jest.fn(),
        measure: jest.fn(),
        getEntriesByType: jest.fn(() => []),
        getEntriesByName: jest.fn(() => []),
        timing: {
          navigationStart: Date.now() - 1000,
          loadEventEnd: Date.now(),
        },
      },
    });
  }
  
  // Setup IntersectionObserver mock
  global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
    takeRecords: jest.fn(() => []),
  }));
  
  // Setup ResizeObserver mock
  global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
  
  // Setup MutationObserver mock
  global.MutationObserver = jest.fn().mockImplementation((callback) => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
    takeRecords: jest.fn(() => []),
  }));
}

/**
 * Setup Next.js specific mocks
 */
function setupNextJSMocks(): void {
  // Mock Next.js router
  jest.doMock('next/navigation', () => ({
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    }),
    usePathname: () => '/dashboard/plants',
    useSearchParams: () => new URLSearchParams(),
    useParams: () => ({}),
  }));
  
  // Mock Next.js Image component
  jest.doMock('next/image', () => ({
    __esModule: true,
    default: (props: any) => {
       
      return React.createElement('img', {
        ...props,
        alt: props.alt || '',
        // Remove Next.js specific props
        priority: undefined,
        placeholder: undefined,
        blurDataURL: undefined,
      });
    },
  }));
  
  // Mock Next.js Link component
  jest.doMock('next/link', () => ({
    __esModule: true,
    default: ({ children, href, ...props }: any) => {
      return React.createElement('a', { href, ...props }, children);
    },
  }));
}

/**
 * Utility functions for common test scenarios
 */

/**
 * Wait for component to finish loading
 */
export async function waitForComponentToLoad(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Wait for async operations to complete
 */
export async function waitForAsync(ms: number = 0): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Simulate user typing with realistic delays
 */
export async function typeWithDelay(
  user: ReturnType<typeof userEvent.setup>,
  element: Element,
  text: string,
  delay: number = 50
): Promise<void> {
  await user.clear(element);
  await user.type(element, text, { delay });
}

/**
 * Simulate form submission
 */
export async function submitForm(
  user: ReturnType<typeof userEvent.setup>,
  form: HTMLFormElement
): Promise<void> {
  const submitButton = form.querySelector('button[type="submit"]') || 
                      form.querySelector('input[type="submit"]');
  
  if (submitButton) {
    await user.click(submitButton);
  } else {
    // Fallback: trigger form submit event
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }
}

/**
 * Mock console methods to reduce test noise
 */
export function mockConsole(): { restore: () => void } {
  const originalConsole = { ...console };
  
  global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
  
  return {
    restore: () => {
      global.console = originalConsole;
    },
  };
}

/**
 * Create a test wrapper with error boundary
 */
export function createTestWrapper(options: { onError?: (error: Error) => void } = {}) {
  return class TestWrapper extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error?: Error }
  > {
    constructor(props: { children: React.ReactNode }) {
      super(props);
      this.state = { hasError: false };
    }
    
    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }
    
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      if (options.onError) {
        options.onError(error);
      }
    }
    
    render() {
      if (this.state.hasError) {
        return React.createElement('div', { 'data-testid': 'error-boundary' }, 
          `Error: ${this.state.error?.message}`
        );
      }
      
      return this.props.children;
    }
  };
}

/**
 * Assert that an element is visible and accessible
 */
export function expectElementToBeAccessible(element: HTMLElement): void {
  expect(element).toBeInTheDocument();
  expect(element).toBeVisible();
  
  // Check for accessibility attributes
  if (element.tagName === 'BUTTON') {
    expect(element).not.toHaveAttribute('aria-disabled', 'true');
  }
  
  if (element.tagName === 'INPUT') {
    const label = element.getAttribute('aria-label') || 
                  element.getAttribute('aria-labelledby') ||
                  document.querySelector(`label[for="${element.id}"]`);
    expect(label).toBeTruthy();
  }
}

/**
 * Assert that a form field has proper validation
 */
export function expectFormFieldToBeValid(field: HTMLElement): void {
  expect(field).toBeInTheDocument();
  expect(field).not.toHaveAttribute('aria-invalid', 'true');
  expect(field).not.toHaveClass('error', 'invalid');
}

/**
 * Assert that a form field has validation errors
 */
export function expectFormFieldToHaveError(field: HTMLElement, errorMessage?: string): void {
  expect(field).toBeInTheDocument();
  
  // Check for error state
  const hasErrorState = field.hasAttribute('aria-invalid') ||
                       field.classList.contains('error') ||
                       field.classList.contains('invalid');
  expect(hasErrorState).toBe(true);
  
  // Check for error message if provided
  if (errorMessage) {
    const errorElement = field.getAttribute('aria-describedby') ?
      document.getElementById(field.getAttribute('aria-describedby')!) :
      field.parentElement?.querySelector('.error-message, .field-error');
    
    if (errorElement) {
      expect(errorElement).toHaveTextContent(errorMessage);
    }
  }
}

/**
 * Cleanup function for component tests
 */
export function cleanupComponentTest(): void {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset fetch mock
  if (global.fetch && typeof (global.fetch as any).mockClear === 'function') {
    (global.fetch as any).mockClear();
  }
  
  // Clear DOM
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
  
  // Clear storage
  if (typeof localStorage !== 'undefined' && localStorage.clear) {
    localStorage.clear();
  }
  
  if (typeof sessionStorage !== 'undefined' && sessionStorage.clear) {
    sessionStorage.clear();
  }
  
  // Clear timers
  jest.clearAllTimers();
}