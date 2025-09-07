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
        return;
      }

      // Success - redirect to dashboard or intended page
      router.push(redirectTo);
      router.refresh();
      
    } catch (error) {
      console.error('Sign in error:', error);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-token">
      {generalError && (
        <div className="form-error bg-salmon-50 border border-salmon-200 text-salmon-700 px-4 py-3 rounded-token-lg">
          {generalError}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="email" className="form-label form-label--required">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={formData.email}
          onChange={handleChange}
          className={`form-input ${errors.email ? 'form-input--error' : ''}`}
          placeholder="Enter your email"
        />
        {errors.email && (
          <div className="form-error">{errors.email}</div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="password" className="form-label form-label--required">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={formData.password}
          onChange={handleChange}
          className={`form-input ${errors.password ? 'form-input--error' : ''}`}
          placeholder="Enter your password"
        />
        {errors.password && (
          <div className="form-error">{errors.password}</div>
        )}
      </div>

      <div className="form-actions form-actions--full">
        <button
          type="submit"
          disabled={isLoading}
          className={`btn btn--primary btn--full ${isLoading ? 'btn--loading' : ''}`}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </div>
    </form>
  );
}