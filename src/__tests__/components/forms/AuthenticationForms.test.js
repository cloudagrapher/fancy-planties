/**
 * @jest-environment jsdom
 */

import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockApiResponses, mockApiError } from '@/test-utils';
import SignInForm from '@/components/auth/SignInForm';
import SignUpForm from '@/components/auth/SignUpForm';

describe('Authentication Forms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses by default
    mockApiResponses({
      '/api/auth/signin': { success: true, user: { id: 1, email: 'test@example.com' } },
      '/api/auth/signup': { success: true, user: { id: 1, email: 'test@example.com' }, requiresVerification: true },
    });
  });

  describe('SignInForm', () => {
    describe('Form Rendering', () => {
      it('renders all required form fields', () => {
        renderWithProviders(<SignInForm />);

        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      });

      it('renders forgot password link', () => {
        renderWithProviders(<SignInForm />);

        expect(screen.getByText(/forgot.*password/i)).toBeInTheDocument();
      });

      it('does not render sign up link in form', () => {
        renderWithProviders(<SignInForm />);

        // The SignInForm only has a forgot password link
        expect(screen.queryByText(/sign up/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/don't have an account/i)).not.toBeInTheDocument();
      });
    });

    describe('Form Validation', () => {
      it('shows validation errors for empty fields', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SignInForm />);

        const submitButton = screen.getByRole('button', { name: /sign in/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
          expect(screen.getByText(/password is required/i)).toBeInTheDocument();
        });
      });

      it('validates email format', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SignInForm />);

        const emailInput = screen.getByLabelText(/email/i);
        await user.type(emailInput, 'invalid-email');

        const submitButton = screen.getByRole('button', { name: /sign in/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
        });
      });

      it('validates password is required', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SignInForm />);

        const emailInput = screen.getByLabelText(/email/i);
        await user.type(emailInput, 'test@example.com');

        const submitButton = screen.getByRole('button', { name: /sign in/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/password is required/i)).toBeInTheDocument();
        });
      });

      it('clears validation errors when user starts typing', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SignInForm />);

        // Trigger validation errors
        const submitButton = screen.getByRole('button', { name: /sign in/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
        });

        // Start typing in email field
        const emailInput = screen.getByLabelText(/email/i);
        await user.type(emailInput, 'test@example.com');

        // Error should be cleared
        expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument();
      });
    });

    describe('Form Submission', () => {
      it('submits form with valid credentials', async () => {
        const user = userEvent.setup();
        const { router } = renderWithProviders(<SignInForm />);

        // Fill form
        await user.type(screen.getByLabelText(/email/i), 'test@example.com');
        await user.type(screen.getByLabelText(/password/i), 'password123');

        // Submit
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

        // Should redirect to dashboard
        await waitFor(() => {
          expect(router.push).toHaveBeenCalledWith('/dashboard');
        });
      });

      it('redirects to dashboard on successful sign in', async () => {
        const user = userEvent.setup();
        const { router } = renderWithProviders(<SignInForm />);

        // Fill and submit form
        await user.type(screen.getByLabelText(/email/i), 'test@example.com');
        await user.type(screen.getByLabelText(/password/i), 'password123');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        // Should redirect to dashboard (default behavior)
        await waitFor(() => {
          expect(router.push).toHaveBeenCalledWith('/dashboard');
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

        // Fill and submit form
        await user.type(screen.getByLabelText(/email/i), 'test@example.com');
        await user.type(screen.getByLabelText(/password/i), 'password123');
        
        const submitButton = screen.getByRole('button', { name: /sign in/i });
        await user.click(submitButton);

        // Check loading state
        expect(submitButton).toBeDisabled();
        expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      });

      it('handles authentication errors', async () => {
        const user = userEvent.setup();
        mockApiError('/api/auth/signin', 401, { error: 'Invalid credentials' });

        renderWithProviders(<SignInForm />);

        // Fill and submit form
        await user.type(screen.getByLabelText(/email/i), 'test@example.com');
        await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
          expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
        });
      });

      it('handles server errors gracefully', async () => {
        const user = userEvent.setup();
        mockApiError('/api/auth/signin', 500, { error: 'Internal server error' });

        renderWithProviders(<SignInForm />);

        // Fill and submit form
        await user.type(screen.getByLabelText(/email/i), 'test@example.com');
        await user.type(screen.getByLabelText(/password/i), 'password123');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
          expect(screen.getByText(/internal server error/i)).toBeInTheDocument();
        });
      });

      it('handles network errors', async () => {
        const user = userEvent.setup();
        
        // Mock network error
        global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

        renderWithProviders(<SignInForm />);

        // Fill and submit form
        await user.type(screen.getByLabelText(/email/i), 'test@example.com');
        await user.type(screen.getByLabelText(/password/i), 'password123');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
          expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument();
        });
      });
    });

    describe('Accessibility', () => {
      it('has proper form structure', () => {
        renderWithProviders(<SignInForm />);

        const form = document.querySelector('form');
        expect(form).toBeInTheDocument();
      });

      it('has proper labels for all inputs', () => {
        renderWithProviders(<SignInForm />);

        expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
        expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
      });

      it('has required attributes on form fields', () => {
        renderWithProviders(<SignInForm />);

        expect(screen.getByLabelText(/email/i)).toHaveAttribute('required');
        expect(screen.getByLabelText(/password/i)).toHaveAttribute('required');
      });

      it('associates error messages with form fields', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SignInForm />);

        // Trigger validation errors
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
          const emailInput = screen.getByLabelText(/email/i);
          const passwordInput = screen.getByLabelText(/password/i);
          
          // Check that error classes are applied
          expect(emailInput).toHaveClass('form-input--error');
          expect(passwordInput).toHaveClass('form-input--error');
        });
      });
    });
  });

  describe('SignUpForm', () => {
    describe('Form Rendering', () => {
      it('renders all required form fields', () => {
        renderWithProviders(<SignUpForm />);

        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
      });

      it('does not render sign in link in form', () => {
        renderWithProviders(<SignUpForm />);

        // The SignUpForm doesn't have sign in links
        expect(screen.queryByText(/already have an account/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
      });
    });

    describe('Form Validation', () => {
      it('shows validation errors for empty fields', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SignUpForm />);

        const submitButton = screen.getByRole('button', { name: /create account/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/name can only contain letters/i)).toBeInTheDocument();
          expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
          expect(screen.getByText(/password must contain at least one/i)).toBeInTheDocument();
        });
      });

      it('validates name format', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SignUpForm />);

        const nameInput = screen.getByLabelText(/full name/i);
        await user.type(nameInput, 'John123');

        const submitButton = screen.getByRole('button', { name: /create account/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/name can only contain letters/i)).toBeInTheDocument();
        });
      });

      it('validates email format', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SignUpForm />);

        const emailInput = screen.getByLabelText(/email/i);
        await user.type(emailInput, 'invalid-email');

        const submitButton = screen.getByRole('button', { name: /create account/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
        });
      });

      it('validates password strength', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SignUpForm />);

        const passwordInput = screen.getByLabelText(/password/i);
        await user.type(passwordInput, 'weak');

        const submitButton = screen.getByRole('button', { name: /create account/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/password must contain at least one/i)).toBeInTheDocument();
        });
      });

      it('shows password help text', () => {
        renderWithProviders(<SignUpForm />);

        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    describe('Form Submission', () => {
      it('submits form with valid data', async () => {
        const user = userEvent.setup();
        const { router } = renderWithProviders(<SignUpForm />);

        // Fill form
        await user.type(screen.getByLabelText(/full name/i), 'John Doe');
        await user.type(screen.getByLabelText(/email/i), 'john@example.com');
        await user.type(screen.getByLabelText(/password/i), 'SecurePassword123!');

        // Submit
        await user.click(screen.getByRole('button', { name: /create account/i }));

        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            '/api/auth/signup',
            expect.objectContaining({
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            })
          );
          
          // Check that the body contains the expected data (order doesn't matter)
          const fetchCall = global.fetch.mock.calls[0];
          const requestBody = JSON.parse(fetchCall[1].body);
          expect(requestBody).toEqual(expect.objectContaining({
            name: 'John Doe',
            email: 'john@example.com',
            password: 'SecurePassword123!',
          }));
        });

        // Should redirect to verification page with email parameter
        await waitFor(() => {
          expect(router.push).toHaveBeenCalledWith(expect.stringContaining('/auth/verify-email'));
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

        renderWithProviders(<SignUpForm />);

        // Fill and submit form
        await user.type(screen.getByLabelText(/full name/i), 'John Doe');
        await user.type(screen.getByLabelText(/email/i), 'john@example.com');
        await user.type(screen.getByLabelText(/password/i), 'SecurePassword123!');
        
        const submitButton = screen.getByRole('button', { name: /create account/i });
        await user.click(submitButton);

        // Check loading state
        expect(submitButton).toBeDisabled();
        expect(screen.getByText(/creating account/i)).toBeInTheDocument();
      });

      it('handles email already exists error', async () => {
        const user = userEvent.setup();
        mockApiError('/api/auth/signup', 409, { error: 'Email already exists' });

        renderWithProviders(<SignUpForm />);

        // Fill and submit form
        await user.type(screen.getByLabelText(/full name/i), 'John Doe');
        await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
        await user.type(screen.getByLabelText(/password/i), 'SecurePassword123!');
        await user.click(screen.getByRole('button', { name: /create account/i }));

        await waitFor(() => {
          expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
        });
      });



      it('handles server errors gracefully', async () => {
        const user = userEvent.setup();
        mockApiError('/api/auth/signup', 500, { error: 'Internal server error' });

        renderWithProviders(<SignUpForm />);

        // Fill and submit form
        await user.type(screen.getByLabelText(/full name/i), 'John Doe');
        await user.type(screen.getByLabelText(/email/i), 'john@example.com');
        await user.type(screen.getByLabelText(/password/i), 'SecurePassword123!');
        await user.click(screen.getByRole('button', { name: /create account/i }));

        await waitFor(() => {
          expect(screen.getByText(/internal server error/i)).toBeInTheDocument();
        });
      });
    });

    describe('Accessibility', () => {
      it('has proper form structure', () => {
        renderWithProviders(<SignUpForm />);

        const form = document.querySelector('form');
        expect(form).toBeInTheDocument();
      });

      it('has proper labels for all inputs', () => {
        renderWithProviders(<SignUpForm />);

        expect(screen.getByLabelText(/full name/i)).toHaveAttribute('type', 'text');
        expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
        expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
      });

      it('has required attributes on form fields', () => {
        renderWithProviders(<SignUpForm />);

        expect(screen.getByLabelText(/full name/i)).toHaveAttribute('required');
        expect(screen.getByLabelText(/email/i)).toHaveAttribute('required');
        expect(screen.getByLabelText(/password/i)).toHaveAttribute('required');
      });

      it('associates error messages with form fields', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SignUpForm />);

        // Trigger validation errors
        await user.click(screen.getByRole('button', { name: /create account/i }));

        await waitFor(() => {
          const nameInput = screen.getByLabelText(/full name/i);
          const emailInput = screen.getByLabelText(/email/i);
          const passwordInput = screen.getByLabelText(/password/i);
          
          // Check that error classes are applied
          expect(nameInput).toHaveClass('form-input--error');
          expect(emailInput).toHaveClass('form-input--error');
          expect(passwordInput).toHaveClass('form-input--error');
        });
      });

      it('has proper form structure with role', () => {
        renderWithProviders(<SignUpForm />);

        expect(screen.getByRole('form')).toBeInTheDocument();
      });
    });
  });

  describe('Form Integration', () => {
    it('handles keyboard navigation properly', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignInForm />);

      const emailInput = screen.getByLabelText(/email/i);
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

    it('submits form on Enter key press', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignInForm />);

      // Fill form
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      // Press Enter in password field
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/signin', expect.any(Object));
      });
    });
  });
});