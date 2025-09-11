/**
 * @jest-environment jsdom
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockApiResponses, mockApiError } from '@/test-utils/helpers/render-helpers';
import SignInForm from '@/components/auth/SignInForm';

// Mock Next.js navigation
const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockSearchParamsGet = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => ({
    get: mockSearchParamsGet,
  }),
}));

describe('SignInForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set default mock behavior for search params
    mockSearchParamsGet.mockImplementation((key) => {
      if (key === 'redirect') return '/dashboard';
      return null;
    });
    
    // Mock successful sign-in by default
    mockApiResponses({
      '/api/auth/signin': { success: true, user: { id: 1, email: 'test@example.com' } },
    });
  });

  describe('Form Rendering', () => {
    it('renders all form fields', () => {
      renderWithProviders(<SignInForm />);

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('has proper form attributes for accessibility', () => {
      renderWithProviders(<SignInForm />);

      const form = screen.getByRole('form', { hidden: true });
      expect(form).toHaveAttribute('autoComplete', 'on');
      expect(form).toHaveAttribute('noValidate');

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(emailInput).toHaveAttribute('required');

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
      expect(passwordInput).toHaveAttribute('required');
    });

    it('shows required field indicators', () => {
      renderWithProviders(<SignInForm />);

      expect(screen.getByText(/email address/i)).toBeInTheDocument();
      expect(screen.getByText(/password/i)).toBeInTheDocument();
      
      // Check for required indicators in labels
      const labels = screen.getAllByText(/\*/);
      expect(labels).toHaveLength(2); // Email and password should be marked as required
    });
  });

  describe('Form Validation', () => {
    it('validates required fields on submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignInForm />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });

      // Should not make API call with invalid data
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('validates email format', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignInForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });
    });

    it('validates minimum password length', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignInForm />);

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, '123'); // Too short

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least/i)).toBeInTheDocument();
      });
    });

    it('clears field errors when user starts typing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignInForm />);

      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });

      // Start typing in email field
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test');

      // Error should be cleared
      expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('submits valid form data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignInForm />);

      // Fill form with valid data
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      // Submit form
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/signin',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'password123',
            }),
          })
        );
      });
    });

    it('redirects to dashboard on successful sign-in', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignInForm />);

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('redirects to specified redirect URL', async () => {
      const user = userEvent.setup();
      
      // Mock useSearchParams to return a redirect URL
      mockSearchParamsGet.mockImplementation((key) => {
        if (key === 'redirect') return '/plants';
        return null;
      });

      renderWithProviders(<SignInForm />);

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/plants');
      });
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      
      // Mock delayed response
      global.fetch = jest.fn(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          }), 100)
        )
      );

      renderWithProviders(<SignInForm />);

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Check loading state
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      expect(screen.getByText(/please wait while we sign you in/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays server validation errors', async () => {
      const user = userEvent.setup();
      mockApiError('/api/auth/signin', 400, {
        errors: {
          email: 'Email not found',
          password: 'Invalid password',
        },
      });

      renderWithProviders(<SignInForm />);

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Email not found')).toBeInTheDocument();
        expect(screen.getByText('Invalid password')).toBeInTheDocument();
      });
    });

    it('displays general error message', async () => {
      const user = userEvent.setup();
      mockApiError('/api/auth/signin', 401, {
        error: 'Invalid credentials',
      });

      renderWithProviders(<SignInForm />);

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Sign In Failed')).toBeInTheDocument();
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('handles network errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

      renderWithProviders(<SignInForm />);

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument();
      });
    });

    it('clears errors when form is resubmitted', async () => {
      const user = userEvent.setup();
      mockApiError('/api/auth/signin', 401, { error: 'Invalid credentials' });

      renderWithProviders(<SignInForm />);

      // First submission with error
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      // Mock successful response for retry
      mockApiResponses({
        '/api/auth/signin': { success: true },
      });

      // Retry submission
      await user.clear(screen.getByLabelText(/password/i));
      await user.type(screen.getByLabelText(/password/i), 'correctpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Error should be cleared
      expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      renderWithProviders(<SignInForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('id', 'signin-email');
      expect(passwordInput).toHaveAttribute('id', 'signin-password');
    });

    it('associates error messages with form fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignInForm />);

      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email address/i);
        const emailError = screen.getByText(/please enter a valid email address/i);
        
        expect(emailInput).toHaveAttribute('aria-describedby', 'signin-email-error');
        expect(emailError).toHaveAttribute('id', 'signin-email-error');
        expect(emailError).toHaveAttribute('role', 'alert');
      });
    });

    it('provides screen reader feedback for loading state', async () => {
      const user = userEvent.setup();
      
      // Mock delayed response
      global.fetch = jest.fn(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          }), 100)
        )
      );

      renderWithProviders(<SignInForm />);

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      expect(submitButton).toHaveAttribute('aria-describedby', 'signin-loading');
      expect(screen.getByText(/please wait while we sign you in/i)).toHaveClass('sr-only');
    });

    it('has proper form validation summary', async () => {
      const user = userEvent.setup();
      mockApiError('/api/auth/signin', 401, { error: 'Invalid credentials' });

      renderWithProviders(<SignInForm />);

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        const summary = screen.getByText('Sign In Failed').closest('.form-validation-summary');
        expect(summary).toBeInTheDocument();
        expect(summary).toHaveClass('form-validation-summary');
      });
    });
  });

  describe('Form Interaction', () => {
    it('allows keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignInForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Tab through form elements
      await user.tab();
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();

      await user.tab();
      expect(submitButton).toHaveFocus();
    });

    it('submits form on Enter key in password field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignInForm />);

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      
      // Press Enter in password field
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/signin', expect.any(Object));
      });
    });

    it('maintains form state during validation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignInForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'short'); // Invalid password

      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Form values should be preserved even with validation errors
      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('short');
    });
  });
});