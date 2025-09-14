import { ApiTestHelper, AuthTestHelper, DatabaseTestHelper } from '../api-helpers';

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

describe('API Testing Utilities - Core Classes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all helpers
    ApiTestHelper.getInstance().reset();
    AuthTestHelper.getInstance().reset();
    DatabaseTestHelper.getInstance().reset();
  });

  describe('ApiTestHelper', () => {
    it('should be a singleton', () => {
      const instance1 = ApiTestHelper.getInstance();
      const instance2 = ApiTestHelper.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should mock API responses correctly', async () => {
      const helper = ApiTestHelper.getInstance();
      
      helper.mockApiResponse({
        'GET /api/test': { data: 'test response' },
      });

      const response = await fetch('/api/test');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toEqual('test response');
    });

    it('should track API call history', async () => {
      const helper = ApiTestHelper.getInstance();
      
      helper.mockApiResponse({
        'GET /api/test': { data: 'test' },
      });

      await fetch('/api/test');
      
      const calls = helper.getApiCalls();
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toContain('/api/test');
    });

    it('should reset correctly', () => {
      const helper = ApiTestHelper.getInstance();
      
      helper.mockApiResponse({
        'GET /api/test': { data: 'test' },
      });

      helper.reset();
      
      expect(helper.getApiCalls()).toHaveLength(0);
    });
  });

  describe('AuthTestHelper', () => {
    it('should be a singleton', () => {
      const instance1 = AuthTestHelper.getInstance();
      const instance2 = AuthTestHelper.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create auth headers correctly', () => {
      const helper = AuthTestHelper.getInstance();
      
      // Create a test user and session manually for this test
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
      
      const headers = helper.createAuthHeaders(testUser, testSession);
      
      expect(headers).toHaveProperty('Content-Type', 'application/json');
      expect(headers).toHaveProperty('Cookie');
      expect(headers).toHaveProperty('Authorization');
      expect(headers.Cookie).toContain('test-session-123');
      expect(headers.Authorization).toContain('test-session-123');
    });

    it('should reset correctly', () => {
      const helper = AuthTestHelper.getInstance();
      
      helper.mockAuthFunctions();
      helper.reset();
      
      expect(helper.getCurrentUser()).toBeNull();
      expect(helper.getCurrentSession()).toBeNull();
    });
  });

  describe('DatabaseTestHelper', () => {
    it('should be a singleton', () => {
      const instance1 = DatabaseTestHelper.getInstance();
      const instance2 = DatabaseTestHelper.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should mock database operations', () => {
      const helper = DatabaseTestHelper.getInstance();
      const mockDb = helper.mockDatabaseOperations();
      
      expect(mockDb).toHaveProperty('select');
      expect(mockDb).toHaveProperty('insert');
      expect(mockDb).toHaveProperty('update');
      expect(mockDb).toHaveProperty('delete');
    });

    it('should create mock transactions', () => {
      const helper = DatabaseTestHelper.getInstance();
      const transaction = helper.createMockTransaction();
      
      expect(transaction).toHaveProperty('rollback');
      expect(transaction).toHaveProperty('commit');
    });

    it('should reset correctly', () => {
      const helper = DatabaseTestHelper.getInstance();
      
      helper.mockDatabaseOperations();
      helper.reset();
      
      expect(helper.getTransactions()).toHaveLength(0);
    });
  });
});