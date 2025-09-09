/**
 * Mock factories for consistent test data generation
 */

export interface MockFetchResponse {
  ok?: boolean;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  data?: any;
}

export interface MockFetchConfig {
  url?: string | RegExp;
  method?: string;
  response?: MockFetchResponse;
  delay?: number;
}

/**
 * Creates a mock fetch implementation with configurable responses
 */
export function createMockFetch(configs: MockFetchConfig[] = []) {
  return jest.fn((url: string, options?: RequestInit) => {
    const method = options?.method || 'GET';
    
    // Find matching config
    const config = configs.find(c => {
      if (c.url instanceof RegExp) {
        return c.url.test(url);
      }
      if (typeof c.url === 'string') {
        return url.includes(c.url);
      }
      return true; // Default match
    });
    
    const response = config?.response || { ok: true, status: 200, data: {} };
    
    const mockResponse = {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      statusText: response.statusText ?? 'OK',
      headers: new Map(Object.entries(response.headers || { 'content-type': 'application/json' })),
      json: () => Promise.resolve(response.data || {}),
      text: () => Promise.resolve(JSON.stringify(response.data || {})),
      blob: () => Promise.resolve(new Blob()),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      clone: function() { return this; },
      body: null,
      bodyUsed: false,
    };
    
    if (config?.delay) {
      return new Promise(resolve => {
        setTimeout(() => resolve(mockResponse), config.delay);
      });
    }
    
    return Promise.resolve(mockResponse);
  });
}

/**
 * Mock plant data for testing
 */
export const mockPlantData = {
  plants: [
    {
      id: 1,
      family: 'Araceae',
      genus: 'Monstera',
      species: 'deliciosa',
      commonName: 'Monstera Deliciosa',
      isVerified: true,
      matchedFields: ['commonName'],
    },
    {
      id: 2,
      family: 'Araceae',
      genus: 'Philodendron',
      species: 'hederaceum',
      commonName: 'Heart Leaf Philodendron',
      isVerified: false,
      matchedFields: ['genus'],
    },
    {
      id: 3,
      family: 'Moraceae',
      genus: 'Ficus',
      species: 'lyrata',
      commonName: 'Fiddle Leaf Fig',
      isVerified: true,
      matchedFields: ['species'],
    },
  ],
  quickSelect: {
    recent: [
      {
        id: 1,
        family: 'Araceae',
        genus: 'Monstera',
        species: 'deliciosa',
        commonName: 'Monstera Deliciosa',
        isVerified: true,
      },
    ],
    popular: [
      {
        id: 2,
        family: 'Araceae',
        genus: 'Philodendron',
        species: 'hederaceum',
        commonName: 'Heart Leaf Philodendron',
        isVerified: false,
      },
    ],
  },
};

/**
 * Mock user data for testing
 */
export const mockUserData = {
  user: {
    id: 1,
    email: 'test@example.com',
    username: 'testuser',
    createdAt: new Date('2024-01-01'),
    isActive: true,
  },
  session: {
    id: 'session-123',
    userId: 1,
    expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
  },
};

/**
 * Mock plant instance data for testing
 */
export const mockPlantInstanceData = {
  plantInstances: [
    {
      id: 1,
      userId: 1,
      plantId: 1,
      nickname: 'My Monstera',
      location: 'Living Room',
      acquiredDate: new Date('2024-01-15'),
      isActive: true,
      lastWatered: new Date('2024-01-20'),
      lastFertilized: new Date('2024-01-10'),
    },
    {
      id: 2,
      userId: 1,
      plantId: 2,
      nickname: 'Phil the Philodendron',
      location: 'Bedroom',
      acquiredDate: new Date('2024-02-01'),
      isActive: true,
      lastWatered: new Date('2024-02-05'),
      lastFertilized: null,
    },
  ],
};

/**
 * Creates mock API responses for common endpoints
 */
export function createMockApiResponses() {
  return [
    {
      url: '/api/plants/suggestions',
      response: {
        ok: true,
        status: 200,
        data: {
          success: true,
          data: {
            plants: mockPlantData.plants,
            quickSelect: mockPlantData.quickSelect,
          },
        },
      },
    },
    {
      url: '/api/plants/search',
      response: {
        ok: true,
        status: 200,
        data: {
          success: true,
          data: {
            plants: mockPlantData.plants,
            total: mockPlantData.plants.length,
          },
        },
      },
    },
    {
      url: '/api/plant-instances',
      response: {
        ok: true,
        status: 200,
        data: {
          success: true,
          data: mockPlantInstanceData.plantInstances,
        },
      },
    },
    {
      url: '/api/auth/user',
      response: {
        ok: true,
        status: 200,
        data: {
          success: true,
          data: mockUserData.user,
        },
      },
    },
  ];
}

/**
 * Setup function for component tests with common mocks
 */
export function setupComponentTest() {
  const mockFetch = createMockFetch(createMockApiResponses());
  global.fetch = mockFetch;
  
  return {
    mockFetch,
    mockData: {
      plants: mockPlantData,
      users: mockUserData,
      plantInstances: mockPlantInstanceData,
    },
  };
}

/**
 * Creates a mock navigator with all required APIs
 */
export function createMockNavigator() {
  return {
    vibrate: jest.fn(() => true),
    serviceWorker: {
      register: jest.fn(() => Promise.resolve({
        unregister: jest.fn(() => Promise.resolve(true)),
        update: jest.fn(() => Promise.resolve()),
        installing: null,
        waiting: null,
        active: null,
        scope: '/',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
      ready: Promise.resolve({
        unregister: jest.fn(() => Promise.resolve(true)),
        update: jest.fn(() => Promise.resolve()),
        installing: null,
        waiting: null,
        active: null,
        scope: '/',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }),
      controller: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    onLine: true,
    userAgent: 'Mozilla/5.0 (Test Environment)',
    platform: 'MacIntel',
    language: 'en-US',
    languages: ['en-US', 'en'],
    cookieEnabled: true,
    doNotTrack: null,
    geolocation: {
      getCurrentPosition: jest.fn(),
      watchPosition: jest.fn(() => 1),
      clearWatch: jest.fn(),
    },
    permissions: {
      query: jest.fn(() => Promise.resolve({ state: 'granted' })),
    },
    clipboard: {
      writeText: jest.fn(() => Promise.resolve()),
      readText: jest.fn(() => Promise.resolve('')),
    },
  };
}

/**
 * Error boundary for testing error states
 */
export class TestErrorBoundary extends Error {
  constructor(message: string, public readonly component?: string) {
    super(message);
    this.name = 'TestErrorBoundary';
  }
}

/**
 * Utility to wait for async operations in tests
 */
export function waitForAsync(ms: number = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock console methods to reduce test noise
 */
export function mockConsole() {
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