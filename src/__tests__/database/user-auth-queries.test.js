/**
 * User and Authentication Database Query Tests
 * Tests user creation, retrieval, session management, and password operations
 */

import {
  createUser,
  getUserByEmail,
  getUserById,
  hashPassword,
  verifyPassword,
  signIn,
  signUp,
  createSession,
  invalidateSession,
} from '../../lib/auth';
import { createDatabaseTestManager } from '../../test-utils/setup/database-test-manager';
import { createTestUser, createTestUserWithPassword, hashTestPassword } from '../../test-utils/factories/user-factory';

describe('User and Authentication Database Queries', () => {
  let dbManager;

  beforeEach(() => {
    dbManager = createDatabaseTestManager();
  });

  afterEach(async () => {
    await dbManager.cleanup();
  });

  describe('User Creation and Retrieval', () => {
    test('should create a new user with hashed password', async () => {
      const email = 'test@example.com';
      const password = 'testpassword123';
      const name = 'Test User';

      const user = await createUser(email, password, name);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(email.toLowerCase());
      expect(user.name).toBe(name);
      expect(user.hashedPassword).toBeDefined();
      expect(user.hashedPassword).not.toBe(password); // Should be hashed
      expect(user.isCurator).toBe(false);
      expect(user.isEmailVerified).toBe(false);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);

      // Track for cleanup
      dbManager.createdUsers.push(user.id);
    });

    test('should retrieve user by email (case insensitive)', async () => {
      const testUser = createTestUser({
        email: 'Test@Example.COM',
      });
      
      const createdUser = await dbManager.createTestUser(testUser);

      // Test case insensitive retrieval
      const foundUser1 = await getUserByEmail('test@example.com');
      const foundUser2 = await getUserByEmail('TEST@EXAMPLE.COM');
      const foundUser3 = await getUserByEmail('Test@Example.COM');

      expect(foundUser1).toBeDefined();
      expect(foundUser2).toBeDefined();
      expect(foundUser3).toBeDefined();
      expect(foundUser1.id).toBe(createdUser.id);
      expect(foundUser2.id).toBe(createdUser.id);
      expect(foundUser3.id).toBe(createdUser.id);
    });

    test('should return null for non-existent email', async () => {
      const user = await getUserByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });

    test('should retrieve user by ID', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const foundUser = await getUserById(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(createdUser.id);
      expect(foundUser.email).toBe(createdUser.email);
      expect(foundUser.name).toBe(createdUser.name);
    });

    test('should return null for non-existent user ID', async () => {
      const user = await getUserById(99999);
      expect(user).toBeNull();
    });

    test('should prevent duplicate email registration', async () => {
      const email = 'duplicate@example.com';
      
      // Create first user
      await createUser(email, 'password1', 'User 1');
      
      // Attempt to create second user with same email should fail
      await expect(createUser(email, 'password2', 'User 2')).rejects.toThrow();
    });
  });

  describe('Password Hashing and Verification', () => {
    test('should hash passwords securely', async () => {
      const password = 'testpassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).toBeDefined();
      expect(hash2).toBeDefined();
      expect(hash1).not.toBe(password);
      expect(hash2).not.toBe(password);
      expect(hash1).not.toBe(hash2); // Should use salt, so hashes differ
      expect(hash1.length).toBeGreaterThan(50); // bcrypt hashes are long
    });

    test('should verify correct passwords', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect passwords', async () => {
      const password = 'testpassword123';
      const wrongPassword = 'wrongpassword';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    test('should handle empty passwords gracefully', async () => {
      const hash = await hashPassword('validpassword');
      
      const isValid = await verifyPassword('', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('Session Management', () => {
    test('should create session for user', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const session = await createSession(createdUser.id);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.userId).toBe(createdUser.id);
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());

      // Track for cleanup
      dbManager.createdSessions.push(session.id);
    });

    test('should retrieve session by ID', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);
      const session = await createSession(createdUser.id);
      dbManager.createdSessions.push(session.id);

      const foundSession = await dbManager.getSessionById(session.id);

      expect(foundSession).toBeDefined();
      expect(foundSession.id).toBe(session.id);
      expect(foundSession.userId).toBe(createdUser.id);
    });

    test('should retrieve sessions by user ID', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);
      
      // Create multiple sessions for the user
      const session1 = await createSession(createdUser.id);
      const session2 = await createSession(createdUser.id);
      dbManager.createdSessions.push(session1.id, session2.id);

      const userSessions = await dbManager.getSessionsByUserId(createdUser.id);

      expect(userSessions).toHaveLength(2);
      expect(userSessions.map(s => s.id)).toContain(session1.id);
      expect(userSessions.map(s => s.id)).toContain(session2.id);
    });

    test('should invalidate session', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);
      const session = await createSession(createdUser.id);
      dbManager.createdSessions.push(session.id);

      // Verify session exists
      let foundSession = await dbManager.getSessionById(session.id);
      expect(foundSession).toBeDefined();

      // Invalidate session
      await invalidateSession(session.id);

      // Session should no longer exist
      foundSession = await dbManager.getSessionById(session.id);
      expect(foundSession).toBeNull();
    });
  });

  describe('Authentication Flows', () => {
    test('should sign in with valid credentials', async () => {
      const email = 'signin@example.com';
      const password = 'testpassword123';
      const name = 'Sign In User';

      // Create user first
      const user = await createUser(email, password, name);
      dbManager.createdUsers.push(user.id);

      // Attempt sign in
      const result = await signIn(email, password);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.session).toBeDefined();
      expect(result.user.id).toBe(user.id);
      expect(result.user.email).toBe(email.toLowerCase());
      expect(result.session.userId).toBe(user.id);
      expect(result.session.id).toBeDefined();

      // Track session for cleanup
      dbManager.createdSessions.push(result.session.id);
    });

    test('should reject sign in with invalid email', async () => {
      const result = await signIn('nonexistent@example.com', 'password');
      expect(result).toBeNull();
    });

    test('should reject sign in with invalid password', async () => {
      const email = 'signin2@example.com';
      const password = 'correctpassword';
      const wrongPassword = 'wrongpassword';

      // Create user
      const user = await createUser(email, password, 'Test User');
      dbManager.createdUsers.push(user.id);

      // Attempt sign in with wrong password
      const result = await signIn(email, wrongPassword);
      expect(result).toBeNull();
    });

    test('should sign up new user successfully', async () => {
      const email = 'signup@example.com';
      const password = 'testpassword123';
      const name = 'Sign Up User';

      const result = await signUp(email, password, name);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.session).toBeDefined();
      expect(result.user.email).toBe(email.toLowerCase());
      expect(result.user.name).toBe(name);
      expect(result.session.userId).toBe(result.user.id);

      // Track for cleanup
      dbManager.createdUsers.push(result.user.id);
      dbManager.createdSessions.push(result.session.id);
    });

    test('should reject sign up with existing email', async () => {
      const email = 'existing@example.com';
      const password = 'testpassword123';

      // Create first user
      const user1 = await createUser(email, password, 'First User');
      dbManager.createdUsers.push(user1.id);

      // Attempt to sign up with same email
      await expect(signUp(email, password, 'Second User')).rejects.toThrow('User already exists');
    });

    test('should handle case insensitive email in sign in', async () => {
      const email = 'CaseTest@Example.COM';
      const password = 'testpassword123';

      // Create user with mixed case email
      const user = await createUser(email, password, 'Case Test User');
      dbManager.createdUsers.push(user.id);

      // Sign in with different case
      const result = await signIn('casetest@example.com', password);

      expect(result).toBeDefined();
      expect(result.user.id).toBe(user.id);

      // Track session for cleanup
      dbManager.createdSessions.push(result.session.id);
    });
  });

  describe('Email Verification Code Management', () => {
    test('should create and retrieve email verification codes', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const codeData = {
        userId: createdUser.id,
        code: '123456',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        attemptsUsed: 0,
      };

      const createdCode = await dbManager.createTestEmailCode(codeData);

      expect(createdCode).toBeDefined();
      expect(createdCode.userId).toBe(createdUser.id);
      expect(createdCode.code).toBe('123456');
      expect(createdCode.expiresAt).toBeInstanceOf(Date);

      // Retrieve codes for user
      const userCodes = await dbManager.getEmailCodesByUserId(createdUser.id);
      expect(userCodes).toHaveLength(1);
      expect(userCodes[0].id).toBe(createdCode.id);
    });

    test('should handle multiple verification codes for user', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      // Create multiple codes (simulating code regeneration)
      const code1 = await dbManager.createTestEmailCode({
        userId: createdUser.id,
        code: '111111',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        attemptsUsed: 0,
      });

      const code2 = await dbManager.createTestEmailCode({
        userId: createdUser.id,
        code: '222222',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        attemptsUsed: 0,
      });

      const userCodes = await dbManager.getEmailCodesByUserId(createdUser.id);
      expect(userCodes).toHaveLength(2);
      expect(userCodes.map(c => c.code)).toContain('111111');
      expect(userCodes.map(c => c.code)).toContain('222222');
    });
  });

  describe('Database Connection and Error Handling', () => {
    test('should verify database connection is working', async () => {
      const isConnected = await dbManager.isConnected();
      expect(isConnected).toBe(true);
    });

    test('should handle database constraint violations gracefully', async () => {
      const email = 'constraint@example.com';
      
      // Create first user
      const user1 = await createUser(email, 'password1', 'User 1');
      dbManager.createdUsers.push(user1.id);

      // Attempt to create duplicate should throw error
      await expect(createUser(email, 'password2', 'User 2')).rejects.toThrow();
    });
  });
});