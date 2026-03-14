'use client';

import Link from 'next/link';

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page">
      <div className="container">
        <div className="page-content">
          <div className="card card--dreamy">
            <div className="card-body text-center py-12">
              <div className="text-5xl mb-4">👤</div>
              <h2 className="text-xl font-bold text-neutral-900 mb-2">
                Couldn&apos;t load your profile
              </h2>
              <p className="text-neutral-600 mb-6 max-w-md mx-auto">
                {error.message || 'Something went wrong while loading your profile.'}
              </p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={reset} className="btn btn--primary">
                  Try Again
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
