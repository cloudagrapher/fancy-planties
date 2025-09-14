'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUpSchema, type SignUpInput } from '@/lib/auth/validation';

export default function SignUpForm() {
  const router = useRouter();
  
  const [formData, setFormData] = useState<SignUpInput>({
    email: '',
    password: '',
    name: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return;
    
    setIsLoading(true);
    setErrors({});
    setGeneralError('');

    try {
      // Validate form data
      const validation = signUpSchema.safeParse(formData);
      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        validation.error.issues.forEach((issue) => {
          const field = issue.path.join('.');
          fieldErrors[field] = issue.message;
        });
        setErrors(fieldErrors);
        setIsLoading(false);
        return;
      }

      // Submit to API
      const response = await fetch('/api/auth/signup', {
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
          setGeneralError(result.error || 'Sign up failed');
        }
        setIsLoading(false);
        return;
      }

      // Success - check if email verification is required
      if (result.requiresVerification) {
        // Redirect to email verification page with email parameter
        const searchParams = new URLSearchParams({ email: formData.email });
        router.push(`/auth/verify-email?${searchParams.toString()}`);
        router.refresh();
      } else {
        // Redirect to dashboard (fallback for already verified users)
        router.push('/dashboard');
        router.refresh();
      }
      
    } catch (error) {
      console.error('Sign up error:', error);
      setGeneralError('An unexpected error occurred. Please try again.');
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

  return (
    <div className={`${isLoading ? 'form--loading' : ''}`}>
      <form onSubmit={handleSubmit} className="space-y-6" autoComplete="on" noValidate role="form">
        {generalError && (
          <div className="form-validation-summary">
            <div className="form-validation-summary-title">
              Account Creation Failed
            </div>
            <ul className="form-validation-summary-list">
              <li className="form-validation-summary-item">{generalError}</li>
            </ul>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="signup-name" className="form-label form-label--required">
            Full Name
          </label>
          <input
            id="signup-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            value={formData.name}
            onChange={handleChange}
            className={`form-input ${errors.name ? 'form-input--error' : ''}`}
            placeholder="Enter your full name"
            aria-describedby={errors.name ? 'signup-name-error' : undefined}
          />
          {errors.name && (
            <div id="signup-name-error" className="form-error" role="alert">
              {errors.name}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="signup-email" className="form-label form-label--required">
            Email Address
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
            className={`form-input ${errors.email ? 'form-input--error' : ''}`}
            placeholder="Enter your email address"
            aria-describedby={errors.email ? 'signup-email-error' : undefined}
          />
          {errors.email && (
            <div id="signup-email-error" className="form-error" role="alert">
              {errors.email}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="signup-password" className="form-label form-label--required">
            Password
          </label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            data-new-password="true"
            required
            value={formData.password}
            onChange={handleChange}
            className={`form-input ${errors.password ? 'form-input--error' : ''}`}
            placeholder="Create a strong password"
            aria-describedby={`${errors.password ? 'signup-password-error ' : ''}signup-password-help`}
          />
          {errors.password && (
            <div id="signup-password-error" className="form-error" role="alert">
              {errors.password}
            </div>
          )}
          <div id="signup-password-help" className="form-help">
            Password must be at least 8 characters with uppercase, lowercase, and number
          </div>
        </div>

        <div className="form-actions form-actions--full">
          <button
            type="submit"
            disabled={isLoading}
            className={`btn btn--primary btn--full ${isLoading ? 'btn--loading' : ''}`}
            aria-describedby={isLoading ? 'signup-loading' : undefined}
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
          {isLoading && (
            <span id="signup-loading" className="sr-only">
              Please wait while we create your account
            </span>
          )}
        </div>
      </form>
    </div>
  );
}