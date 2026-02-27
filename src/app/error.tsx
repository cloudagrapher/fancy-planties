'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div className="text-6xl">🥀</div>
          <h1 className="text-2xl font-bold text-gray-900">
            Something went wrong
          </h1>
          <p className="text-gray-600">
            Don&apos;t worry — your plants are fine. Let&apos;s try that again.
          </p>
          <button
            onClick={reset}
            className="btn btn--primary btn--full"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
