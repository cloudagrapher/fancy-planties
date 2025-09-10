// Essential browser API mocks for Jest environment

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