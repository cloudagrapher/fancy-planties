'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Auth error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div className="text-5xl">🔐</div>
          <h2 className="text-xl font-bold text-gray-900">
            Authentication error
          </h2>
          <p className="text-gray-600">
            Something went wrong during authentication. Please try again.
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={reset} className="btn btn--primary btn--full">
              Try again
            </button>
            <Link href="/auth/signin" className="btn btn--ghost btn--full">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
