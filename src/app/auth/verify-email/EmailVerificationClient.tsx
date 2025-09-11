'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface EmailVerificationClientProps {
  email: string;
}

export default function EmailVerificationClient({ email }: EmailVerificationClientProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const router = useRouter();

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        // Redirect to dashboard after a brief delay
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh(); // Refresh to update auth state
        }, 1500);
      } else {
        setError(data.message || 'Verification failed. Please try again.');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResendCooldown(60); // 60 second cooldown
        setCode(''); // Clear the input
      } else {
        setError(data.message || 'Failed to resend code. Please try again.');
        if (data.cooldownSeconds) {
          setResendCooldown(data.cooldownSeconds);
        }
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    setError('');
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
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
        <h3 className="mt-2 text-lg font-medium text-gray-900">
          Email verified successfully!
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Redirecting you to the dashboard...
        </p>
      </div>
    );
  }

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="code" className="sr-only">
          Verification code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          value={code}
          onChange={handleCodeChange}
          placeholder="Enter 6-digit code"
          className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm text-center text-2xl tracking-widest"
          maxLength={6}
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm text-center">{error}</div>
      )}

      <div>
        <button
          type="submit"
          disabled={isLoading || code.length !== 6}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Verifying...' : 'Verify Email'}
        </button>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0 || isLoading}
          className="text-indigo-600 hover:text-indigo-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resendCooldown > 0
            ? `Resend code in ${resendCooldown}s`
            : 'Resend verification code'}
        </button>
      </div>
    </form>
  );
}