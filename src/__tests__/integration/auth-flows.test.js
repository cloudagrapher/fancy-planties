// Authentication Flow Integration Tests
// Tests complete signup, login, and logout workflows

import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userInteractions, testUtils } from '@/test-utils';
import { mockApiResponse, mockApiError, resetApiMocks } from '@/test-utils/helpers/api-helpers';
import { createTestUser, createTestSession } from '@/test-utils/factories/user-factory';
import SignUpForm from '@/components/auth/SignUpForm';
import SignInForm from '@/components/auth/SignInForm';
import LogoutButton from '@/components/auth/LogoutButton';

// Mock Next.js router
const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockGet = jest.fn(() => null);

// Mock the navigation hooks before importing components
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

describe('Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetApiMocks();
    mockPush.mockClear();
    mockRefresh.mockClear();
  });

  afterEach(() => {
    resetApiMocks();
  });

  describe('Complete Signup Workflow', () => {
    it('should complete full signup workflow from form submission to authenticated state', async () => {
      // Arrange
      const testUser = createTestUser({
        name: 'John Doe',
        email: 'john@example.com',
      });

      // Mock with delay to ensure loading state is visible
      global.fetch = jest.fn().mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              success: true,
              user: {
                id: testUser.id,
                email: testUser.email,
                name: testUser.name,
              },
            }),
          }), 100) // 100ms delay
        )
      );

      const { user } = renderWithProviders(<SignUpForm />);

      // Act - Fill out signup form
      await userInteractions.fillForm({
        'Full Name': 'John Doe',
        'Email Address': 'john@example.com',
        'Password': 'SecurePass123!',
      }, user);

      // Submit form and verify loading state appears
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      // Assert - Verify form shows loading state during submission
      await waitFor(() => {
        expect(screen.getByText('Creating account...')).toBeInTheDocument();
      });

      // Assert - Verify API call was made with correct data
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/signup',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: expect.stringContaining('john@example.com'),
          })
        );
      });
    });

    it('should handle signup validation errors properly', async () => {
      // Arrange
      mockApiResponse({
        'POST /api/auth/signup': {
          status: 400,
          data: {
            error: 'Validation failed',
            errors: {
              email: 'Email is already in use',
              password: 'Password must be at least 8 characters',
            },
          },
        },
      });

      const { user } = renderWithProviders(<SignUpForm />);

      // Act - Submit form with valid client data but server errors
      await userInteractions.fillForm({
        'Full Name': 'John Doe',
        'Email Address': 'existing@example.com',
        'Password': 'ValidPass123!',
      }, user);

      await userInteractions.submitForm(user, 'Create Account');

      // Assert - Verify server error messages are displayed
      await waitFor(() => {
        expect(screen.getByText('Email is already in use')).toBeInTheDocument();
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      });

      // Assert - Verify no redirect occurred
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should handle signup server errors gracefully', async () => {
      // Arrange
      mockApiError('/api/auth/signup', 500, { error: 'Internal server error' }, 'POST');

      const { user } = renderWithProviders(<SignUpForm />);

      // Act - Submit valid form data
      await userInteractions.fillForm({
        'Full Name': 'John Doe',
        'Email Address': 'john@example.com',
        'Password': 'SecurePass123!',
      }, user);

      await userInteractions.submitForm(user, 'Create Account');

      // Assert - Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText('Internal server error')).toBeInTheDocument();
      });

      // Assert - Verify no redirect occurred
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Login Workflow with Session Persistence', () => {
    it('should complete login workflow with session persistence', async () => {
      // Arrange
      const testUser = createTestUser({
        email: 'john@example.com',
      });
      
      mockApiResponse({
        'POST /api/auth/signin': {
          status: 200,
          data: {
            success: true,
            user: {
              id: testUser.id,
              email: testUser.email,
              name: testUser.name,
            },
          },
        },
      });

      const { user } = renderWithProviders(<SignInForm />);

      // Act - Fill out login form
      await userInteractions.fillForm({
        'Email Address': 'john@example.com',
        'Password': 'SecurePass123!',
      }, user);

      // Submit form
      await userInteractions.submitForm(user, 'Sign In');

      // Assert - Verify API call was made with correct credentials
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/signin',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: 'john@example.com',
              password: 'SecurePass123!',
            }),
          })
        );
      });

      // Assert - Verify redirect to dashboard
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('should handle login with redirect parameter', async () => {
      // Arrange
      const testUser = createTestUser();
      
      // Mock useSearchParams to return redirect parameter
      jest.doMock('next/navigation', () => ({
        useRouter: () => ({
          push: mockPush,
          refresh: mockRefresh,
        }),
        useSearchParams: () => ({
          get: jest.fn((param) => param === 'redirect' ? '/dashboard/plants' : null),
        }),
      }));
      
      mockApiResponse({
        'POST /api/auth/signin': {
          status: 200,
          data: {
            success: true,
            user: {
              id: testUser.id,
              email: testUser.email,
              name: testUser.name,
            },
          },
        },
      });

      const { user } = renderWithProviders(<SignInForm />);

      // Act - Complete login
      await userInteractions.fillForm({
        'Email Address': 'john@example.com',
        'Password': 'SecurePass123!',
      }, user);

      await userInteractions.submitForm(user, 'Sign In');

      // Assert - Verify redirect to intended page
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/plants');
      });
    });

    it('should handle invalid login credentials', async () => {
      // Arrange
      mockApiResponse({
        'POST /api/auth/signin': {
          status: 401,
          data: {
            error: 'Invalid email or password',
          },
        },
      });

      const { user } = renderWithProviders(<SignInForm />);

      // Act - Submit invalid credentials
      await userInteractions.fillForm({
        'Email Address': 'wrong@example.com',
        'Password': 'wrongpassword',
      }, user);

      await userInteractions.submitForm(user, 'Sign In');

      // Assert - Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
      });

      // Assert - Verify no redirect occurred
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should handle login validation errors', async () => {
      // Arrange
      mockApiResponse({
        'POST /api/auth/signin': {
          status: 400,
          data: {
            error: 'Validation failed',
            errors: {
              email: 'Please enter a valid email address',
              password: 'Password is required',
            },
          },
        },
      });

      const { user } = renderWithProviders(<SignInForm />);

      // Act - Submit form with invalid data
      await userInteractions.fillForm({
        'Email Address': 'invalid-email',
        'Password': 'validpass',
      }, user);

      await userInteractions.submitForm(user, 'Sign In');

      // Assert - Verify field-specific errors are displayed
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });
    });
  });

  describe('Logout and Session Cleanup', () => {
    it('should complete logout workflow with proper session cleanup', async () => {
      // Arrange
      mockApiResponse({
        'POST /api/auth/signout': {
          status: 200,
          data: {
            success: true,
            message: 'Signed out successfully',
          },
        },
      });

      const { user } = renderWithProviders(<LogoutButton />);

      // Act - Click logout button
      const logoutButton = screen.getByRole('button', { name: /sign out/i });
      await user.click(logoutButton);

      // Assert - Verify API call was made
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/signout',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })
        );
      });

      // Assert - Verify redirect to signin page
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin');
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('should handle logout when no active session exists', async () => {
      // Arrange
      mockApiResponse({
        'POST /api/auth/signout': {
          status: 401,
          data: {
            error: 'No active session',
          },
        },
      });

      const { user } = renderWithProviders(<LogoutButton />);

      // Act - Click logout button
      const logoutButton = screen.getByRole('button', { name: /sign out/i });
      await user.click(logoutButton);

      // Assert - Verify redirect still occurs (client-side logout)
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin');
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('should handle logout server errors gracefully', async () => {
      // Arrange
      mockApiError('/api/auth/signout', 500, { error: 'Internal server error' }, 'POST');

      const { user } = renderWithProviders(<LogoutButton />);

      // Act - Click logout button
      const logoutButton = screen.getByRole('button', { name: /sign out/i });
      await user.click(logoutButton);

      // Assert - Verify redirect occurs even on server error (fail-safe logout)
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin');
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('should show loading state during logout process', async () => {
      // Arrange
      let resolveLogout;
      const logoutPromise = new Promise((resolve) => {
        resolveLogout = resolve;
      });

      global.fetch = jest.fn(() => logoutPromise);

      const { user } = renderWithProviders(<LogoutButton />);

      // Act - Click logout button
      const logoutButton = screen.getByRole('button', { name: /sign out/i });
      await user.click(logoutButton);

      // Assert - Verify loading state is shown
      expect(screen.getByText('Signing out...')).toBeInTheDocument();
      expect(logoutButton).toHaveClass('btn--loading');

      // Complete the logout
      resolveLogout({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      // Assert - Verify loading state is cleared
      await waitFor(() => {
        expect(screen.queryByText('Signing out...')).not.toBeInTheDocument();
      });
    });
  });  describe
('End-to-End Authentication Flow', () => {
    it('should complete full authentication cycle: signup -> login -> logout', async () => {
      const testUser = createTestUser({
        name: 'Jane Doe',
        email: 'jane@example.com',
      });

      // Step 1: Signup
      mockApiResponse({
        'POST /api/auth/signup': {
          status: 200,
          data: {
            success: true,
            user: {
              id: testUser.id,
              email: testUser.email,
              name: testUser.name,
            },
          },
        },
      });

      const { user: userEvent, rerender } = renderWithProviders(<SignUpForm />);

      // Complete signup
      await userInteractions.fillForm({
        'Full Name': 'Jane Doe',
        'Email Address': 'jane@example.com',
        'Password': 'SecurePass123!',
      }, userEvent);

      await userInteractions.submitForm(userEvent, 'Create Account');

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });

      // Reset mocks for next step
      jest.clearAllMocks();
      mockPush.mockClear();

      // Step 2: Login (simulate returning user)
      mockApiResponse({
        'POST /api/auth/signin': {
          status: 200,
          data: {
            success: true,
            user: {
              id: testUser.id,
              email: testUser.email,
              name: testUser.name,
            },
          },
        },
      });

      rerender(<SignInForm />);

      // Complete login
      await userInteractions.fillForm({
        'Email Address': 'jane@example.com',
        'Password': 'SecurePass123!',
      }, userEvent);

      await userInteractions.submitForm(userEvent, 'Sign In');

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });

      // Reset mocks for logout
      jest.clearAllMocks();
      mockPush.mockClear();

      // Step 3: Logout
      mockApiResponse({
        'POST /api/auth/signout': {
          status: 200,
          data: {
            success: true,
            message: 'Signed out successfully',
          },
        },
      });

      rerender(<LogoutButton />);

      // Complete logout
      const logoutButton = screen.getByRole('button', { name: /sign out/i });
      await userEvent.click(logoutButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin');
      });
    });

    it('should maintain form state during validation errors', async () => {
      // Arrange
      mockApiResponse({
        'POST /api/auth/signin': {
          status: 400,
          data: {
            error: 'Validation failed',
            errors: {
              password: 'Password is required',
            },
          },
        },
      });

      const { user } = renderWithProviders(<SignInForm />);

      // Act - Fill form partially and submit
      await userInteractions.fillForm({
        'Email Address': 'jane@example.com',
      }, user);

      await userInteractions.submitForm(user, 'Sign In');

      // Assert - Verify form maintains email value after error
      await waitFor(() => {
        expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });
    });
  });
});