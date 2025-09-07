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
        return;
      }

      // Success - redirect to dashboard
      router.push('/dashboard');
      router.refresh();
      
    } catch (error) {
      console.error('Sign up error:', error);
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
        <label htmlFor="name" className="form-label form-label--required">
          Full Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          value={formData.name}
          onChange={handleChange}
          className={`form-input ${errors.name ? 'form-input--error' : ''}`}
          placeholder="Enter your full name"
        />
        {errors.name && (
          <div className="form-error">{errors.name}</div>
        )}
      </div>

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
          autoComplete="new-password"
          data-new-password="true"
          required
          value={formData.password}
          onChange={handleChange}
          className={`form-input ${errors.password ? 'form-input--error' : ''}`}
          placeholder="Create a strong password"
        />
        {errors.password && (
          <div className="form-error">{errors.password}</div>
        )}
        <div className="form-help">
          Password must be at least 8 characters with uppercase, lowercase, and number
        </div>
      </div>

      <div className="form-actions form-actions--full">
        <button
          type="submit"
          disabled={isLoading}
          className={`btn btn--primary btn--full ${isLoading ? 'btn--loading' : ''}`}
        >
          {isLoading ? 'Creating account...' : 'Create Account'}
        </button>
      </div>
    </form>
  );
}