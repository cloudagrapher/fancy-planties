'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { passwordResetSchema, type PasswordResetInput } from '@/lib/auth/validation';

interface ResetPasswordFormProps {
  token: string;
}

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  
  const [formData, setFormData] = useState<PasswordResetInput>({
    token,
    password: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setGeneralError('');

    try {
      // Validate form data
      const validation = passwordResetSchema.safeParse(formData);
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
      const response = await fetch('/api/auth/reset-password', {
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
          setGeneralError(result.error || 'Failed to reset password');
        }
        return;
      }

      // Success
      setSuccess(true);
      
      // Redirect to sign in after a brief delay
      setTimeout(() => {
        router.push('/auth/signin?message=Password reset successful. Please sign in with your new password.');
      }, 2000);
      
    } catch (error) {
      console.error('Reset password error:', error);
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

  if (success) {
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
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Password Reset Successful! 🎉
        </h3>
        
        <p className="text-gray-600 mb-4">
          Your password has been updated successfully.
        </p>
        
        <p className="text-sm text-gray-500 mb-6">
          Redirecting you to the sign in page...
        </p>
        
        <div className="spinner mx-auto"></div>
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
          <label htmlFor="reset-password" className="form-label form-label--required">
            New Password
          </label>
          <input
            id="reset-password"
            name="password"
            type="password"
            autoComplete="new-password"
            data-new-password="true"
            required
            value={formData.password}
            onChange={handleChange}
            className={`form-input ${errors.password ? 'form-input--error' : ''}`}
            placeholder="Create a strong password"
            aria-describedby={`${errors.password ? 'reset-password-error ' : ''}reset-password-help`}
          />
          {errors.password && (
            <div id="reset-password-error" className="form-error" role="alert">
              {errors.password}
            </div>
          )}
          <div id="reset-password-help" className="form-help">
            Password must be at least 8 characters with uppercase, lowercase, and number
          </div>
        </div>

        <div className="form-actions form-actions--full">
          <button
            type="submit"
            disabled={isLoading}
            className={`btn btn--primary btn--full ${isLoading ? 'btn--loading' : ''}`}
            aria-describedby={isLoading ? 'reset-loading' : undefined}
          >
            {isLoading ? 'Updating password...' : 'Update Password'}
          </button>
          {isLoading && (
            <span id="reset-loading" className="sr-only">
              Please wait while we update your password
            </span>
          )}
        </div>
      </form>
    </div>
  );
}