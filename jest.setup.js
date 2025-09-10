// Global test setup - only essential browser API mocks and Next.js integration
import '@testing-library/jest-dom';

// Essential Node.js polyfills for Jest environment
global.setImmediate = global.setImmediate || ((fn, ...args) => setTimeout(fn, 0, ...args));
global.clearImmediate = global.clearImmediate || ((id) => clearTimeout(id));

// Process environment setup
if (typeof global.process === 'undefined') {
  global.process = {
    env: { NODE_ENV: 'test' },
    nextTick: (fn) => setTimeout(fn, 0),
  };
}

// Essential Next.js mocks - moved to test-utils for better organization
jest.mock('next/navigation', () => require('./src/test-utils/mocks/nextjs-mocks').navigationMock);
jest.mock('next/image', () => require('./src/test-utils/mocks/nextjs-mocks').imageMock);
jest.mock('next/server', () => require('./src/test-utils/mocks/nextjs-mocks').serverMock);
jest.mock('next/headers', () => require('./src/test-utils/mocks/nextjs-mocks').headersMock);

// Essential browser API mocks
require('./src/test-utils/setup/browser-mocks');

// Component mocks are now handled per-test basis, not globally

// Global test cleanup - minimal and focused
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset DOM
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
});

afterEach(() => {
  // Clean up timers
  jest.clearAllTimers();
});