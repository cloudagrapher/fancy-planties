'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import with no SSR to prevent hydration issues
const VerificationCodeInput = dynamic(
  () => import('@/components/auth/VerificationCodeInput'),
  { ssr: false }
);

export interface EmailVerificationClientProps {
  email: string;
}

export default function EmailVerificationClient({ email }: EmailVerificationClientProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const router = useRouter();

  // Refs for cleanup and request deduplication
  const redirectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isRequestInFlightRef = useRef(false);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clear any pending timeouts when component unmounts
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Prevent multiple simultaneous requests
    if (isRequestInFlightRef.current || success) {
      return;
    }

    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    // Mark request as in-flight
    isRequestInFlightRef.current = true;
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
        // Use safe navigation with error handling
        redirectTimeoutRef.current = setTimeout(() => {
          try {
            const targetUrl = data.redirectTo || '/dashboard';
            // Use replace to avoid back button issues
            router.replace(targetUrl);
          } catch (navError) {
            console.error('Navigation error:', navError);
            // Fallback to direct navigation
            window.location.replace('/dashboard');
          }
        }, 1500);
      } else {
        // Handle different error types
        switch (data.error) {
          case 'CODE_EXPIRED':
            setError('This code has expired. Please request a new one.');
            break;
          case 'CODE_INVALID':
            setError('Invalid code. Please check and try again.');
            break;
          case 'TOO_MANY_ATTEMPTS':
            setError('Too many attempts. Please request a new code.');
            break;
          case 'ALREADY_VERIFIED':
            setError('Your email is already verified.');
            redirectTimeoutRef.current = setTimeout(() => {
              try {
                router.replace('/dashboard');
              } catch (navError) {
                console.error('Navigation error:', navError);
                window.location.replace('/dashboard');
              }
            }, 2000);
            break;
          default:
            setError(data.message || 'Verification failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
      // Reset request flag
      isRequestInFlightRef.current = false;
    }
  }, [code, email, router, success]);

  // Auto-submit when code is complete
  useEffect(() => {
    if (code.length === 6 && !isLoading && !success && !isRequestInFlightRef.current) {
      handleSubmit();
    }
  }, [code, isLoading, success, handleSubmit]);

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
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
        setResendCooldown(data.cooldownSeconds || 60);
        setCode(''); // Clear the input
        setError(''); // Clear any existing errors
      } else {
        setError(data.message || 'Failed to resend code. Please try again.');
        if (data.cooldownSeconds) {
          setResendCooldown(data.cooldownSeconds);
        }
      }
    } catch (error) {
      console.error('Resend error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
    if (error) {
      setError(''); // Clear error when user starts typing
    }
  };

  if (success) {
    return (
      <div className="card card--mint text-center">
        <div className="flex-center mb-4">
          <div className="w-16 h-16 rounded-full bg-mint-200 flex-center">
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
        </div>
        <h3 className="text-xl font-semibold text-mint-900 mb-2">
          Email verified successfully! 🎉
        </h3>
        <p className="text-mint-700 mb-4">
          Welcome to Fancy Planties! Redirecting you to your dashboard...
        </p>
        <div className="spinner mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="card card--dreamy">
      <form onSubmit={handleSubmit} className="space-y-6" role="form">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-mint-100 flex-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-mint-600"
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
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
            Enter verification code
          </h3>
          <p className="text-sm text-neutral-600">
            We've sent a 6-digit code to your email. Enter it below to verify your account.
          </p>
        </div>

        <div className="space-y-4">
          <VerificationCodeInput
            value={code}
            onChange={handleCodeChange}
            disabled={isLoading}
            error={error}
          />

          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isResending || isLoading}
              className={`
                text-sm font-medium transition-colors
                ${resendCooldown > 0 || isResending || isLoading
                  ? 'text-neutral-400 cursor-not-allowed'
                  : 'text-mint-600 hover:text-mint-700 cursor-pointer'
                }
              `}
            >
              {isResending
                ? 'Sending...'
                : resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : 'Didn\'t receive the code? Resend it'
              }
            </button>
          </div>
        </div>

        {/* Manual submit button for accessibility */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className={`
              btn btn--primary
              ${isLoading ? 'btn--loading' : ''}
            `}
            style={{ width: '100%' }}
          >
            {isLoading ? (
              <>
                <div className="spinner mr-2"></div>
                Verifying...
              </>
            ) : (
              'Verify Email'
            )}
          </button>
        </div>

        <div className="text-center">
          <p className="text-xs text-neutral-500">
            Having trouble? Check your spam folder or{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isResending}
              className="text-mint-600 hover:text-mint-700 underline"
            >
              request a new code
            </button>
          </p>
        </div>
      </form>
    </div>
  );
}