import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { EnhancedPlantInstance } from '@/lib/types/plant-instance-types';
import type { Propagation, Plant, CareHistory } from '@/lib/db/schema';

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Test data factories
export const createMockPlant = (overrides: Partial<Plant> = {}): Plant => ({
  id: 1,
  family: 'Araceae',
  genus: 'Monstera',
  species: 'deliciosa',
  cultivar: null,
  commonName: 'Monstera Deliciosa',
  careInstructions: null,
  defaultImage: null,
  createdBy: null,
  isVerified: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createMockPlantInstance = (
  overrides: Partial<EnhancedPlantInstance> = {}
): EnhancedPlantInstance => ({
  id: 1,
  userId: 1,
  plantId: 1,
  nickname: 'My Monstera',
  location: 'Living Room',
  lastFertilized: null,
  fertilizerSchedule: '2 weeks',
  fertilizerDue: null,
  lastRepot: null,
  notes: null,
  images: [],
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  plant: createMockPlant(),
  careStatus: 'healthy',
  careUrgency: 'none',
  daysUntilFertilizerDue: null,
  daysSinceLastFertilized: null,
  daysSinceLastRepot: null,
  displayName: 'My Monstera',
  primaryImage: null,
  ...overrides,
});

export const createMockPropagation = (
  overrides: Partial<Propagation> = {}
): Propagation => ({
  id: 1,
  userId: 1,
  plantId: 1,
  parentInstanceId: 1,
  nickname: 'Monstera Cutting',
  location: 'Propagation Station',
  dateStarted: new Date('2024-01-01'),
  status: 'rooting',
  sourceType: 'internal',
  externalSource: null,
  externalSourceDetails: null,
  notes: null,
  images: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createMockCareHistory = (
  overrides: Partial<CareHistory> = {}
): CareHistory => ({
  id: 1,
  userId: 1,
  plantInstanceId: 1,
  careType: 'fertilizer',
  careDate: new Date('2024-01-01'),
  notes: null,
  fertilizerType: null,
  potSize: null,
  soilType: null,
  images: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

// Mock API responses
export const mockApiResponse = <T,>(data: T, success: boolean = true) => ({
  ok: success,
  status: success ? 200 : 400,
  json: async () => ({
    success,
    data: success ? data : undefined,
    error: success ? undefined : 'Mock error',
  }),
});

export const mockApiError = (message: string = 'Mock error', status: number = 400) => ({
  ok: false,
  status,
  json: async () => ({
    success: false,
    error: message,
  }),
});

// Mock fetch responses
export const setupMockFetch = () => {
  const mockFetch = jest.fn();
  global.fetch = mockFetch;
  return mockFetch;
};

// User event helpers
import userEvent from '@testing-library/user-event';

export const createUserEvent = () => {
  return userEvent.setup();
};

// Wait for async operations
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

// Mock localStorage
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    length: Object.keys(store).length,
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
  };
};

// Mock sessionStorage
export const mockSessionStorage = () => {
  const store: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    length: Object.keys(store).length,
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
  };
};

// Mock IntersectionObserver
export const mockIntersectionObserver = () => {
  const mockObserver = {
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  };
  
  global.IntersectionObserver = jest.fn().mockImplementation(() => mockObserver);
  
  return mockObserver;
};

// Mock ResizeObserver
export const mockResizeObserver = () => {
  const mockObserver = {
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  };
  
  global.ResizeObserver = jest.fn().mockImplementation(() => mockObserver);
  
  return mockObserver;
};

// Mock performance API
export const mockPerformance = () => {
  const mockPerformance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
  };
  
  Object.defineProperty(window, 'performance', {
    writable: true,
    value: mockPerformance,
  });
  
  return mockPerformance;
};

// Mock navigator APIs
export const mockNavigator = () => {
  const mockNavigator = {
    vibrate: jest.fn(),
    serviceWorker: {
      register: jest.fn(),
      ready: Promise.resolve({
        unregister: jest.fn(),
      }),
    },
    onLine: true,
  };
  
  Object.defineProperty(window, 'navigator', {
    writable: true,
    value: { ...navigator, ...mockNavigator },
  });
  
  return mockNavigator;
};

// Test assertion helpers
export const expectElementToBeVisible = (element: HTMLElement) => {
  expect(element).toBeInTheDocument();
  expect(element).toBeVisible();
};

export const expectElementToHaveText = (element: HTMLElement, text: string) => {
  expect(element).toBeInTheDocument();
  expect(element).toHaveTextContent(text);
};

export const expectButtonToBeDisabled = (button: HTMLElement) => {
  expect(button).toBeInTheDocument();
  expect(button).toBeDisabled();
};

export const expectButtonToBeEnabled = (button: HTMLElement) => {
  expect(button).toBeInTheDocument();
  expect(button).toBeEnabled();
};

// Database mock helpers
export const mockDatabaseQueries = () => {
  return {
    getUserActivePlants: jest.fn(),
    getPlantsNeedingCare: jest.fn(),
    searchPlants: jest.fn(),
    getPlantStatistics: jest.fn(),
    getUserPropagationsByStatus: jest.fn(),
    getPropagationStatistics: jest.fn(),
    getPlantCareHistory: jest.fn(),
    getRecentCareActivities: jest.fn(),
  };
};

// Service mock helpers
export const mockServices = () => {
  return {
    plantInstanceService: {
      createPlantInstance: jest.fn(),
      updatePlantInstance: jest.fn(),
      deletePlantInstance: jest.fn(),
      getPlantInstance: jest.fn(),
    },
    careService: {
      logCare: jest.fn(),
      getCareHistory: jest.fn(),
      calculateNextDueDate: jest.fn(),
    },
    propagationService: {
      createPropagation: jest.fn(),
      updatePropagation: jest.fn(),
      convertToPlant: jest.fn(),
    },
    csvImportService: {
      validateCSV: jest.fn(),
      importCSV: jest.fn(),
      resolveConflicts: jest.fn(),
    },
  };
};