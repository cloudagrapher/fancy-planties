'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInSchema, type SignInInput } from '@/lib/auth/validation';

export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  
  const [formData, setFormData] = useState<SignInInput>({
    email: '',
    password: '',
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
      const validation = signInSchema.safeParse(formData);
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
      const response = await fetch('/api/auth/signin', {
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
          setGeneralError(result.error || 'Sign in failed');
        }
        setIsLoading(false);
        return;
      }

      // Success - check if email verification is required
      if (result.requiresVerification) {
        // Redirect to email verification page
        router.push('/auth/verify-email');
        router.refresh();
      } else {
        // Success - redirect to dashboard or intended page
        router.push(redirectTo);
        router.refresh();
      }
      
    } catch (error) {
      console.error('Sign in error:', error);
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
      <form onSubmit={handleSubmit} className="space-y-6" autoComplete="on" noValidate>
        {generalError && (
          <div className="form-validation-summary">
            <div className="form-validation-summary-title">
              Sign In Failed
            </div>
            <ul className="form-validation-summary-list">
              <li className="form-validation-summary-item">{generalError}</li>
            </ul>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="signin-email" className="form-label form-label--required">
            Email Address
          </label>
          <input
            id="signin-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
            className={`form-input ${errors.email ? 'form-input--error' : ''}`}
            placeholder="Enter your email address"
            aria-describedby={errors.email ? 'signin-email-error' : undefined}
          />
          {errors.email && (
            <div id="signin-email-error" className="form-error" role="alert">
              {errors.email}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="signin-password" className="form-label form-label--required">
            Password
          </label>
          <input
            id="signin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={formData.password}
            onChange={handleChange}
            className={`form-input ${errors.password ? 'form-input--error' : ''}`}
            placeholder="Enter your password"
            aria-describedby={errors.password ? 'signin-password-error' : undefined}
          />
          {errors.password && (
            <div id="signin-password-error" className="form-error" role="alert">
              {errors.password}
            </div>
          )}
        </div>

        <div className="form-actions form-actions--full">
          <button
            type="submit"
            disabled={isLoading}
            className={`btn btn--primary btn--full ${isLoading ? 'btn--loading' : ''}`}
            aria-describedby={isLoading ? 'signin-loading' : undefined}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
          {isLoading && (
            <span id="signin-loading" className="sr-only">
              Please wait while we sign you in
            </span>
          )}
        </div>

        <div className="text-center mt-4">
          <a 
            href="/auth/forgot-password" 
            className="text-sm text-primary-600 hover:text-primary-500 transition-colors py-2 px-4 inline-block"
          >
            Forgot your password?
          </a>
        </div>
      </form>
    </div>
  );
}