'use client';

import { useState } from 'react';
import { passwordResetRequestSchema, type PasswordResetRequestInput } from '@/lib/auth/validation';

export default function ForgotPasswordForm() {
  const [formData, setFormData] = useState<PasswordResetRequestInput>({
    email: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setGeneralError('');

    try {
      // Validate form data
      const validation = passwordResetRequestSchema.safeParse(formData);
      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        validation.error.issues.forEach((issue) => {
          const field = issue.path.join('.');
          fieldErrors[field] = issue.message;
        });
        setErrors(fieldErrors);
        return;
      }

      // Submit to API
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validation.data),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors) {
          setErrors(result.errors);
        } else {
          setGeneralError(result.error || 'Failed to send reset email');
        }
        return;
      }

      // Success
      setSubmitted(true);
      
    } catch (error) {
      console.error('Forgot password error:', error);
      setGeneralError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (submitted) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-mint-200 flex-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-mint-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Check your email
        </h3>
        
        <p className="text-gray-600 mb-4">
          If an account with that email exists, we've sent you a password reset link.
        </p>
        
        <p className="text-sm text-gray-500 mb-6">
          The link will expire in 1 hour. Check your spam folder if you don't see it.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={() => {
              setSubmitted(false);
              setFormData({ email: '' });
            }}
            className="text-sm text-primary-600 hover:text-primary-500 transition-colors"
          >
            Try a different email address
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isLoading ? 'form--loading' : ''}`}>
      <form onSubmit={handleSubmit} className="space-y-6" autoComplete="on" noValidate>
        {generalError && (
          <div className="form-validation-summary">
            <div className="form-validation-summary-title">
              Reset Failed
            </div>
            <ul className="form-validation-summary-list">
              <li className="form-validation-summary-item">{generalError}</li>
            </ul>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="forgot-email" className="form-label form-label--required">
            Email Address
          </label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
            className={`form-input ${errors.email ? 'form-input--error' : ''}`}
            placeholder="Enter your email address"
            aria-describedby={errors.email ? 'forgot-email-error' : undefined}
          />
          {errors.email && (
            <div id="forgot-email-error" className="form-error" role="alert">
              {errors.email}
            </div>
          )}
        </div>

        <div className="form-actions form-actions--full">
          <button
            type="submit"
            disabled={isLoading}
            className={`btn btn--primary btn--full ${isLoading ? 'btn--loading' : ''}`}
            aria-describedby={isLoading ? 'forgot-loading' : undefined}
          >
            {isLoading ? 'Sending reset link...' : 'Send Reset Link'}
          </button>
          {isLoading && (
            <span id="forgot-loading" className="sr-only">
              Please wait while we send your reset link
            </span>
          )}
        </div>
      </form>
    </div>
  );
}