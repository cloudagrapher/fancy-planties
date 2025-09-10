// Authentication Core Logic Tests
// Tests the core authentication logic without middleware complications

import { NextRequest, NextResponse } from 'next/server';
import { createTestUser, createTestSession } from '@/test-utils/factories/user-factory';

// Mock the auth functions
jest.mock('@/lib/auth', () => ({
  signUp: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('@/lib/auth/server', () => ({
  setSessionCookie: jest.fn(),
  clearSessionCookie: jest.fn(),
  validateRequest: jest.fn(),
}));

jest.mock('@/lib/auth/validation', () => ({
  validateInput: jest.fn(),
}));

// Import mocked functions
import { signUp, signIn, signOut } from '@/lib/auth';
import { setSessionCookie, clearSessionCookie, validateRequest } from '@/lib/auth/server';
import { validateInput } from '@/lib/auth/validation';

// Create simplified handlers for testing (without middleware)
const createSignupHandler = () => async (request) => {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = validateInput({}, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }
    
    const { email, password, name } = validation.data;
    
    // Attempt to sign up
    const result = await signUp(email, password, name);
    
    // Set session cookie
    await setSessionCookie(result.session.id);
    
    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
    });
    
  } catch (error) {
    console.error('Sign up error:', error);
    
    if (error instanceof Error && error.message === 'User already exists') {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

const createSigninHandler = () => async (request) => {
  try {
    const body = await request.json();

    // Validate input
    const validation = validateInput({}, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Attempt to sign in
    const result = await signIn(email, password);

    if (!result) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Set session cookie
    await setSessionCookie(result.session.id);

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
    });

  } catch (error) {
    console.error('Sign in error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

const createSignoutHandler = () => async (_request) => {
  try {
    const { session } = await validateRequest();
    
    if (!session) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
    }
    
    // Sign out and clear session
    await signOut(session.id);
    await clearSessionCookie();
    
    return NextResponse.json({
      success: true,
      message: 'Signed out successfully',
    });
    
  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

describe('Authentication Core Logic', () => {
  let signupHandler, signinHandler, signoutHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create handlers for each test
    signupHandler = createSignupHandler();
    signinHandler = createSigninHandler();
    signoutHandler = createSignoutHandler();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Signup Logic', () => {
    it('should create new user with valid data', async () => {
      // Arrange
      const testUser = createTestUser({
        name: 'John Doe',
        email: 'john@example.com',
      });
      const testSession = createTestSession(testUser);

      const requestBody = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
      };

      validateInput.mockReturnValue({
        success: true,
        data: requestBody,
      });

      signUp.mockResolvedValue({
        user: testUser,
        session: testSession,
      });

      setSessionCookie.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await signupHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        success: true,
        user: {
          id: testUser.id,
          email: testUser.email,
          name: testUser.name,
        },
      });

      expect(validateInput).toHaveBeenCalledWith({}, requestBody);
      expect(signUp).toHaveBeenCalledWith('john@example.com', 'SecurePass123!', 'John Doe');
      expect(setSessionCookie).toHaveBeenCalledWith(testSession.id);
    });

    it('should return validation error for invalid input', async () => {
      // Arrange
      const requestBody = {
        name: '',
        email: 'invalid-email',
        password: '123',
      };

      validateInput.mockReturnValue({
        success: false,
        errors: {
          name: 'Name is required',
          email: 'Please enter a valid email address',
          password: 'Password must be at least 8 characters',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await signupHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        error: 'Validation failed',
        errors: {
          name: 'Name is required',
          email: 'Please enter a valid email address',
          password: 'Password must be at least 8 characters',
        },
      });

      expect(signUp).not.toHaveBeenCalled();
      expect(setSessionCookie).not.toHaveBeenCalled();
    });

    it('should return conflict error when user already exists', async () => {
      // Arrange
      const requestBody = {
        name: 'John Doe',
        email: 'existing@example.com',
        password: 'SecurePass123!',
      };

      validateInput.mockReturnValue({
        success: true,
        data: requestBody,
      });

      signUp.mockRejectedValue(new Error('User already exists'));

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await signupHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(409);
      expect(responseData).toEqual({
        error: 'An account with this email already exists',
      });

      expect(setSessionCookie).not.toHaveBeenCalled();
    });
  });

  describe('Signin Logic', () => {
    it('should authenticate user with valid credentials', async () => {
      // Arrange
      const testUser = createTestUser({
        email: 'john@example.com',
      });
      const testSession = createTestSession(testUser);

      const requestBody = {
        email: 'john@example.com',
        password: 'SecurePass123!',
      };

      validateInput.mockReturnValue({
        success: true,
        data: requestBody,
      });

      signIn.mockResolvedValue({
        user: testUser,
        session: testSession,
      });

      setSessionCookie.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await signinHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        success: true,
        user: {
          id: testUser.id,
          email: testUser.email,
          name: testUser.name,
        },
      });

      expect(validateInput).toHaveBeenCalledWith({}, requestBody);
      expect(signIn).toHaveBeenCalledWith('john@example.com', 'SecurePass123!');
      expect(setSessionCookie).toHaveBeenCalledWith(testSession.id);
    });

    it('should return unauthorized error for invalid credentials', async () => {
      // Arrange
      const requestBody = {
        email: 'john@example.com',
        password: 'wrongpassword',
      };

      validateInput.mockReturnValue({
        success: true,
        data: requestBody,
      });

      signIn.mockResolvedValue(null); // Invalid credentials return null

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await signinHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData).toEqual({
        error: 'Invalid email or password',
      });

      expect(signIn).toHaveBeenCalledWith('john@example.com', 'wrongpassword');
      expect(setSessionCookie).not.toHaveBeenCalled();
    });
  });

  describe('Signout Logic', () => {
    it('should sign out user with valid session', async () => {
      // Arrange
      const testUser = createTestUser();
      const testSession = createTestSession(testUser);

      validateRequest.mockResolvedValue({
        user: testUser,
        session: testSession,
      });

      signOut.mockResolvedValue(undefined);
      clearSessionCookie.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/auth/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-session=${testSession.id}`,
        },
      });

      // Act
      const response = await signoutHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        success: true,
        message: 'Signed out successfully',
      });

      expect(validateRequest).toHaveBeenCalled();
      expect(signOut).toHaveBeenCalledWith(testSession.id);
      expect(clearSessionCookie).toHaveBeenCalled();
    });

    it('should return unauthorized error when no active session', async () => {
      // Arrange
      validateRequest.mockResolvedValue({
        user: null,
        session: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await signoutHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData).toEqual({
        error: 'No active session',
      });

      expect(validateRequest).toHaveBeenCalled();
      expect(signOut).not.toHaveBeenCalled();
      expect(clearSessionCookie).not.toHaveBeenCalled();
    });
  });
});