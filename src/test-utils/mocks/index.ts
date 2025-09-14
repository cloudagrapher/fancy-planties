// Test mocks - centralized exports

// Re-export all mock utilities
export * from './api-mocks';
export * from './component-mocks'; // Now exports TypeScript version
export * from './service-mocks';
export * from './lucia-mock';
export * from './nextjs-mocks';
export * from './oslo-mock';
export * from './validation-mocks';

// Enhanced API testing utilities
export {
  ApiTestHelper,
  AuthTestHelper,
  DatabaseTestHelper,
  apiHelper,
  authHelper,
  dbHelper,
  apiResponsePatterns,
  databaseTestHelpers,
} from '../helpers/api-helpers';

// Common mock configurations
export const COMMON_MOCK_CONFIGS = {
  // Standard success response
  SUCCESS_RESPONSE: {
    success: true,
    message: 'Operation completed successfully',
  },
  
  // Standard error response
  ERROR_RESPONSE: {
    success: false,
    error: 'An error occurred',
    code: 'ERROR',
  },
  
  // Authentication required response
  AUTH_REQUIRED_RESPONSE: {
    success: false,
    error: 'Authentication required',
    code: 'UNAUTHORIZED',
  },
  
  // Validation error response
  VALIDATION_ERROR_RESPONSE: {
    success: false,
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details: [],
  },
  
  // Not found response
  NOT_FOUND_RESPONSE: {
    success: false,
    error: 'Resource not found',
    code: 'NOT_FOUND',
  },
} as const;

// Mock setup utilities
export const setupAllMocks = () => {
  try {
    const { applyCommonMocks } = require('./component-mocks');
    const { applyAllAPIMocks } = require('./api-mocks');
    const { applyAllServiceMocks } = require('./service-mocks');
    
    applyCommonMocks();
    applyAllServiceMocks();
    return applyAllAPIMocks();
  } catch (error) {
    console.warn('Could not setup all mocks:', error);
    return null;
  }
};

export const resetAllMocks = () => {
  // Reset API mocks
  try {
    const { resetApiMocks } = require('../helpers/api-helpers');
    resetApiMocks();
  } catch (error) {
    console.warn('Could not reset API mocks:', error);
  }
  
  // Reset component mocks
  try {
    const { resetComponentMocks } = require('./component-mocks');
    resetComponentMocks();
  } catch (error) {
    console.warn('Could not reset component mocks:', error);
  }
  
  // Reset service mocks
  try {
    const { resetServiceMocks } = require('./service-mocks');
    resetServiceMocks();
  } catch (error) {
    console.warn('Could not reset service mocks:', error);
  }
  
  // Clear all Jest mocks
  jest.clearAllMocks();
  jest.restoreAllMocks();
};