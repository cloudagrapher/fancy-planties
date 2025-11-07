// Global test setup - only essential browser API mocks and Next.js integration
import '@testing-library/jest-dom';

// Load environment variables from .env.local for tests
import { loadEnvConfig } from '@next/env';
const projectDir = process.cwd();
loadEnvConfig(projectDir);

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

// Ensure NODE_ENV is set to test for database operations
process.env.NODE_ENV = 'test';

// Set DATABASE_URL for tests - require TEST_DATABASE_URL environment variable
// This ensures we don't accidentally use hardcoded credentials
if (!process.env.TEST_DATABASE_URL && !process.env.DATABASE_URL) {
  throw new Error(
    '❌ TEST_DATABASE_URL environment variable is required for tests.\n' +
    'Please create a .env.test.local file with:\n' +
    'TEST_DATABASE_URL=postgresql://postgres:your_password@localhost:5432/fancy_planties_test'
  );
}

// Use TEST_DATABASE_URL if set, otherwise fall back to DATABASE_URL from .env files
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

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