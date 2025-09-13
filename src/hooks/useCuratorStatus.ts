'use client';

import { useState, useEffect } from 'react';
import { checkCuratorStatus } from '@/lib/auth/client';

interface CuratorStatus {
  isCurator: boolean;
  isAuthenticated: boolean;
  isVerified: boolean;
  loading: boolean;
}

export function useCuratorStatus() {
  const [status, setStatus] = useState<CuratorStatus>({
    isCurator: false,
    isAuthenticated: false,
    isVerified: false,
    loading: true,
  });

  useEffect(() => {
    async function fetchStatus() {
      try {
        const curatorStatus = await checkCuratorStatus();
        setStatus({
          ...curatorStatus,
          loading: false,
        });
      } catch (error) {
        console.error('Failed to fetch curator status:', error);
        setStatus({
          isCurator: false,
          isAuthenticated: false,
          isVerified: false,
          loading: false,
        });
      }
    }

    fetchStatus();
  }, []);

  const refresh = async () => {
    setStatus(prev => ({ ...prev, loading: true }));
    try {
      const curatorStatus = await checkCuratorStatus();
      setStatus({
        ...curatorStatus,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to refresh curator status:', error);
      setStatus({
        isCurator: false,
        isAuthenticated: false,
        isVerified: false,
        loading: false,
      });
    }
  };

  return {
    ...status,
    refresh,
  };
}