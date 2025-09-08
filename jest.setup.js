// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

import '@testing-library/jest-dom';

// Add Node.js polyfills for Jest environment
global.setImmediate = global.setImmediate || ((fn, ...args) => setTimeout(fn, 0, ...args));
global.clearImmediate = global.clearImmediate || ((id) => clearTimeout(id));

// Add process polyfill if not available
if (typeof global.process === 'undefined') {
  global.process = {
    env: { NODE_ENV: 'test' },
    nextTick: (fn) => setTimeout(fn, 0),
  };
}

// Mock Next.js modules - these will be handled by moduleNameMapper
// but we keep these for any direct imports
jest.mock('next/navigation', () => require('./src/test-utils/nextjs-mocks.ts'));
jest.mock('next/image', () => require('./src/test-utils/nextjs-mocks.ts').Image);

// Mock Next.js server-side modules for API route testing
jest.mock('next/server', () => ({
  NextRequest: require('./src/test-utils/nextjs-mocks.ts').NextRequest,
  NextResponse: require('./src/test-utils/nextjs-mocks.ts').NextResponse,
}));

jest.mock('next/headers', () => ({
  headers: require('./src/test-utils/nextjs-mocks.ts').headers,
  cookies: require('./src/test-utils/nextjs-mocks.ts').cookies,
}));

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock matchMedia
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Mock navigator APIs
const mockNavigator = {
  vibrate: jest.fn(() => true),
  serviceWorker: {
    register: jest.fn(() => Promise.resolve({
      unregister: jest.fn(() => Promise.resolve(true)),
      update: jest.fn(() => Promise.resolve()),
    })),
    ready: Promise.resolve({
      unregister: jest.fn(() => Promise.resolve(true)),
      update: jest.fn(() => Promise.resolve()),
    }),
    controller: null,
  },
  onLine: true,
  userAgent: 'Mozilla/5.0 (Test Environment)',
  platform: 'MacIntel',
  language: 'en-US',
  languages: ['en-US', 'en'],
  cookieEnabled: true,
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

// Apply navigator mock
if (typeof global !== 'undefined') {
  Object.defineProperty(global, 'navigator', {
    value: mockNavigator,
    writable: true,
    configurable: true,
  });
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'navigator', {
    value: mockNavigator,
    writable: true,
    configurable: true,
  });
}

// Mock performance
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'performance', {
    writable: true,
    value: {
      now: jest.fn(() => Date.now()),
      mark: jest.fn(),
      measure: jest.fn(),
      getEntriesByType: jest.fn(() => []),
      getEntriesByName: jest.fn(() => []),
    },
  });
}

// Mock fetch globally (will be overridden by individual tests)
if (!global.fetch) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve({ success: true, data: {} }),
      text: () => Promise.resolve('{}'),
      blob: () => Promise.resolve(new Blob()),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      clone: function() { return this; },
      body: null,
      bodyUsed: false,
    })
  );
}

// Mock localStorage and sessionStorage
const createStorageMock = () => {
  const store = new Map();
  
  return {
    getItem: jest.fn((key) => store.get(key) || null),
    setItem: jest.fn((key, value) => store.set(key, String(value))),
    removeItem: jest.fn((key) => store.delete(key)),
    clear: jest.fn(() => store.clear()),
    key: jest.fn((index) => {
      const keys = Array.from(store.keys());
      return keys[index] || null;
    }),
    get length() {
      return store.size;
    },
  };
};

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: createStorageMock(),
    writable: true,
  });

  Object.defineProperty(window, 'sessionStorage', {
    value: createStorageMock(),
    writable: true,
  });
}

// Mock problematic components that cause import issues
jest.mock('@/components/plants/PlantsGrid', () => {
  const mocks = require('./src/test-utils/component-mocks.tsx');
  return { 
    default: mocks.PlantsGrid,
    PlantsGrid: mocks.PlantsGrid
  };
});

jest.mock('@/components/plants/PlantCard', () => {
  const mocks = require('./src/test-utils/component-mocks.tsx');
  return { 
    default: mocks.PlantCard,
    PlantCard: mocks.PlantCard
  };
});

jest.mock('@/components/plants/PlantCardSkeleton', () => {
  const mocks = require('./src/test-utils/component-mocks.tsx');
  return { 
    default: mocks.PlantCardSkeleton,
    PlantCardSkeleton: mocks.PlantCardSkeleton
  };
});

jest.mock('@/components/plants/PlantInstanceForm', () => {
  const mocks = require('./src/test-utils/component-mocks.tsx');
  return { 
    default: mocks.PlantInstanceForm,
    PlantInstanceForm: mocks.PlantInstanceForm
  };
});

jest.mock('@/components/plants/PlantTaxonomyForm', () => {
  const mocks = require('./src/test-utils/component-mocks.tsx');
  return { 
    default: mocks.PlantTaxonomyForm,
    PlantTaxonomyForm: mocks.PlantTaxonomyForm
  };
});

jest.mock('@/components/plants/PlantTaxonomySelector', () => {
  const mocks = require('./src/test-utils/component-mocks.tsx');
  return { 
    default: mocks.PlantTaxonomySelector,
    PlantTaxonomySelector: mocks.PlantTaxonomySelector
  };
});

jest.mock('@/components/plants/PlantImageGallery', () => {
  const mocks = require('./src/test-utils/component-mocks.tsx');
  return { 
    default: mocks.PlantImageGallery,
    PlantImageGallery: mocks.PlantImageGallery
  };
});

jest.mock('@/components/navigation/BottomNavigation', () => {
  const mocks = require('./src/test-utils/component-mocks.tsx');
  return { 
    default: mocks.BottomNavigation,
    BottomNavigation: mocks.BottomNavigation
  };
});

jest.mock('@/components/care/CareDashboard', () => {
  const mocks = require('./src/test-utils/component-mocks.tsx');
  return { 
    default: mocks.CareDashboard,
    CareDashboard: mocks.CareDashboard
  };
});

jest.mock('@/components/care/QuickCareForm', () => {
  const mocks = require('./src/test-utils/component-mocks.tsx');
  return { 
    default: mocks.QuickCareForm,
    QuickCareForm: mocks.QuickCareForm
  };
});

jest.mock('@/components/care/QuickCareActions', () => {
  const mocks = require('./src/test-utils/component-mocks.tsx');
  return { 
    default: mocks.QuickCareActions,
    QuickCareActions: mocks.QuickCareActions
  };
});

jest.mock('@/components/shared/Modal', () => {
  const mocks = require('./src/test-utils/component-mocks.tsx');
  return { 
    default: mocks.Modal,
    Modal: mocks.Modal
  };
});

jest.mock('@/components/shared/VirtualScrollList', () => {
  const mocks = require('./src/test-utils/component-mocks.tsx');
  return { 
    default: mocks.VirtualScrollList,
    VirtualScrollList: mocks.VirtualScrollList
  };
});

jest.mock('@/components/import/CSVImportModal', () => {
  const mocks = require('./src/test-utils/component-mocks.tsx');
  return { 
    default: mocks.CSVImportModal,
    CSVImportModal: mocks.CSVImportModal
  };
});

jest.mock('@/components/search/AdvancedSearchInterface', () => {
  const mocks = require('./src/test-utils/component-mocks.tsx');
  return { 
    default: mocks.AdvancedSearchInterface,
    AdvancedSearchInterface: mocks.AdvancedSearchInterface
  };
});

jest.mock('@/app/dashboard/DashboardClient', () => {
  const mocks = require('./src/test-utils/component-mocks.tsx');
  return { 
    default: mocks.DashboardClient,
    DashboardClient: mocks.DashboardClient
  };
});

// Setup test environment
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset fetch mock (only if it exists and has mock methods)
  if (global.fetch && typeof global.fetch.mockClear === 'function') {
    global.fetch.mockClear();
  }
  
  // Reset DOM
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
  
  // Reset storage
  if (typeof localStorage !== 'undefined' && localStorage.clear) {
    localStorage.clear();
  }
  
  if (typeof sessionStorage !== 'undefined' && sessionStorage.clear) {
    sessionStorage.clear();
  }
});

// Cleanup after each test
afterEach(() => {
  jest.clearAllTimers();
});