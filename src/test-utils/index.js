// Test utilities - main entry point for all test helpers

// Re-export all test utilities for easy importing
export * from './setup';
export * from './factories';
export * from './helpers';
export * from './mocks';

// Common test patterns and utilities
export const TEST_CONSTANTS = {
  DEFAULT_TIMEOUT: 15000,
  ANIMATION_TIMEOUT: 300,
  API_TIMEOUT: 5000,
};

// Test environment helpers
export const isTestEnvironment = () => process.env.NODE_ENV === 'test';
export const isCI = () => Boolean(process.env.CI);

// Common test setup function
export const setupTest = () => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset DOM
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
  
  // Reset timers
  jest.clearAllTimers();
};

// Common test cleanup function
export const cleanupTest = () => {
  // Clear timers
  jest.clearAllTimers();
  
  // Restore all mocks
  jest.restoreAllMocks();
};