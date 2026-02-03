import { getCuratorStatus } from '@/lib/auth/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function TestAdminAccess() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const status = await getCuratorStatus();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Admin Access Test
          </h1>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h2 className="font-semibold text-gray-800 mb-2">Current Status</h2>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Authenticated:</span> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    status.isAuthenticated 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {status.isAuthenticated ? '✓ Yes' : '✗ No'}
                  </span>
                </p>
                <p>
                  <span className="font-medium">Email Verified:</span> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    status.isVerified 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {status.isVerified ? '✓ Yes' : '✗ No'}
                  </span>
                </p>
                <p>
                  <span className="font-medium">Curator:</span> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    status.isCurator 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {status.isCurator ? '✓ Yes' : '✗ No'}
                  </span>
                </p>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Admin Access Test</h3>
              <p className="text-gray-600 mb-4">
                Click the button below to test admin route protection:
              </p>
              
              <Link 
                href="/admin"
                className={`inline-block px-4 py-2 rounded font-medium ${
                  status.isCurator
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                }`}
              >
                Access Admin Dashboard
              </Link>
              
              {!status.isAuthenticated && (
                <p className="mt-2 text-sm text-red-600">
                  ⚠️ You need to sign in first
                </p>
              )}
              
              {status.isAuthenticated && !status.isVerified && (
                <p className="mt-2 text-sm text-orange-600">
                  ⚠️ You need to verify your email first
                </p>
              )}
              
              {status.isAuthenticated && status.isVerified && !status.isCurator && (
                <p className="mt-2 text-sm text-red-600">
                  ⚠️ You need curator privileges to access the admin dashboard
                </p>
              )}
              
              {status.isCurator && (
                <p className="mt-2 text-sm text-green-600">
                  ✓ You have curator access and can access the admin dashboard
                </p>
              )}
            </div>

            <div className="flex space-x-4">
              <Link 
                href="/dashboard"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Back to Dashboard
              </Link>
              
              {!status.isAuthenticated && (
                <Link 
                  href="/auth/signin"
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}