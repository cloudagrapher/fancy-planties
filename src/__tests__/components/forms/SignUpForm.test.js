/**
 * @jest-environment jsdom
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockApiResponses, mockApiError } from '@/test-utils/helpers/render-helpers';
import SignUpForm from '@/components/auth/SignUpForm';

// Mock Next.js navigation
const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

describe('SignUpForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful sign-up by default
    mockApiResponses({
      '/api/auth/signup': { success: true, user: { id: 1, email: 'test@example.com' } },
    });
  });

  describe('Form Rendering', () => {
    it('renders all form fields', () => {
      renderWithProviders(<SignUpForm />);

      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('has proper form attributes for accessibility', () => {
      renderWithProviders(<SignUpForm />);

      const form = screen.getByRole('form', { hidden: true });
      expect(form).toHaveAttribute('autoComplete', 'on');
      expect(form).toHaveAttribute('noValidate');

      const nameInput = screen.getByLabelText(/full name/i);
      expect(nameInput).toHaveAttribute('type', 'text');
      expect(nameInput).toHaveAttribute('autoComplete', 'name');
      expect(nameInput).toHaveAttribute('required');

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(emailInput).toHaveAttribute('required');

      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('autoComplete', 'new-password');
      expect(passwordInput).toHaveAttribute('data-new-password', 'true');
      expect(passwordInput).toHaveAttribute('required');
    });

    it('shows password requirements help text', () => {
      renderWithProviders(<SignUpForm />);

      expect(screen.getByText(/password must be at least 8 characters with uppercase, lowercase, and number/i)).toBeInTheDocument();
    });

    it('shows required field indicators', () => {
      renderWithProviders(<SignUpForm />);

      expect(screen.getByText(/full name/i)).toBeInTheDocument();
      expect(screen.getByText(/email address/i)).toBeInTheDocument();
      expect(screen.getByText(/^password$/i)).toBeInTheDocument();
      
      // Check for required indicators in labels
      const labels = screen.getAllByText(/\*/);
      expect(labels).toHaveLength(3); // Name, email, and password should be marked as required
    });
  });

  describe('Form Validation', () => {
    it('validates required fields on submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignUpForm />);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });

      // Should not make API call with invalid data
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('validates email format', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignUpForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });
    });

    it('validates password strength requirements', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignUpForm />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      
      // Test weak password
      await user.type(passwordInput, 'weak');
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('validates password complexity', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignUpForm />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      
      // Test password without uppercase
      await user.type(passwordInput, 'password123');
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must contain.*uppercase/i)).toBeInTheDocument();
      });
    });

    it('validates name length', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignUpForm />);

      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, 'A'); // Too short

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
      });
    });

    it('clears field errors when user starts typing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignUpForm />);

      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });

      // Start typing in name field
      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, 'John');

      // Error should be cleared
      expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('submits valid form data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignUpForm />);

      // Fill form with valid data
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123');

      // Submit form
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/signup',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: 'John Doe',
              email: 'john@example.com',
              password: 'Password123',
            }),
          })
        );
      });
    });

    it('redirects to dashboard on successful sign-up', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignUpForm />);

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
        expect(mockRefresh).toHaveBeenCalled();
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

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123');
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      // Check loading state
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/creating account/i)).toBeInTheDocument();
      expect(screen.getByText(/please wait while we create your account/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays server validation errors', async () => {
      const user = userEvent.setup();
      mockApiError('/api/auth/signup', 400, {
        errors: {
          email: 'Email already exists',
          password: 'Password too weak',
        },
      });

      renderWithProviders(<SignUpForm />);

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'WeakPass');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument();
        expect(screen.getByText('Password too weak')).toBeInTheDocument();
      });
    });

    it('displays general error message', async () => {
      const user = userEvent.setup();
      mockApiError('/api/auth/signup', 500, {
        error: 'Server error occurred',
      });

      renderWithProviders(<SignUpForm />);

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Account Creation Failed')).toBeInTheDocument();
        expect(screen.getByText('Server error occurred')).toBeInTheDocument();
      });
    });

    it('handles network errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

      renderWithProviders(<SignUpForm />);

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument();
      });
    });

    it('clears errors when form is resubmitted', async () => {
      const user = userEvent.setup();
      mockApiError('/api/auth/signup', 400, { error: 'Email already exists' });

      renderWithProviders(<SignUpForm />);

      // First submission with error
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument();
      });

      // Mock successful response for retry
      mockApiResponses({
        '/api/auth/signup': { success: true },
      });

      // Retry submission
      await user.clear(screen.getByLabelText(/email address/i));
      await user.type(screen.getByLabelText(/email address/i), 'newemail@example.com');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Error should be cleared
      expect(screen.queryByText('Email already exists')).not.toBeInTheDocument();
    });
  });

  describe('Password Field Behavior', () => {
    it('shows password help text', () => {
      renderWithProviders(<SignUpForm />);

      const passwordHelp = screen.getByText(/password must be at least 8 characters with uppercase, lowercase, and number/i);
      expect(passwordHelp).toBeInTheDocument();
      expect(passwordHelp).toHaveAttribute('id', 'signup-password-help');
    });

    it('associates password field with help text', () => {
      renderWithProviders(<SignUpForm />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toHaveAttribute('aria-describedby', 'signup-password-help');
    });

    it('associates password field with error message when validation fails', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignUpForm />);

      await user.type(screen.getByLabelText(/^password$/i), 'weak');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/^password$/i);
        expect(passwordInput).toHaveAttribute('aria-describedby', 'signup-password-error signup-password-help');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      renderWithProviders(<SignUpForm />);

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);

      expect(nameInput).toHaveAttribute('id', 'signup-name');
      expect(emailInput).toHaveAttribute('id', 'signup-email');
      expect(passwordInput).toHaveAttribute('id', 'signup-password');
    });

    it('associates error messages with form fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignUpForm />);

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/full name/i);
        const nameError = screen.getByText(/name is required/i);
        
        expect(nameInput).toHaveAttribute('aria-describedby', 'signup-name-error');
        expect(nameError).toHaveAttribute('id', 'signup-name-error');
        expect(nameError).toHaveAttribute('role', 'alert');
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

      renderWithProviders(<SignUpForm />);

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123');
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      expect(submitButton).toHaveAttribute('aria-describedby', 'signup-loading');
      expect(screen.getByText(/please wait while we create your account/i)).toHaveClass('sr-only');
    });

    it('has proper form validation summary', async () => {
      const user = userEvent.setup();
      mockApiError('/api/auth/signup', 400, { error: 'Account creation failed' });

      renderWithProviders(<SignUpForm />);

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        const summary = screen.getByText('Account Creation Failed').closest('.form-validation-summary');
        expect(summary).toBeInTheDocument();
        expect(summary).toHaveClass('form-validation-summary');
      });
    });
  });

  describe('Form Interaction', () => {
    it('allows keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignUpForm />);

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      // Tab through form elements
      await user.tab();
      expect(nameInput).toHaveFocus();

      await user.tab();
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();

      await user.tab();
      expect(submitButton).toHaveFocus();
    });

    it('submits form on Enter key in password field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignUpForm />);

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123');
      
      // Press Enter in password field
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/signup', expect.any(Object));
      });
    });

    it('maintains form state during validation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignUpForm />);

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'weak'); // Invalid password

      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Form values should be preserved even with validation errors
      expect(nameInput).toHaveValue('John Doe');
      expect(emailInput).toHaveValue('john@example.com');
      expect(passwordInput).toHaveValue('weak');
    });
  });
});