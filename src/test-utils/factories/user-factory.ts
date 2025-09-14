// User test data factory
import * as bcrypt from 'bcryptjs';
import type { User, Session } from '@/lib/auth/client';
import type { NewUser, NewSession, NewEmailVerificationCode } from '@/lib/db/schema';

// Simple random string generator for tests (avoiding oslo dependency issues)
const generateRandomString = (length: number, alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'): string => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return result;
};

// Counter for unique test data
let userCounter = 0;

/**
 * Creates a test user object with realistic data
 * @param overrides - Properties to override in the generated user
 * @returns Test user object
 */
export const createTestUser = (overrides: Partial<NewUser> = {}): NewUser => {
  userCounter++;
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 10000);
  
  const baseUser: NewUser = {
    email: `testuser${userCounter}_${timestamp}_${randomSuffix}@example.com`,
    name: `Test User ${userCounter}`,
    hashedPassword: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RQ/dQ5YQm', // 'password123'
    isCurator: false,
    isEmailVerified: true,
  };
  
  return {
    ...baseUser,
    ...overrides,
  };
};

/**
 * Creates a test user with admin/curator privileges
 * @param overrides - Properties to override
 * @returns Test curator user object
 */
export const createTestCurator = (overrides: Partial<NewUser> = {}): NewUser => {
  return createTestUser({
    isCurator: true,
    name: `Test Curator ${userCounter + 1}`,
    ...overrides,
  });
};

/**
 * Creates a test user with unverified email
 * @param overrides - Properties to override
 * @returns Test unverified user object
 */
export const createTestUnverifiedUser = (overrides: Partial<NewUser> = {}): NewUser => {
  return createTestUser({
    isEmailVerified: false,
    name: `Test Unverified User ${userCounter + 1}`,
    ...overrides,
  });
};

/**
 * Creates multiple test users
 * @param count - Number of users to create
 * @param baseOverrides - Base properties to apply to all users
 * @returns Array of test user objects
 */
export const createTestUsers = (count = 3, baseOverrides: Partial<NewUser> = {}): NewUser[] => {
  return Array.from({ length: count }, (_, index) => 
    createTestUser({
      ...baseOverrides,
      name: `Test User ${userCounter + index + 1}`,
    })
  );
};

/**
 * Creates a test session object for a user
 * @param user - User object to create session for
 * @param overrides - Properties to override
 * @returns Test session object
 */
export const createTestSession = (user: { id: number }, overrides: Partial<NewSession> = {}): NewSession => {
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
 * @param userOverrides - Properties to override for user
 * @param sessionOverrides - Properties to override for session
 * @returns Object with user and session properties
 */
export const createAuthenticatedTestUser = (
  userOverrides: Partial<NewUser> = {}, 
  sessionOverrides: Partial<NewSession> = {}
): { user: NewUser & { id: number }; session: NewSession } => {
  const user = createTestUser(userOverrides);
  // For session creation, we need to assume the user has an ID
  const userWithId = { ...user, id: Math.floor(Math.random() * 10000) + 1 };
  const session = createTestSession(userWithId, sessionOverrides);
  
  return { user: userWithId, session };
};

/**
 * Creates test email verification code
 * @param user - User object to create verification code for
 * @param overrides - Properties to override
 * @returns Test email verification code object
 */
export const createTestEmailVerificationCode = (
  user: { id: number }, 
  overrides: Partial<NewEmailVerificationCode> = {}
): NewEmailVerificationCode => {
  return {
    userId: user.id,
    code: generateRandomString(6, '0123456789'),
    expiresAt: new Date(Date.now() + 1000 * 60 * 15), // 15 minutes
    attemptsUsed: 0,
    ...overrides,
  };
};

/**
 * Hashes a password for testing (synchronous version for test setup)
 * @param password - Plain text password
 * @returns Hashed password
 */
export const hashTestPassword = (password: string): string => {
  return bcrypt.hashSync(password, 12);
};

/**
 * Creates a test user with a specific password
 * @param password - Plain text password
 * @param overrides - Properties to override
 * @returns Test user with hashed password
 */
export const createTestUserWithPassword = (password: string, overrides: Partial<NewUser> = {}): NewUser => {
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

// Authentication helper functions for testing

/**
 * Creates a mock authenticated request context for testing
 * @param user - User to authenticate as
 * @param session - Session to use (optional, will create one if not provided)
 * @returns Mock request context with authentication
 */
export const createAuthenticatedContext = (
  user: User, 
  session?: Session
): { user: User; session: Session } => {
  const testSession = session || {
    id: generateRandomString(40),
    userId: user.id,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
  };
  
  return { user, session: testSession };
};

/**
 * Creates a mock request with authentication headers for testing
 * @param sessionId - Session ID to include in request
 * @param additionalHeaders - Additional headers to include
 * @returns Mock request object
 */
export const createAuthenticatedRequest = (
  sessionId: string,
  additionalHeaders: Record<string, string> = {}
): any => {
  // Create a mock request object for testing
  return {
    headers: {
      get: (name: string) => {
        const headers: Record<string, string> = {
          'Cookie': `auth_session=${sessionId}`,
          'Content-Type': 'application/json',
          ...additionalHeaders,
        };
        return headers[name] || null;
      },
    },
    method: 'GET',
    url: 'http://localhost:3000/test',
  };
};

/**
 * Creates test data for authentication flow testing
 * @param scenario - Type of authentication scenario to create
 * @returns Test data for the specified scenario
 */
export const createAuthTestScenario = (scenario: 'signup' | 'signin' | 'signout' | 'verify-email') => {
  const baseUser = createTestUser();
  const password = 'testpassword123';
  
  switch (scenario) {
    case 'signup':
      return {
        email: baseUser.email,
        password,
        name: baseUser.name,
        expectedUser: {
          ...baseUser,
          hashedPassword: hashTestPassword(password),
          isEmailVerified: false, // New users start unverified
        },
      };
      
    case 'signin':
      return {
        email: baseUser.email,
        password,
        user: createTestUserWithPassword(password, {
          email: baseUser.email,
          isEmailVerified: true,
        }),
      };
      
    case 'signout':
      const { user, session } = createAuthenticatedTestUser();
      return { user, session };
      
    case 'verify-email':
      const unverifiedUser = createTestUnverifiedUser();
      const userWithId = { ...unverifiedUser, id: Math.floor(Math.random() * 10000) + 1 };
      const verificationCode = createTestEmailVerificationCode(userWithId);
      return {
        user: unverifiedUser,
        verificationCode,
      };
      
    default:
      throw new Error(`Unknown auth scenario: ${scenario}`);
  }
};

/**
 * Creates test data for authorization testing (curator vs regular user)
 * @returns Test data with both curator and regular user
 */
export const createAuthorizationTestData = () => {
  const regularUser = createTestUser({ isCurator: false });
  const curatorUser = createTestCurator();
  const unverifiedUser = createTestUnverifiedUser();
  
  return {
    regularUser,
    curatorUser,
    unverifiedUser,
    regularUserContext: createAuthenticatedContext({
      ...regularUser,
      id: 1,
    }),
    curatorUserContext: createAuthenticatedContext({
      ...curatorUser,
      id: 2,
    }),
  };
};

/**
 * Creates test data for session management testing
 * @returns Test data for session scenarios
 */
export const createSessionTestData = () => {
  const user = createTestUser();
  const userWithId = { ...user, id: 1 };
  
  const validSession = createTestSession(userWithId);
  const expiredSession = createTestSession(userWithId, {
    expiresAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
  });
  const futureSession = createTestSession(userWithId, {
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 1 week from now
  });
  
  return {
    user: userWithId,
    validSession,
    expiredSession,
    futureSession,
    validRequest: createAuthenticatedRequest(validSession.id),
    expiredRequest: createAuthenticatedRequest(expiredSession.id),
  };
};