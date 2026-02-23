import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div className="text-6xl">🌿</div>
          <h1 className="text-2xl font-bold text-gray-900">
            Page not found
          </h1>
          <p className="text-gray-600">
            Looks like this page hasn&apos;t sprouted yet. Let&apos;s get you back to your garden.
          </p>
          <Link
            href="/dashboard"
            className="btn btn--primary btn--full inline-flex"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
