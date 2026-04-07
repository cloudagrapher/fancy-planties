import Link from 'next/link';

export default function DashboardNotFound() {
  return (
    <div className="page">
      <div className="container">
        <div className="page-content">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-6xl mb-4">🌿</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Page not found
            </h1>
            <p className="text-gray-600 mb-6 max-w-sm">
              This page hasn&apos;t sprouted yet. Head back to your dashboard to
              check on your plants.
            </p>
            <Link href="/dashboard" className="btn btn--primary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
