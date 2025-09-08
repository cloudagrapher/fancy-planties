/**
 * Test environment setup utilities
 */

/**
 * Polyfills for Node.js APIs in Jest environment
 */
export function setupNodePolyfills() {
  // Timer polyfills
  if (!global.setImmediate) {
    global.setImmediate = ((fn: Function, ...args: any[]) => 
      setTimeout(fn, 0, ...args)) as typeof setImmediate;
  }
  
  if (!global.clearImmediate) {
    global.clearImmediate = ((id: NodeJS.Immediate) => 
      clearTimeout(id as any)) as typeof clearImmediate;
  }
  
  // Process polyfill
  if (!global.process) {
    global.process = {
      env: { NODE_ENV: 'test' },
      nextTick: (fn: Function) => setTimeout(fn, 0),
      version: 'v18.0.0',
      platform: 'test',
      arch: 'x64',
      cwd: () => '/',
      exit: jest.fn(),
      argv: ['node', 'jest'],
      pid: 12345,
      ppid: 12344,
      title: 'jest',
      uptime: () => 100,
      hrtime: {
        bigint: () => BigInt(Date.now() * 1000000),
      },
    } as any;
  }
  
  // Buffer polyfill
  if (!global.Buffer) {
    global.Buffer = {
      from: jest.fn((data: any) => ({ data, toString: () => String(data) })),
      alloc: jest.fn((size: number) => ({ length: size })),
      isBuffer: jest.fn(() => false),
    } as any;
  }
}

/**
 * Browser API polyfills for Jest environment
 */
export function setupBrowserPolyfills() {
  // URL polyfill
  if (!global.URL) {
    global.URL = class MockURL {
      constructor(public href: string, base?: string) {
        if (base) {
          this.href = new URL(href, base).href;
        }
      }
      
      get origin() { return 'http://localhost:3000'; }
      get protocol() { return 'http:'; }
      get host() { return 'localhost:3000'; }
      get hostname() { return 'localhost'; }
      get port() { return '3000'; }
      get pathname() { return '/'; }
      get search() { return ''; }
      get hash() { return ''; }
      
      toString() { return this.href; }
      toJSON() { return this.href; }
    } as any;
  }
  
  // URLSearchParams polyfill
  if (!global.URLSearchParams) {
    global.URLSearchParams = class MockURLSearchParams extends Map {
      constructor(init?: string | string[][] | Record<string, string>) {
        super();
        if (typeof init === 'string') {
          init.split('&').forEach(pair => {
            const [key, value] = pair.split('=');
            if (key) this.set(decodeURIComponent(key), decodeURIComponent(value || ''));
          });
        } else if (Array.isArray(init)) {
          init.forEach(([key, value]) => this.set(key, value));
        } else if (init && typeof init === 'object') {
          Object.entries(init).forEach(([key, value]) => this.set(key, value));
        }
      }
      
      toString() {
        const params: string[] = [];
        this.forEach((value, key) => {
          params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        });
        return params.join('&');
      }
      
      append(name: string, value: string) {
        const existing = this.get(name);
        if (existing) {
          this.set(name, existing + ',' + value);
        } else {
          this.set(name, value);
        }
      }
    } as any;
  }
  
  // Blob polyfill
  if (!global.Blob) {
    global.Blob = class MockBlob {
      constructor(public parts: any[] = [], public options: any = {}) {}
      get size() { return 0; }
      get type() { return this.options.type || ''; }
      slice() { return new MockBlob(); }
      stream() { return new ReadableStream(); }
      text() { return Promise.resolve(''); }
      arrayBuffer() { return Promise.resolve(new ArrayBuffer(0)); }
    } as any;
  }
  
  // File polyfill
  if (!global.File) {
    global.File = class MockFile extends (global.Blob as any) {
      constructor(parts: any[], public name: string, options: any = {}) {
        super(parts, options);
      }
      get lastModified() { return Date.now(); }
    } as any;
  }
  
  // FileReader polyfill
  if (!global.FileReader) {
    global.FileReader = class MockFileReader {
      result: any = null;
      error: any = null;
      readyState: number = 0;
      onload: ((event: any) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      onloadend: ((event: any) => void) | null = null;
      
      readAsText(file: any) {
        setTimeout(() => {
          this.result = 'mock file content';
          this.readyState = 2;
          if (this.onload) this.onload({ target: this });
          if (this.onloadend) this.onloadend({ target: this });
        }, 0);
      }
      
      readAsDataURL(file: any) {
        setTimeout(() => {
          this.result = 'data:text/plain;base64,bW9jayBmaWxlIGNvbnRlbnQ=';
          this.readyState = 2;
          if (this.onload) this.onload({ target: this });
          if (this.onloadend) this.onloadend({ target: this });
        }, 0);
      }
      
      abort() {
        this.readyState = 2;
      }
      
      addEventListener(type: string, listener: any) {
        if (type === 'load') this.onload = listener;
        if (type === 'error') this.onerror = listener;
        if (type === 'loadend') this.onloadend = listener;
      }
      
      removeEventListener() {}
    } as any;
  }
}

/**
 * DOM API polyfills for Jest environment
 */
export function setupDOMPolyfills() {
  // IntersectionObserver
  if (!global.IntersectionObserver) {
    global.IntersectionObserver = class MockIntersectionObserver {
      constructor(private callback: Function, private options?: any) {}
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return []; }
    } as any;
  }
  
  // ResizeObserver
  if (!global.ResizeObserver) {
    global.ResizeObserver = class MockResizeObserver {
      constructor(private callback: Function) {}
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any;
  }
  
  // MutationObserver
  if (!global.MutationObserver) {
    global.MutationObserver = class MockMutationObserver {
      constructor(private callback: Function) {}
      observe() {}
      disconnect() {}
      takeRecords() { return []; }
    } as any;
  }
  
  // Range
  if (typeof document !== 'undefined' && !document.createRange) {
    document.createRange = () => ({
      setStart: jest.fn(),
      setEnd: jest.fn(),
      commonAncestorContainer: document.body,
      collapsed: false,
      startContainer: document.body,
      startOffset: 0,
      endContainer: document.body,
      endOffset: 0,
      getBoundingClientRect: () => ({
        x: 0, y: 0, width: 0, height: 0,
        top: 0, right: 0, bottom: 0, left: 0,
        toJSON: () => ({}),
      }),
      getClientRects: () => [],
      cloneContents: () => document.createDocumentFragment(),
      cloneRange: () => document.createRange(),
      collapse: jest.fn(),
      compareBoundaryPoints: jest.fn(() => 0),
      comparePoint: jest.fn(() => 0),
      createContextualFragment: () => document.createDocumentFragment(),
      deleteContents: jest.fn(),
      detach: jest.fn(),
      extractContents: () => document.createDocumentFragment(),
      insertNode: jest.fn(),
      intersectsNode: jest.fn(() => false),
      isPointInRange: jest.fn(() => false),
      selectNode: jest.fn(),
      selectNodeContents: jest.fn(),
      setEndAfter: jest.fn(),
      setEndBefore: jest.fn(),
      setStartAfter: jest.fn(),
      setStartBefore: jest.fn(),
      surroundContents: jest.fn(),
      toString: () => '',
    } as any);
  }
  
  // Selection
  if (typeof window !== 'undefined' && !window.getSelection) {
    window.getSelection = () => ({
      anchorNode: null,
      anchorOffset: 0,
      focusNode: null,
      focusOffset: 0,
      isCollapsed: true,
      rangeCount: 0,
      type: 'None',
      addRange: jest.fn(),
      collapse: jest.fn(),
      collapseToEnd: jest.fn(),
      collapseToStart: jest.fn(),
      containsNode: jest.fn(() => false),
      deleteFromDocument: jest.fn(),
      empty: jest.fn(),
      extend: jest.fn(),
      getRangeAt: jest.fn(() => document.createRange()),
      modify: jest.fn(),
      removeAllRanges: jest.fn(),
      removeRange: jest.fn(),
      selectAllChildren: jest.fn(),
      setBaseAndExtent: jest.fn(),
      setPosition: jest.fn(),
      toString: () => '',
    } as any);
  }
}

/**
 * Setup comprehensive test environment
 */
export function setupTestEnvironment() {
  setupNodePolyfills();
  setupBrowserPolyfills();
  setupDOMPolyfills();
  
  // Suppress console warnings in tests unless explicitly needed
  const originalWarn = console.warn;
  const originalError = console.error;
  
  console.warn = jest.fn((message: any, ...args: any[]) => {
    // Only show warnings that are test-relevant
    const messageStr = String(message || '');
    if (messageStr.includes('Warning: ') && !messageStr.includes('act(')) {
      originalWarn(message, ...args);
    }
  });
  
  console.error = jest.fn((message: any, ...args: any[]) => {
    // Only show errors that are test-relevant
    const messageStr = String(message || '');
    if (!messageStr.includes('Warning: ') && !messageStr.includes('The above error occurred')) {
      originalError(message, ...args);
    }
  });
  
  return {
    restore: () => {
      console.warn = originalWarn;
      console.error = originalError;
    },
  };
}

/**
 * Clean up test environment
 */
export function cleanupTestEnvironment() {
  // Clear all timers
  jest.clearAllTimers();
  
  // Reset all mocks
  jest.clearAllMocks();
  
  // Clean up DOM
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
  
  // Clean up global state (skip location reset to avoid JSDOM issues)
  if (typeof window !== 'undefined') {
    // Only reset location if it's safe to do so
    try {
      if (window.location && typeof window.location.href === 'string') {
        // Location is working, leave it alone
      }
    } catch (e) {
      // Location is broken, try to fix it
      try {
        Object.defineProperty(window, 'location', {
          value: {
            href: 'http://localhost:3000',
            origin: 'http://localhost:3000',
            protocol: 'http:',
            host: 'localhost:3000',
            hostname: 'localhost',
            port: '3000',
            pathname: '/',
            search: '',
            hash: '',
            assign: jest.fn(),
            replace: jest.fn(),
            reload: jest.fn(),
            toString: () => 'http://localhost:3000',
          },
          writable: true,
          configurable: true,
        });
      } catch (e2) {
        // Can't fix location, ignore
      }
    }
  }
}