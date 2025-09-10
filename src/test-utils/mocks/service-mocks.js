// Service mocking utilities

/**
 * Mock browser APIs for testing
 */
export const mockBrowserAPIs = () => {
  // Mock localStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    key: jest.fn(),
    length: 0,
  };
  
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  // Mock sessionStorage
  const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    key: jest.fn(),
    length: 0,
  };
  
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true,
  });

  // Mock navigator
  Object.defineProperty(navigator, 'vibrate', {
    value: jest.fn(),
    configurable: true,
    writable: true,
  });

  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      register: jest.fn().mockResolvedValue({}),
      ready: Promise.resolve({}),
      controller: null,
    },
    configurable: true,
    writable: true,
  });

  // Mock geolocation
  Object.defineProperty(navigator, 'geolocation', {
    value: {
      getCurrentPosition: jest.fn(),
      watchPosition: jest.fn(),
      clearWatch: jest.fn(),
    },
    configurable: true,
    writable: true,
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
  }));

  // Mock ResizeObserver
  global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
    writable: true,
  });

  return {
    localStorage: localStorageMock,
    sessionStorage: sessionStorageMock,
  };
};

/**
 * Mock file system operations
 */
export const mockFileSystem = () => {
  // Mock File API
  global.File = jest.fn().mockImplementation((fileBits, fileName, options) => ({
    name: fileName,
    size: fileBits.reduce((acc, bit) => acc + bit.length, 0),
    type: options?.type || 'text/plain',
    lastModified: Date.now(),
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
    text: jest.fn().mockResolvedValue(fileBits.join('')),
    stream: jest.fn(),
    slice: jest.fn(),
  }));

  // Mock FileReader
  global.FileReader = jest.fn().mockImplementation(() => ({
    readAsText: jest.fn(),
    readAsDataURL: jest.fn(),
    readAsArrayBuffer: jest.fn(),
    abort: jest.fn(),
    result: null,
    error: null,
    onload: null,
    onerror: null,
    onabort: null,
    onloadstart: null,
    onloadend: null,
    onprogress: null,
    readyState: 0,
    EMPTY: 0,
    LOADING: 1,
    DONE: 2,
  }));

  // Mock Blob
  global.Blob = jest.fn().mockImplementation((blobParts, options) => ({
    size: blobParts?.reduce((acc, part) => acc + part.length, 0) || 0,
    type: options?.type || '',
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
    text: jest.fn().mockResolvedValue(blobParts?.join('') || ''),
    stream: jest.fn(),
    slice: jest.fn(),
  }));

  // Mock URL.createObjectURL
  global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
  global.URL.revokeObjectURL = jest.fn();
};

/**
 * Mock performance APIs
 */
export const mockPerformanceAPIs = () => {
  // Mock performance.now
  Object.defineProperty(performance, 'now', {
    value: jest.fn().mockReturnValue(Date.now()),
    writable: true,
  });

  // Mock performance.mark
  Object.defineProperty(performance, 'mark', {
    value: jest.fn(),
    writable: true,
  });

  // Mock performance.measure
  Object.defineProperty(performance, 'measure', {
    value: jest.fn(),
    writable: true,
  });

  // Mock performance.getEntriesByType
  Object.defineProperty(performance, 'getEntriesByType', {
    value: jest.fn().mockReturnValue([]),
    writable: true,
  });
};

/**
 * Mock network-related APIs
 */
export const mockNetworkAPIs = () => {
  // Mock fetch (if not already mocked)
  if (!global.fetch) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({}),
      text: jest.fn().mockResolvedValue(''),
      blob: jest.fn().mockResolvedValue(new Blob()),
    });
  }

  // Mock WebSocket
  global.WebSocket = jest.fn().mockImplementation(() => ({
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    readyState: 1, // OPEN
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  }));

  // Mock EventSource
  global.EventSource = jest.fn().mockImplementation(() => ({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    close: jest.fn(),
    readyState: 1, // OPEN
    CONNECTING: 0,
    OPEN: 1,
    CLOSED: 2,
  }));
};

/**
 * Mock image-related APIs
 */
export const mockImageAPIs = () => {
  // Mock Image constructor
  global.Image = jest.fn().mockImplementation(() => ({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    src: '',
    alt: '',
    width: 0,
    height: 0,
    complete: true,
    naturalWidth: 100,
    naturalHeight: 100,
    onload: null,
    onerror: null,
  }));

  // Mock canvas APIs
  HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn().mockReturnValue({
      data: new Uint8ClampedArray(4),
      width: 1,
      height: 1,
    }),
    putImageData: jest.fn(),
    createImageData: jest.fn().mockReturnValue({
      data: new Uint8ClampedArray(4),
      width: 1,
      height: 1,
    }),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
  });

  HTMLCanvasElement.prototype.toDataURL = jest.fn().mockReturnValue('data:image/png;base64,mock');
  HTMLCanvasElement.prototype.toBlob = jest.fn().mockImplementation((callback) => {
    callback(new Blob(['mock'], { type: 'image/png' }));
  });
};

/**
 * Mock crypto APIs
 */
export const mockCryptoAPIs = () => {
  // Mock crypto.randomUUID
  Object.defineProperty(crypto, 'randomUUID', {
    value: jest.fn().mockReturnValue('mock-uuid-1234-5678-9012'),
    writable: true,
  });

  // Mock crypto.getRandomValues
  Object.defineProperty(crypto, 'getRandomValues', {
    value: jest.fn().mockImplementation((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }),
    writable: true,
  });
};

/**
 * Mock date and time APIs
 */
export const mockDateTimeAPIs = () => {
  // Mock Date.now to return consistent values
  const mockNow = jest.spyOn(Date, 'now').mockReturnValue(1640995200000); // 2022-01-01 00:00:00 UTC
  
  // Mock setTimeout and setInterval for testing
  jest.useFakeTimers();
  
  return {
    mockNow,
    advanceTime: (ms) => jest.advanceTimersByTime(ms),
    runAllTimers: () => jest.runAllTimers(),
    clearAllTimers: () => jest.clearAllTimers(),
    restoreTimers: () => jest.useRealTimers(),
  };
};

/**
 * Apply all common service mocks
 */
export const applyAllServiceMocks = () => {
  mockBrowserAPIs();
  mockFileSystem();
  mockPerformanceAPIs();
  mockNetworkAPIs();
  mockImageAPIs();
  mockCryptoAPIs();
  
  return mockDateTimeAPIs();
};

/**
 * Reset all service mocks
 */
export const resetServiceMocks = () => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  jest.useRealTimers();
  
  // Clear any global mocks
  delete global.fetch;
  delete global.WebSocket;
  delete global.EventSource;
  delete global.IntersectionObserver;
  delete global.ResizeObserver;
};