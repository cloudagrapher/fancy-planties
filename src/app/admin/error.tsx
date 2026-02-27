'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div className="text-5xl">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900">
            Admin panel error
          </h2>
          <p className="text-gray-600">
            Something went wrong loading the admin panel. This has been logged.
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={reset} className="btn btn--primary btn--full">
              Try again
            </button>
            <Link href="/dashboard" className="btn btn--ghost btn--full">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
