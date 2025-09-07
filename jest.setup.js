// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
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
}));

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />;
  },
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
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock navigator APIs with proper cleanup strategy
const mockNavigatorAPIs = () => {
  // Store original values for cleanup
  const originalNavigator = { ...navigator };
  
  // Create a new navigator object with mocked methods
  const mockNavigator = {
    ...originalNavigator,
    vibrate: jest.fn(),
    serviceWorker: {
      register: jest.fn(() => Promise.resolve({
        unregister: jest.fn(),
        update: jest.fn(),
      })),
      ready: Promise.resolve({
        unregister: jest.fn(),
        update: jest.fn(),
      }),
      controller: null,
    },
    onLine: true,
    userAgent: 'Mozilla/5.0 (Test Environment)',
    platform: 'Test',
    language: 'en-US',
    languages: ['en-US', 'en'],
    cookieEnabled: true,
    doNotTrack: null,
    geolocation: {
      getCurrentPosition: jest.fn(),
      watchPosition: jest.fn(),
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

  // Replace the global navigator
  Object.defineProperty(window, 'navigator', {
    value: mockNavigator,
    writable: true,
    configurable: true,
  });

  return mockNavigator;
};

// Initialize navigator mocks
const mockedNavigator = mockNavigatorAPIs();

// Mock performance.now
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

// Mock getComputedStyle with CSS variable support
Object.defineProperty(window, 'getComputedStyle', {
  value: jest.fn((element, pseudoElement) => {
    // CSS variable mappings for design system
    const cssVariables = {
      '--color-mint-400': '#34d399',
      '--color-red-600': '#dc2626',
      '--color-primary-600': '#2563eb',
      '--color-gray-200': '#e5e7eb',
      '--color-white': '#ffffff',
      '--color-black': '#000000',
    };

    // Default computed style values
    const defaultStyles = {
      color: 'rgb(0, 0, 0)',
      backgroundColor: 'rgba(0, 0, 0, 0)',
      borderColor: 'rgb(0, 0, 0)',
      fontSize: '16px',
      fontFamily: 'system-ui',
      display: 'block',
      position: 'static',
      width: 'auto',
      height: 'auto',
      margin: '0px',
      padding: '0px',
      border: '0px none rgb(0, 0, 0)',
      borderWidth: '0px',
      borderStyle: 'none',
      borderRadius: '0px',
      opacity: '1',
      visibility: 'visible',
      overflow: 'visible',
      textAlign: 'start',
      verticalAlign: 'baseline',
      lineHeight: 'normal',
      letterSpacing: 'normal',
      wordSpacing: 'normal',
      textTransform: 'none',
      textDecoration: 'none solid rgb(0, 0, 0)',
      whiteSpace: 'normal',
      boxSizing: 'content-box',
      flexDirection: 'row',
      flexWrap: 'nowrap',
      justifyContent: 'flex-start',
      alignItems: 'stretch',
      alignContent: 'stretch',
      gap: 'normal',
      gridTemplateColumns: 'none',
      gridTemplateRows: 'none',
      gridGap: '0px',
      transform: 'none',
      transformOrigin: '50% 50% 0px',
      transition: 'all 0s ease 0s',
      animation: 'none',
      animationDuration: '0s',
      animationTimingFunction: 'ease',
      animationDelay: '0s',
      animationIterationCount: '1',
      animationDirection: 'normal',
      animationFillMode: 'none',
      animationPlayState: 'running',
      touchAction: 'auto',
      userSelect: 'auto',
      pointerEvents: 'auto',
      cursor: 'auto',
      zIndex: 'auto',
      float: 'none',
      clear: 'none',
      content: 'normal',
    };

    // Handle pseudo-elements
    if (pseudoElement) {
      if (pseudoElement === '::after' || pseudoElement === ':after') {
        return {
          ...defaultStyles,
          content: '""',
          display: 'inline',
        };
      }
      if (pseudoElement === ':focus-visible') {
        return {
          ...defaultStyles,
          outline: '2px solid rgb(37, 99, 235)',
          outlineOffset: '2px',
        };
      }
    }

    // Get element-specific styles from className or style attribute
    const elementStyles = {};
    
    if (element && element.className) {
      const classes = element.className.split(' ');
      
      // Map common Tailwind classes to computed styles
      classes.forEach(className => {
        switch (className) {
          case 'text-red-600':
            elementStyles.color = 'rgb(220, 38, 38)';
            break;
          case 'bg-mint-400':
            elementStyles.backgroundColor = 'rgb(52, 211, 153)';
            break;
          case 'border-red-600':
            elementStyles.borderColor = 'rgb(220, 38, 38)';
            break;
          case 'text-white':
            elementStyles.color = 'rgb(255, 255, 255)';
            break;
          case 'bg-white':
            elementStyles.backgroundColor = 'rgb(255, 255, 255)';
            break;
          case 'flex':
            elementStyles.display = 'flex';
            break;
          case 'flex-col':
            elementStyles.flexDirection = 'column';
            break;
          case 'flex-row':
            elementStyles.flexDirection = 'row';
            break;
          case 'hidden':
            elementStyles.display = 'none';
            break;
          case 'block':
            elementStyles.display = 'block';
            break;
          case 'inline':
            elementStyles.display = 'inline';
            break;
          case 'inline-block':
            elementStyles.display = 'inline-block';
            break;
          case 'touch-manipulation':
            elementStyles.touchAction = 'manipulation';
            break;
          case 'select-none':
            elementStyles.userSelect = 'none';
            break;
          case 'pointer-events-none':
            elementStyles.pointerEvents = 'none';
            break;
        }
      });
    }

    // Handle inline styles
    if (element && element.style) {
      Object.keys(element.style).forEach(prop => {
        if (element.style[prop]) {
          elementStyles[prop] = element.style[prop];
        }
      });
    }

    // Create computed style object with getPropertyValue method
    const computedStyle = {
      ...defaultStyles,
      ...elementStyles,
      
      getPropertyValue: jest.fn((property) => {
        // Handle CSS variables
        if (property.startsWith('--')) {
          return cssVariables[property] || '';
        }
        
        // Convert camelCase to kebab-case
        const kebabProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
        
        // Return the computed value
        return computedStyle[property] || computedStyle[kebabProperty] || '';
      }),
      
      setProperty: jest.fn(),
      removeProperty: jest.fn(),
      
      // Make it iterable
      [Symbol.iterator]: function* () {
        for (const prop in this) {
          if (typeof this[prop] !== 'function' && prop !== Symbol.iterator) {
            yield prop;
          }
        }
      },
    };

    return computedStyle;
  }),
});

// Mock fetch globally
global.fetch = jest.fn();

// Mock Next.js Request and Response for API route testing
global.Request = class MockRequest {
  constructor(input, init = {}) {
    this.url = typeof input === 'string' ? input : input.url;
    this.method = init.method || 'GET';
    this.headers = new Map(Object.entries(init.headers || {}));
    this.body = init.body || null;
    this._bodyUsed = false;
  }

  async json() {
    if (this._bodyUsed) throw new Error('Body already used');
    this._bodyUsed = true;
    return this.body ? JSON.parse(this.body) : {};
  }

  async text() {
    if (this._bodyUsed) throw new Error('Body already used');
    this._bodyUsed = true;
    return this.body || '';
  }

  get bodyUsed() {
    return this._bodyUsed;
  }
};

global.Response = class MockResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.headers = new Map(Object.entries(init.headers || {}));
    this.ok = this.status >= 200 && this.status < 300;
  }

  async json() {
    return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
  }

  async text() {
    return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
  }

  static json(data, init = {}) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
  }
};

// Mock Headers for Request/Response
global.Headers = class MockHeaders extends Map {
  constructor(init) {
    super();
    if (init) {
      if (Array.isArray(init)) {
        init.forEach(([key, value]) => this.set(key, value));
      } else if (typeof init === 'object') {
        Object.entries(init).forEach(([key, value]) => this.set(key, value));
      }
    }
  }

  get(name) {
    return super.get(name.toLowerCase());
  }

  set(name, value) {
    return super.set(name.toLowerCase(), value);
  }

  has(name) {
    return super.has(name.toLowerCase());
  }

  delete(name) {
    return super.delete(name.toLowerCase());
  }
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

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

// Apply storage mocks
Object.defineProperty(window, 'localStorage', {
  value: createStorageMock(),
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: createStorageMock(),
  writable: true,
});

// Setup test environment
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset fetch mock
  if (global.fetch && typeof global.fetch.mockClear === 'function') {
    global.fetch.mockClear();
  }
  
  // Reset DOM
  document.body.innerHTML = '';
  
  // Reset localStorage
  if (localStorage.clear) {
    localStorage.clear();
  }
  
  // Reset sessionStorage
  if (sessionStorage.clear) {
    sessionStorage.clear();
  }
  
  // Reset navigator mocks
  if (mockedNavigator) {
    if (mockedNavigator.vibrate && typeof mockedNavigator.vibrate.mockClear === 'function') {
      mockedNavigator.vibrate.mockClear();
    }
    if (mockedNavigator.serviceWorker && mockedNavigator.serviceWorker.register && typeof mockedNavigator.serviceWorker.register.mockClear === 'function') {
      mockedNavigator.serviceWorker.register.mockClear();
    }
  }
});