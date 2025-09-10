// API test helpers

import { createTestUser, createTestSession } from '../factories/user-factory';

// Store original fetch for restoration
const originalFetch = global.fetch;

/**
 * Mock fetch responses for API testing
 * @param {Object} responses - Object mapping URL patterns to response data
 * @param {Object} options - Mock options
 */
export const mockApiResponse = (responses, options = {}) => {
  const { defaultStatus = 200, defaultHeaders = { 'Content-Type': 'application/json' } } = options;
  
  global.fetch = jest.fn((url, requestOptions = {}) => {
    const urlString = url.toString();
    const method = requestOptions.method || 'GET';
    
    // Find matching response pattern
    for (const [pattern, responseConfig] of Object.entries(responses)) {
      const [patternMethod, patternUrl] = pattern.includes(' ') 
        ? pattern.split(' ', 2) 
        : ['GET', pattern];
      
      if (method === patternMethod && urlString.includes(patternUrl)) {
        const response = typeof responseConfig === 'function' 
          ? responseConfig(url, requestOptions)
          : responseConfig;
        
        return Promise.resolve({
          ok: response.status ? response.status < 400 : true,
          status: response.status || defaultStatus,
          statusText: response.statusText || 'OK',
          headers: new Headers(response.headers || defaultHeaders),
          json: () => Promise.resolve(response.data || response),
          text: () => Promise.resolve(JSON.stringify(response.data || response)),
          blob: () => Promise.resolve(new Blob([JSON.stringify(response.data || response)])),
        });
      }
    }
    
    // Default 404 response for unmatched requests
    return Promise.resolve({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers(defaultHeaders),
      json: () => Promise.resolve({ error: 'Not found' }),
      text: () => Promise.resolve(JSON.stringify({ error: 'Not found' })),
    });
  });
};

/**
 * Mock API error responses
 * @param {string} urlPattern - URL pattern to match
 * @param {number} status - HTTP status code
 * @param {Object} errorData - Error response data
 * @param {string} method - HTTP method (default: 'GET')
 */
export const mockApiError = (urlPattern, status = 500, errorData = { error: 'Internal server error' }, method = 'GET') => {
  const pattern = `${method} ${urlPattern}`;
  
  mockApiResponse({
    [pattern]: {
      status,
      statusText: getStatusText(status),
      data: errorData,
    }
  });
};

/**
 * Mock successful API responses
 * @param {Object} responses - Object mapping URL patterns to success data
 */
export const mockApiSuccess = (responses) => {
  const successResponses = {};
  
  for (const [pattern, data] of Object.entries(responses)) {
    successResponses[pattern] = {
      status: 200,
      statusText: 'OK',
      data,
    };
  }
  
  mockApiResponse(successResponses);
};

/**
 * Create authenticated API request headers
 * @param {Object} user - User object (optional, will create test user if not provided)
 * @param {Object} session - Session object (optional, will create test session if not provided)
 * @returns {Object} Headers object with authentication
 */
export const createAuthHeaders = (user = null, session = null) => {
  const testUser = user || createTestUser();
  const testSession = session || createTestSession(testUser);
  
  return {
    'Content-Type': 'application/json',
    'Cookie': `auth-session=${testSession.id}`,
    'Authorization': `Bearer ${testSession.id}`,
  };
};

/**
 * Mock authenticated API requests
 * @param {Object} responses - Response configurations
 * @param {Object} user - User object for authentication
 * @param {Object} session - Session object for authentication
 */
export const mockAuthenticatedApi = (responses, user = null, session = null) => {
  const authHeaders = createAuthHeaders(user, session);
  
  global.fetch = jest.fn((url, requestOptions = {}) => {
    const urlString = url.toString();
    const method = requestOptions.method || 'GET';
    const hasAuthHeader = requestOptions.headers && 
      (requestOptions.headers['Cookie'] || requestOptions.headers['Authorization']);
    
    // Check if request has authentication
    if (!hasAuthHeader) {
      return Promise.resolve({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: () => Promise.resolve({ error: 'Authentication required' }),
        text: () => Promise.resolve(JSON.stringify({ error: 'Authentication required' })),
      });
    }
    
    // Find matching response
    for (const [pattern, responseConfig] of Object.entries(responses)) {
      const [patternMethod, patternUrl] = pattern.includes(' ') 
        ? pattern.split(' ', 2) 
        : ['GET', pattern];
      
      if (method === patternMethod && urlString.includes(patternUrl)) {
        const response = typeof responseConfig === 'function' 
          ? responseConfig(url, requestOptions)
          : responseConfig;
        
        return Promise.resolve({
          ok: response.status ? response.status < 400 : true,
          status: response.status || 200,
          statusText: response.statusText || 'OK',
          headers: new Headers(response.headers || { 'Content-Type': 'application/json' }),
          json: () => Promise.resolve(response.data || response),
          text: () => Promise.resolve(JSON.stringify(response.data || response)),
        });
      }
    }
    
    // Default 404 for unmatched authenticated requests
    return Promise.resolve({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () => Promise.resolve({ error: 'Endpoint not found' }),
      text: () => Promise.resolve(JSON.stringify({ error: 'Endpoint not found' })),
    });
  });
};

/**
 * Verify that an API call was made with expected parameters
 * @param {string} expectedUrl - Expected URL or URL pattern
 * @param {Object} expectedOptions - Expected request options
 * @param {string} method - Expected HTTP method
 */
export const expectApiCall = (expectedUrl, expectedOptions = {}, method = 'GET') => {
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining(expectedUrl),
    expect.objectContaining({
      method,
      ...expectedOptions,
    })
  );
};

/**
 * Verify that an authenticated API call was made
 * @param {string} expectedUrl - Expected URL or URL pattern
 * @param {Object} expectedOptions - Expected request options
 * @param {string} method - Expected HTTP method
 */
export const expectAuthenticatedApiCall = (expectedUrl, expectedOptions = {}, method = 'GET') => {
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining(expectedUrl),
    expect.objectContaining({
      method,
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
      }),
      ...expectedOptions,
    })
  );
};

/**
 * Verify that an API call was made with specific request body
 * @param {string} expectedUrl - Expected URL or URL pattern
 * @param {Object} expectedBody - Expected request body data
 * @param {string} method - Expected HTTP method
 */
export const expectApiCallWithBody = (expectedUrl, expectedBody, method = 'POST') => {
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining(expectedUrl),
    expect.objectContaining({
      method,
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(expectedBody),
    })
  );
};

/**
 * Get the number of times an API endpoint was called
 * @param {string} urlPattern - URL pattern to match
 * @param {string} method - HTTP method (optional)
 * @returns {number} Number of matching calls
 */
export const getApiCallCount = (urlPattern, method = null) => {
  if (!global.fetch || !global.fetch.mock) {
    return 0;
  }
  
  return global.fetch.mock.calls.filter(([url, options]) => {
    const urlMatches = url.toString().includes(urlPattern);
    const methodMatches = !method || (options && options.method === method) || (!options && method === 'GET');
    return urlMatches && methodMatches;
  }).length;
};

/**
 * Get all API calls made during testing
 * @returns {Array} Array of call information objects
 */
export const getAllApiCalls = () => {
  if (!global.fetch || !global.fetch.mock) {
    return [];
  }
  
  return global.fetch.mock.calls.map(([url, options = {}]) => ({
    url: url.toString(),
    method: options.method || 'GET',
    headers: options.headers || {},
    body: options.body ? JSON.parse(options.body) : null,
  }));
};

/**
 * Reset API mocks and restore original fetch
 */
export const resetApiMocks = () => {
  if (global.fetch && global.fetch.mockRestore) {
    global.fetch.mockRestore();
  }
  
  if (originalFetch) {
    global.fetch = originalFetch;
  }
  
  jest.clearAllMocks();
};

/**
 * Database test helpers for API testing
 */
export const databaseTestHelpers = {
  /**
   * Mock database operations for testing
   * @param {Object} mockData - Mock data to return from database operations
   */
  mockDatabaseOperations: (mockData = {}) => {
    // Mock common database operations
    const mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue(mockData.returning || []),
      execute: jest.fn().mockResolvedValue(mockData.execute || []),
    };
    
    // Mock the database module
    jest.doMock('@/lib/db', () => ({
      db: mockDb,
    }));
    
    return mockDb;
  },

  /**
   * Create test database transaction mock
   * @returns {Object} Mock transaction object
   */
  createMockTransaction: () => {
    return {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([]),
      execute: jest.fn().mockResolvedValue([]),
      rollback: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
    };
  },

  /**
   * Mock authentication functions for API testing
   * @param {Object} user - User object to return from auth functions
   * @param {Object} session - Session object to return from auth functions
   */
  mockAuthFunctions: (user = null, session = null) => {
    const testUser = user || createTestUser();
    const testSession = session || createTestSession(testUser);
    
    jest.doMock('@/lib/auth/server', () => ({
      validateRequest: jest.fn().mockResolvedValue({
        user: testUser,
        session: testSession,
      }),
      requireAuthSession: jest.fn().mockResolvedValue({
        user: testUser,
        session: testSession,
      }),
      isAuthenticated: jest.fn().mockResolvedValue(true),
    }));
    
    return { user: testUser, session: testSession };
  },

  /**
   * Mock unauthenticated state for API testing
   */
  mockUnauthenticatedState: () => {
    jest.doMock('@/lib/auth/server', () => ({
      validateRequest: jest.fn().mockResolvedValue({
        user: null,
        session: null,
      }),
      requireAuthSession: jest.fn().mockRejectedValue(new Error('Unauthorized')),
      isAuthenticated: jest.fn().mockResolvedValue(false),
    }));
  },
};

/**
 * Common API response patterns for testing
 */
export const apiResponsePatterns = {
  /**
   * Success response pattern
   * @param {*} data - Response data
   * @param {string} message - Success message
   */
  success: (data, message = 'Success') => ({
    success: true,
    message,
    data,
  }),

  /**
   * Error response pattern
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {*} details - Additional error details
   */
  error: (message, code = 'ERROR', details = null) => ({
    success: false,
    error: message,
    code,
    details,
  }),

  /**
   * Validation error response pattern
   * @param {Array} errors - Array of validation errors
   */
  validationError: (errors) => ({
    success: false,
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details: errors,
  }),

  /**
   * Paginated response pattern
   * @param {Array} items - Array of items
   * @param {number} page - Current page
   * @param {number} limit - Items per page
   * @param {number} total - Total number of items
   */
  paginated: (items, page = 1, limit = 10, total = null) => ({
    success: true,
    data: items,
    pagination: {
      page,
      limit,
      total: total || items.length,
      totalPages: Math.ceil((total || items.length) / limit),
    },
  }),
};

/**
 * Get HTTP status text for status codes
 * @param {number} status - HTTP status code
 * @returns {string} Status text
 */
function getStatusText(status) {
  const statusTexts = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    500: 'Internal Server Error',
  };
  
  return statusTexts[status] || 'Unknown';
}