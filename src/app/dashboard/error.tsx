'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="page">
      <div className="container">
        <div className="page-content">
          <div className="card card--dreamy">
            <div className="card-body text-center py-12">
              <div className="text-5xl mb-4">🥀</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Something went wrong
              </h2>
              <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                We couldn&apos;t load this page. Your plants are still safe — let&apos;s try again.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button onClick={reset} className="btn btn--primary">
                  Try again
                </button>
                <Link href="/dashboard" className="btn btn--ghost">
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
