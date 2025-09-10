// Test utilities - main entry point for all test helpers

// Re-export all test utilities for easy importing
export * from './setup';
export * from './factories';
export * from './helpers';
export * from './mocks';
export * from './performance';
export * from './debugging';

// Common test patterns and utilities
export const TEST_CONSTANTS = {
  DEFAULT_TIMEOUT: 15000,
  ANIMATION_TIMEOUT: 300,
  API_TIMEOUT: 5000,
  MOCK_USER_ID: 1,
  MOCK_SESSION_ID: 'test-session-123',
};

// Test environment helpers
export const isTestEnvironment = () => process.env.NODE_ENV === 'test';
export const isCI = () => Boolean(process.env.CI);

// Comprehensive test setup function
export const setupTest = () => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset DOM
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
  
  // Reset timers
  jest.clearAllTimers();
  
  // Reset factory counters
  const { resetAllFactoryCounters } = require('./factories');
  resetAllFactoryCounters();
  
  // Reset component mocks
  const { resetComponentMocks } = require('./mocks/component-mocks');
  resetComponentMocks();
  
  // Reset API mocks
  const { resetApiMocks } = require('./helpers/api-helpers');
  resetApiMocks();
};

// Comprehensive test cleanup function
export const cleanupTest = () => {
  // Clear timers
  jest.clearAllTimers();
  
  // Restore all mocks
  jest.restoreAllMocks();
  
  // Reset service mocks
  const { resetServiceMocks } = require('./mocks/service-mocks');
  resetServiceMocks();
  
  // Reset test state
  const { resetTestState } = require('./helpers/render-helpers');
  resetTestState();
};

// Quick setup for common test scenarios
export const quickSetup = {
  /**
   * Setup for component testing with authenticated user
   */
  authenticatedComponent: () => {
    setupTest();
    const { createAuthenticatedTestUser } = require('./factories/user-factory');
    const { applyCommonMocks } = require('./mocks/component-mocks');
    
    applyCommonMocks();
    return createAuthenticatedTestUser();
  },

  /**
   * Setup for API testing with mocked responses
   */
  apiTesting: () => {
    setupTest();
    const { applyAllAPIMocks } = require('./mocks/api-mocks');
    const { mockBrowserAPIs } = require('./mocks/service-mocks');
    
    mockBrowserAPIs();
    return applyAllAPIMocks();
  },

  /**
   * Setup for integration testing with full mocks
   */
  integrationTesting: () => {
    setupTest();
    const { createAuthenticatedTestUser } = require('./factories/user-factory');
    const { applyCommonMocks } = require('./mocks/component-mocks');
    const { applyAllAPIMocks } = require('./mocks/api-mocks');
    const { applyAllServiceMocks } = require('./mocks/service-mocks');
    
    applyCommonMocks();
    applyAllServiceMocks();
    const apiMocks = applyAllAPIMocks();
    const { user, session } = createAuthenticatedTestUser();
    
    return { user, session, apiMocks };
  },
};