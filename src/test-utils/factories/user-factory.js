// User test data factory

import { generateRandomString } from 'oslo/crypto';
import bcrypt from 'bcryptjs';

// Counter for unique test data
let userCounter = 0;

/**
 * Creates a test user object with realistic data
 * @param {Object} overrides - Properties to override in the generated user
 * @returns {Object} Test user object
 */
export const createTestUser = (overrides = {}) => {
  userCounter++;
  
  const baseUser = {
    id: userCounter,
    email: `testuser${userCounter}@example.com`,
    name: `Test User ${userCounter}`,
    hashedPassword: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RQ/dQ5YQm', // 'password123'
    isCurator: false,
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  return {
    ...baseUser,
    ...overrides,
  };
};

/**
 * Creates a test user with admin/curator privileges
 * @param {Object} overrides - Properties to override
 * @returns {Object} Test curator user object
 */
export const createTestCurator = (overrides = {}) => {
  return createTestUser({
    isCurator: true,
    name: `Test Curator ${userCounter + 1}`,
    ...overrides,
  });
};

/**
 * Creates a test user with unverified email
 * @param {Object} overrides - Properties to override
 * @returns {Object} Test unverified user object
 */
export const createTestUnverifiedUser = (overrides = {}) => {
  return createTestUser({
    isEmailVerified: false,
    name: `Test Unverified User ${userCounter + 1}`,
    ...overrides,
  });
};

/**
 * Creates multiple test users
 * @param {number} count - Number of users to create
 * @param {Object} baseOverrides - Base properties to apply to all users
 * @returns {Array} Array of test user objects
 */
export const createTestUsers = (count = 3, baseOverrides = {}) => {
  return Array.from({ length: count }, (_, index) => 
    createTestUser({
      ...baseOverrides,
      name: `Test User ${userCounter + index + 1}`,
    })
  );
};

/**
 * Creates a test session object for a user
 * @param {Object} user - User object to create session for
 * @param {Object} overrides - Properties to override
 * @returns {Object} Test session object
 */
export const createTestSession = (user, overrides = {}) => {
  const sessionId = generateRandomString(40, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
  
  return {
    id: sessionId,
    userId: user.id,
    expiresAt,
    ...overrides,
  };
};

/**
 * Creates an authenticated test user with session
 * @param {Object} userOverrides - Properties to override for user
 * @param {Object} sessionOverrides - Properties to override for session
 * @returns {Object} Object with user and session properties
 */
export const createAuthenticatedTestUser = (userOverrides = {}, sessionOverrides = {}) => {
  const user = createTestUser(userOverrides);
  const session = createTestSession(user, sessionOverrides);
  
  return { user, session };
};

/**
 * Creates test email verification code
 * @param {Object} user - User object to create verification code for
 * @param {Object} overrides - Properties to override
 * @returns {Object} Test email verification code object
 */
export const createTestEmailVerificationCode = (user, overrides = {}) => {
  return {
    id: Math.floor(Math.random() * 10000),
    userId: user.id,
    code: generateRandomString(6, '0123456789'),
    expiresAt: new Date(Date.now() + 1000 * 60 * 15), // 15 minutes
    createdAt: new Date(),
    attemptsUsed: 0,
    ...overrides,
  };
};

/**
 * Hashes a password for testing (synchronous version for test setup)
 * @param {string} password - Plain text password
 * @returns {string} Hashed password
 */
export const hashTestPassword = (password) => {
  return bcrypt.hashSync(password, 12);
};

/**
 * Creates a test user with a specific password
 * @param {string} password - Plain text password
 * @param {Object} overrides - Properties to override
 * @returns {Object} Test user with hashed password
 */
export const createTestUserWithPassword = (password, overrides = {}) => {
  return createTestUser({
    hashedPassword: hashTestPassword(password),
    ...overrides,
  });
};

/**
 * Reset the user counter (useful for test isolation)
 */
export const resetUserCounter = () => {
  userCounter = 0;
};