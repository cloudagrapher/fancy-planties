'use client';

import { useCuratorStatus } from '@/hooks/useCuratorStatus';

interface CuratorOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireVerified?: boolean;
}

export function CuratorOnly({ 
  children, 
  fallback = null,
  requireVerified = true 
}: CuratorOnlyProps) {
  const { isCurator, isVerified, loading } = useCuratorStatus();

  if (loading) {
    return null; // Don't show anything while loading
  }

  const shouldShow = isCurator && (!requireVerified || isVerified);

  if (!shouldShow) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}