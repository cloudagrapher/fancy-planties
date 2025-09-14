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
} as const;

// Test environment helpers
export const isTestEnvironment = (): boolean => process.env.NODE_ENV === 'test';
export const isCI = (): boolean => Boolean(process.env.CI);

// Comprehensive test setup function
export const setupTest = (): void => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset DOM
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
  
  // Reset timers
  jest.clearAllTimers();
  
  // Reset factory counters
  try {
    const { resetAllFactoryCounters } = require('./factories');
    resetAllFactoryCounters();
  } catch (error) {
    // Factory counters may not exist yet
  }
  
  // Reset component mocks
  try {
    const { resetComponentMocks } = require('./mocks/component-mocks');
    resetComponentMocks();
  } catch (error) {
    // Component mocks may not exist yet
  }
  
  // Reset API mocks
  try {
    const { resetApiMocks } = require('./helpers/api-helpers');
    resetApiMocks();
  } catch (error) {
    // API helpers may not exist yet
  }

  // Reset render helpers state
  try {
    const { resetTestState } = require('./helpers/render-helpers');
    resetTestState();
  } catch (error) {
    // Render helpers may not exist yet
  }
};

// Comprehensive test cleanup function
export const cleanupTest = (): void => {
  // Clear timers
  jest.clearAllTimers();
  
  // Restore all mocks
  jest.restoreAllMocks();
  
  // Reset service mocks
  try {
    const { resetServiceMocks } = require('./mocks/service-mocks');
    resetServiceMocks();
  } catch (error) {
    // Service mocks may not exist yet
  }
  
  // Reset test state
  try {
    const { resetTestState } = require('./helpers/render-helpers');
    resetTestState();
  } catch (error) {
    // Render helpers may not exist yet
  }
};

// Quick setup for common test scenarios
export const quickSetup = {
  /**
   * Setup for component testing with authenticated user
   */
  authenticatedComponent: () => {
    setupTest();
    try {
      const { createAuthenticatedTestUser } = require('./factories/user-factory');
      const { applyCommonMocks } = require('./mocks/component-mocks');
      
      applyCommonMocks();
      return createAuthenticatedTestUser();
    } catch (error) {
      console.warn('Could not setup authenticated component test:', error);
      return null;
    }
  },

  /**
   * Setup for API testing with mocked responses
   */
  apiTesting: () => {
    setupTest();
    try {
      const { applyAllAPIMocks } = require('./mocks/api-mocks');
      const { mockBrowserAPIs } = require('./mocks/service-mocks');
      
      mockBrowserAPIs();
      return applyAllAPIMocks();
    } catch (error) {
      console.warn('Could not setup API testing:', error);
      return null;
    }
  },

  /**
   * Setup for integration testing with full mocks
   */
  integrationTesting: () => {
    setupTest();
    try {
      const { createAuthenticatedTestUser } = require('./factories/user-factory');
      const { applyCommonMocks } = require('./mocks/component-mocks');
      const { applyAllAPIMocks } = require('./mocks/api-mocks');
      const { applyAllServiceMocks } = require('./mocks/service-mocks');
      
      applyCommonMocks();
      applyAllServiceMocks();
      const apiMocks = applyAllAPIMocks();
      const { user, session } = createAuthenticatedTestUser();
      
      return { user, session, apiMocks };
    } catch (error) {
      console.warn('Could not setup integration testing:', error);
      return null;
    }
  },

  /**
   * Setup for render testing with enhanced providers
   */
  renderTesting: () => {
    setupTest();
    try {
      const { setupTestEnvironment } = require('./helpers/render-helpers');
      return setupTestEnvironment();
    } catch (error) {
      console.warn('Could not setup render testing:', error);
      return null;
    }
  },

  /**
   * Setup for authenticated render testing
   */
  authenticatedRenderTesting: () => {
    setupTest();
    try {
      const { setupTestEnvironment } = require('./helpers/render-helpers');
      const { createAuthenticatedTestUser } = require('./factories/user-factory');
      
      const { user } = createAuthenticatedTestUser();
      return setupTestEnvironment({ user });
    } catch (error) {
      console.warn('Could not setup authenticated render testing:', error);
      return null;
    }
  },
};