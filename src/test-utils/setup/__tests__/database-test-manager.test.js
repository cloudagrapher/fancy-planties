/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('DatabaseTestManager', () => {
  let DatabaseTestManager;
  let createDatabaseTestManager;
  let globalDatabaseTestManager;
  let mockDb;
  let mockUsers;
  let mockSessions;
  let mockEmailVerificationCodes;
  let mockEq;

  beforeAll(async () => {
    // Mock the database module
    mockDb = {
      insert: jest.fn(),
      select: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    // Mock the schema
    mockUsers = { id: 'users.id', email: 'users.email' };
    mockSessions = { id: 'sessions.id', userId: 'sessions.userId' };
    mockEmailVerificationCodes = { id: 'emailVerificationCodes.id', userId: 'emailVerificationCodes.userId' };

    // Mock drizzle-orm
    mockEq = jest.fn((field, value) => ({ field, value, type: 'eq' }));

    // Set up module mocks
    jest.doMock('../../../lib/db', () => ({
      db: mockDb
    }));

    jest.doMock('../../../lib/db/schema', () => ({
      users: mockUsers,
      sessions: mockSessions,
      emailVerificationCodes: mockEmailVerificationCodes
    }));

    jest.doMock('drizzle-orm', () => ({
      eq: mockEq
    }));

    // Import the module after mocking
    const module = await import('../database-test-manager.js');
    DatabaseTestManager = module.default;
    createDatabaseTestManager = module.createDatabaseTestManager;
    globalDatabaseTestManager = module.globalDatabaseTestManager;
  });

  let manager;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockEq.mockClear();
    
    // Create fresh manager instance
    manager = new DatabaseTestManager();
    
    // Setup mock database responses with proper chaining
    mockDb.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn()
      })
    });
    
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn(),
        limit: jest.fn()
      })
    });
    
    mockDb.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn()
        })
      })
    });
    
    mockDb.delete.mockReturnValue({
      where: jest.fn()
    });
  });

  afterEach(async () => {
    // Clean up any test data
    if (manager) {
      // Mock the cleanup to avoid actual database calls
      manager.createdUsers = [];
      manager.createdSessions = [];
      manager.createdEmailCodes = [];
    }
  });

  describe('Constructor', () => {
    it('should initialize with empty tracking arrays', () => {
      const newManager = new DatabaseTestManager();
      
      expect(newManager.createdUsers).toEqual([]);
      expect(newManager.createdSessions).toEqual([]);
      expect(newManager.createdEmailCodes).toEqual([]);
    });
  });

  describe('createTestUser', () => {
    it('should create a user and track the ID', async () => {
      const userData = { email: 'test@example.com', name: 'Test User' };
      const mockUser = { id: 1, ...userData };
      
      // Setup mock chain
      const mockReturning = jest.fn().mockResolvedValue([mockUser]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      mockDb.insert.mockReturnValue({ values: mockValues });
      
      const result = await manager.createTestUser(userData);
      
      expect(mockDb.insert).toHaveBeenCalledWith(mockUsers);
      expect(mockValues).toHaveBeenCalledWith(userData);
      expect(mockReturning).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
      expect(manager.createdUsers).toContain(1);
    });

    it('should handle database errors gracefully', async () => {
      const userData = { email: 'test@example.com', name: 'Test User' };
      const mockError = new Error('Database connection failed');
      
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockRejectedValue(mockError)
        })
      });
      
      await expect(manager.createTestUser(userData)).rejects.toThrow('Database connection failed');
      expect(manager.createdUsers).toEqual([]);
    });
  });

  describe('createTestSession', () => {
    it('should create a session and track the ID', async () => {
      const sessionData = { userId: 1, expiresAt: new Date() };
      const mockSession = { id: 'session-123', ...sessionData };
      
      const mockReturning = jest.fn().mockResolvedValue([mockSession]);
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({ returning: mockReturning })
      });
      
      const result = await manager.createTestSession(sessionData);
      
      expect(mockDb.insert).toHaveBeenCalledWith(mockSessions);
      expect(result).toEqual(mockSession);
      expect(manager.createdSessions).toContain('session-123');
    });
  });

  describe('createTestEmailCode', () => {
    it('should create an email verification code and track the ID', async () => {
      const codeData = { userId: 1, code: '123456', expiresAt: new Date() };
      const mockCode = { id: 1, ...codeData };
      
      const mockReturning = jest.fn().mockResolvedValue([mockCode]);
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({ returning: mockReturning })
      });
      
      const result = await manager.createTestEmailCode(codeData);
      
      expect(mockDb.insert).toHaveBeenCalledWith(mockEmailVerificationCodes);
      expect(result).toEqual(mockCode);
      expect(manager.createdEmailCodes).toContain(1);
    });
  });

  describe('getUserById', () => {
    it('should retrieve a user by ID', async () => {
      const mockUser = { id: 1, email: 'test@example.com' };
      
      const mockWhere = jest.fn().mockResolvedValue([mockUser]);
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: mockWhere
        })
      });
      
      const result = await manager.getUserById(1);
      
      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      const mockWhere = jest.fn().mockResolvedValue([]);
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: mockWhere
        })
      });
      
      const result = await manager.getUserById(999);
      
      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should retrieve a user by email', async () => {
      const mockUser = { id: 1, email: 'test@example.com' };
      
      const mockWhere = jest.fn().mockResolvedValue([mockUser]);
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: mockWhere
        })
      });
      
      const result = await manager.getUserByEmail('TEST@EXAMPLE.COM');
      
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      const mockWhere = jest.fn().mockResolvedValue([]);
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: mockWhere
        })
      });
      
      const result = await manager.getUserByEmail('nonexistent@example.com');
      
      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update a user and return the updated record', async () => {
      const updates = { email: 'newemail@example.com' };
      const mockUpdatedUser = { id: 1, ...updates, updatedAt: expect.any(Date) };
      
      const mockReturning = jest.fn().mockResolvedValue([mockUpdatedUser]);
      const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      mockDb.update.mockReturnValue({ set: mockSet });
      
      const result = await manager.updateUser(1, updates);
      
      expect(mockDb.update).toHaveBeenCalledWith(mockUsers);
      expect(mockSet).toHaveBeenCalledWith({
        ...updates,
        updatedAt: expect.any(Date)
      });
      expect(result).toEqual(mockUpdatedUser);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user and remove from tracking', async () => {
      // Add user to tracking first
      manager.createdUsers.push(1);
      
      const mockWhere = jest.fn().mockResolvedValue();
      mockDb.delete.mockReturnValue({ where: mockWhere });
      
      await manager.deleteUser(1);
      
      expect(mockDb.delete).toHaveBeenCalledWith(mockUsers);
      expect(manager.createdUsers).not.toContain(1);
    });
  });

  describe('deleteSession', () => {
    it('should delete a session and remove from tracking', async () => {
      // Add session to tracking first
      manager.createdSessions.push('session-123');
      
      const mockWhere = jest.fn().mockResolvedValue();
      mockDb.delete.mockReturnValue({ where: mockWhere });
      
      await manager.deleteSession('session-123');
      
      expect(mockDb.delete).toHaveBeenCalledWith(mockSessions);
      expect(manager.createdSessions).not.toContain('session-123');
    });
  });

  describe('deleteEmailCode', () => {
    it('should delete an email code and remove from tracking', async () => {
      // Add code to tracking first
      manager.createdEmailCodes.push(1);
      
      const mockWhere = jest.fn().mockResolvedValue();
      mockDb.delete.mockReturnValue({ where: mockWhere });
      
      await manager.deleteEmailCode(1);
      
      expect(mockDb.delete).toHaveBeenCalledWith(mockEmailVerificationCodes);
      expect(manager.createdEmailCodes).not.toContain(1);
    });
  });

  describe('cleanup', () => {
    it('should reset tracking arrays when cleanup is called', async () => {
      // Setup tracking data
      manager.createdUsers = [1, 2];
      manager.createdSessions = ['session-1', 'session-2'];
      manager.createdEmailCodes = [1, 2];
      
      const mockWhere = jest.fn().mockResolvedValue();
      mockDb.delete.mockReturnValue({ where: mockWhere });
      
      await manager.cleanup();
      
      // Verify arrays are reset
      expect(manager.createdUsers).toEqual([]);
      expect(manager.createdSessions).toEqual([]);
      expect(manager.createdEmailCodes).toEqual([]);
    });

    it('should reset tracking arrays even if cleanup fails', async () => {
      // Setup tracking data
      manager.createdUsers = [1];
      manager.createdSessions = ['session-1'];
      manager.createdEmailCodes = [1];
      
      // Mock database error
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockRejectedValue(new Error('Database error'))
      });
      
      // Spy on console.error to verify error logging
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await manager.cleanup();
      
      // Verify arrays are reset despite error
      expect(manager.createdUsers).toEqual([]);
      expect(manager.createdSessions).toEqual([]);
      expect(manager.createdEmailCodes).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Database cleanup error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('isConnected', () => {
    it('should return true when database connection works', async () => {
      const mockLimit = jest.fn().mockResolvedValue([]);
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          limit: mockLimit
        })
      });
      
      const result = await manager.isConnected();
      
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockLimit).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    it('should return false when database connection fails', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          limit: jest.fn().mockRejectedValue(new Error('Connection failed'))
        })
      });
      
      // Spy on console.error to verify error logging
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = await manager.isConnected();
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Database connection test failed:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Factory Functions', () => {
    describe('createDatabaseTestManager', () => {
      it('should create a new DatabaseTestManager instance', () => {
        const manager1 = createDatabaseTestManager();
        const manager2 = createDatabaseTestManager();
        
        expect(manager1).toBeInstanceOf(DatabaseTestManager);
        expect(manager2).toBeInstanceOf(DatabaseTestManager);
        expect(manager1).not.toBe(manager2); // Different instances
      });
    });

    describe('globalDatabaseTestManager', () => {
      it('should provide a singleton instance', () => {
        expect(globalDatabaseTestManager).toBeInstanceOf(DatabaseTestManager);
      });
    });
  });

  describe('Tracking Functionality', () => {
    it('should properly track multiple operations', async () => {
      const userData1 = { email: 'test1@example.com', name: 'Test User 1' };
      const userData2 = { email: 'test2@example.com', name: 'Test User 2' };
      const mockUser1 = { id: 1, ...userData1 };
      const mockUser2 = { id: 2, ...userData2 };
      
      // Mock user creation
      let callCount = 0;
      const mockReturning = jest.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve(callCount === 1 ? [mockUser1] : [mockUser2]);
      });
      
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({ returning: mockReturning })
      });
      
      // Create users
      await manager.createTestUser(userData1);
      await manager.createTestUser(userData2);
      
      expect(manager.createdUsers).toEqual(expect.arrayContaining([1, 2]));
      expect(manager.createdUsers).toHaveLength(2);
    });

    it('should handle session management for user', async () => {
      const sessionData1 = { userId: 1, expiresAt: new Date() };
      const sessionData2 = { userId: 1, expiresAt: new Date() };
      const mockSession1 = { id: 'session-1', ...sessionData1 };
      const mockSession2 = { id: 'session-2', ...sessionData2 };
      
      // Mock session creation
      let callCount = 0;
      const mockReturning = jest.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve(callCount === 1 ? [mockSession1] : [mockSession2]);
      });
      
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({ returning: mockReturning })
      });
      
      // Create sessions
      await manager.createTestSession(sessionData1);
      await manager.createTestSession(sessionData2);
      
      expect(manager.createdSessions).toEqual(['session-1', 'session-2']);
    });
  });

  describe('Error Handling', () => {
    it('should maintain data integrity during partial failures', async () => {
      // Setup: create some successful records first
      manager.createdUsers = [1];
      manager.createdSessions = ['session-1'];
      manager.createdEmailCodes = [1];
      
      // Mock partial failure during cleanup
      let callCount = 0;
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 2) { // Fail on second call
            throw new Error('Session cleanup failed');
          }
          return Promise.resolve();
        })
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await manager.cleanup();
      
      // Verify arrays are still reset despite partial failure
      expect(manager.createdUsers).toEqual([]);
      expect(manager.createdSessions).toEqual([]);
      expect(manager.createdEmailCodes).toEqual([]);
      
      consoleSpy.mockRestore();
    });
  });
});