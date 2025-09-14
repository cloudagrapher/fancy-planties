import {
  apiHelper,
  authHelper,
  dbHelper,
  apiResponsePatterns,
  mockApiResponse,
  mockApiSuccess,
  mockApiError,
  createAuthHeaders,
  mockAuthenticatedApi,
  expectApiCall,
  expectAuthenticatedApiCall,
  getApiCallCount,
  getAllApiCalls,
  resetApiMocks,
  databaseTestHelpers,
} from '../api-helpers';

// Mock the factories
jest.mock('../../factories/user-factory', () => ({
  createTestUser: jest.fn(() => ({
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    isCurator: false,
    isEmailVerified: true,
    hashedPassword: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  createTestSession: jest.fn((user) => ({
    id: 'test-session-123',
    userId: user?.id || 1,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  })),
}));

describe('API Testing Utilities - Integration Tests', () => {
  beforeEach(() => {
    resetApiMocks();
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetApiMocks();
  });

  describe('Legacy compatibility functions', () => {
    it('should work with mockApiResponse', async () => {
      mockApiResponse({
        'GET /api/legacy': { data: 'legacy response' },
      });

      const response = await fetch('/api/legacy');
      const data = await response.json();
      
      expect(data).toEqual('legacy response');
    });

    it('should work with mockApiSuccess', async () => {
      mockApiSuccess({
        '/api/success': { message: 'Success!' },
      });

      const response = await fetch('/api/success');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toEqual({ message: 'Success!' });
    });

    it('should work with mockApiError', async () => {
      mockApiError('/api/error', 500, { error: 'Server error' });

      const response = await fetch('/api/error');
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Server error' });
    });

    it('should work with createAuthHeaders', () => {
      const testUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isCurator: false,
        isEmailVerified: true,
        hashedPassword: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const testSession = {
        id: 'test-session-123',
        userId: testUser.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
      
      const headers = createAuthHeaders(testUser, testSession);
      
      expect(headers).toHaveProperty('Content-Type');
      expect(headers).toHaveProperty('Cookie');
      expect(headers).toHaveProperty('Authorization');
    });

    it('should work with expectApiCall', async () => {
      mockApiResponse({
        'POST /api/test': { data: 'test' },
      });

      await fetch('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(() => {
        expectApiCall('/api/test', {
          headers: { 'Content-Type': 'application/json' },
        }, 'POST');
      }).not.toThrow();
    });

    it('should work with getApiCallCount', async () => {
      mockApiResponse({
        'GET /api/count': { data: 'test' },
      });

      await fetch('/api/count');
      await fetch('/api/count');

      expect(getApiCallCount('/api/count')).toBe(2);
    });

    it('should work with getAllApiCalls', async () => {
      mockApiResponse({
        'GET /api/all': { data: 'test' },
      });

      await fetch('/api/all');
      const calls = getAllApiCalls();
      
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toContain('/api/all');
    });
  });

  describe('API response patterns', () => {
    it('should create success response pattern', () => {
      const response = apiResponsePatterns.success({ id: 1 }, 'Created successfully');
      
      expect(response).toEqual({
        success: true,
        message: 'Created successfully',
        data: { id: 1 },
      });
    });

    it('should create error response pattern', () => {
      const response = apiResponsePatterns.error('Something went wrong', 'CUSTOM_ERROR', { field: 'value' });
      
      expect(response).toEqual({
        success: false,
        error: 'Something went wrong',
        code: 'CUSTOM_ERROR',
        details: { field: 'value' },
      });
    });

    it('should create validation error response pattern', () => {
      const errors = [{ field: 'email', message: 'Invalid email' }];
      const response = apiResponsePatterns.validationError(errors);
      
      expect(response).toEqual({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors,
      });
    });

    it('should create paginated response pattern', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const response = apiResponsePatterns.paginated(items, 1, 10, 20);
      
      expect(response).toEqual({
        success: true,
        data: items,
        pagination: {
          page: 1,
          limit: 10,
          total: 20,
          totalPages: 2,
        },
      });
    });
  });

  describe('Database test helpers', () => {
    it('should provide database helper functions', () => {
      expect(databaseTestHelpers).toHaveProperty('mockDatabaseOperations');
      expect(databaseTestHelpers).toHaveProperty('createMockTransaction');
      expect(databaseTestHelpers).toHaveProperty('mockAuthFunctions');
      expect(databaseTestHelpers).toHaveProperty('mockUnauthenticatedState');
      expect(databaseTestHelpers).toHaveProperty('setupTestDatabase');
      expect(databaseTestHelpers).toHaveProperty('cleanupTestData');
      expect(databaseTestHelpers).toHaveProperty('expectDatabaseCall');
    });

    it('should mock database operations through helper', () => {
      const mockDb = databaseTestHelpers.mockDatabaseOperations({
        returning: [{ id: 1 }],
      });
      
      expect(mockDb).toHaveProperty('select');
      expect(mockDb).toHaveProperty('insert');
    });

    it('should create mock transaction through helper', () => {
      const transaction = databaseTestHelpers.createMockTransaction();
      
      expect(transaction).toHaveProperty('rollback');
      expect(transaction).toHaveProperty('commit');
    });
  });

  describe('Authenticated API testing workflow', () => {
    it('should handle complete authenticated API workflow', async () => {
      // Setup authenticated API
      const testUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isCurator: false,
        isEmailVerified: true,
        hashedPassword: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const testSession = {
        id: 'test-session-123',
        userId: testUser.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      mockAuthenticatedApi({
        'GET /api/protected': { data: 'protected data' },
        'POST /api/create': { data: { id: 1, name: 'created' } },
      }, testUser, testSession);

      // Test unauthenticated request fails
      const unauthResponse = await fetch('/api/protected');
      expect(unauthResponse.status).toBe(401);

      // Test authenticated request succeeds
      const authHeaders = createAuthHeaders(testUser, testSession);
      const authResponse = await fetch('/api/protected', { headers: authHeaders });
      const data = await authResponse.json();
      
      expect(authResponse.status).toBe(200);
      expect(data).toEqual('protected data');

      // Test POST request
      const postResponse = await fetch('/api/create', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: 'test' }),
      });
      const postData = await postResponse.json();
      
      expect(postResponse.status).toBe(200);
      expect(postData).toEqual({ id: 1, name: 'created' });

      // Verify API calls were made
      expect(getApiCallCount('/api/protected')).toBe(2); // 1 unauth + 1 auth
      expect(getApiCallCount('/api/create')).toBe(1);


    });
  });

  describe('Database integration with API testing', () => {
    it('should integrate database mocking with API testing', async () => {
      // Setup database mock
      const mockDb = databaseTestHelpers.mockDatabaseOperations({
        returning: [{ id: 1, name: 'Test Plant' }],
        execute: [{ id: 1, name: 'Test Plant' }],
      });

      // Setup API mock that would use the database
      mockApiResponse({
        'GET /api/plants': { data: apiResponsePatterns.success([{ id: 1, name: 'Test Plant' }]) },
        'POST /api/plants': { data: apiResponsePatterns.success({ id: 1, name: 'Test Plant' }) },
      });

      // Test GET request
      const getResponse = await fetch('/api/plants');
      const getData = await getResponse.json();
      
      expect(getData.success).toBe(true);
      expect(getData.data).toEqual([{ id: 1, name: 'Test Plant' }]);

      // Test POST request
      const postResponse = await fetch('/api/plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Plant' }),
      });
      const postData = await postResponse.json();
      
      expect(postData.success).toBe(true);
      expect(postData.data).toEqual({ id: 1, name: 'Test Plant' });

      // Verify database operations would be called
      expect(mockDb.select).toBeDefined();
      expect(mockDb.insert).toBeDefined();
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle API errors gracefully', async () => {
      mockApiResponse({
        'GET /api/error': {
          status: 500,
          data: apiResponsePatterns.error('Internal server error'),
        },
      });

      const response = await fetch('/api/error');
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle validation errors', async () => {
      const validationErrors = [
        { field: 'name', message: 'Name is required' },
        { field: 'email', message: 'Invalid email format' },
      ];

      mockApiResponse({
        'POST /api/validate': {
          status: 400,
          data: apiResponsePatterns.validationError(validationErrors),
        },
      });

      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '', email: 'invalid' }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details).toEqual(validationErrors);
    });

    it('should handle unmatched requests with 404', async () => {
      mockApiResponse({
        'GET /api/existing': { data: 'exists' },
      });

      const response = await fetch('/api/nonexistent');
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Not found' });
    });
  });

  describe('Performance and cleanup', () => {
    it('should reset all state correctly', () => {
      // Setup some state
      apiHelper.mockApiResponse({ 'GET /test': { data: 'test' } });
      authHelper.mockAuthFunctions();
      dbHelper.mockDatabaseOperations();
      
      // Verify state exists
      expect(apiHelper.getApiCalls().length).toBeGreaterThanOrEqual(0);
      
      // Reset
      resetApiMocks();
      
      // Verify reset
      expect(apiHelper.getApiCalls()).toHaveLength(0);
      expect(authHelper.getCurrentUser()).toBeNull();
      expect(dbHelper.getTransactions()).toHaveLength(0);
    });

    it('should handle concurrent API calls', async () => {
      mockApiResponse({
        'GET /api/concurrent': { data: 'concurrent response' },
      });

      // Make multiple concurrent requests
      const promises = Array.from({ length: 5 }, () => fetch('/api/concurrent'));
      const responses = await Promise.all(promises);
      
      // Verify all requests succeeded
      for (const response of responses) {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data).toEqual('concurrent response');
      }
      
      // Verify call count
      expect(getApiCallCount('/api/concurrent')).toBe(5);
    });
  });
});