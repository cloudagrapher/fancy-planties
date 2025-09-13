'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCuratorStatus } from '@/hooks/useCuratorStatus';

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function AdminGuard({ 
  children, 
  fallback = <div>Access denied. Curator privileges required.</div>,
  redirectTo = '/dashboard'
}: AdminGuardProps) {
  const { isCurator, isAuthenticated, isVerified, loading } = useCuratorStatus();
  const router = useRouter();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/auth/signin');
        return;
      }
      
      if (!isVerified) {
        router.push('/auth/verify-email');
        return;
      }
      
      if (!isCurator) {
        setShouldRedirect(true);
        setTimeout(() => {
          router.push(redirectTo);
        }, 2000); // Show message for 2 seconds before redirect
        return;
      }
    }
  }, [loading, isAuthenticated, isVerified, isCurator, router, redirectTo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isVerified || !isCurator) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
          {fallback}
          {shouldRedirect && (
            <p className="mt-2 text-sm text-gray-600">
              Redirecting to dashboard...
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}