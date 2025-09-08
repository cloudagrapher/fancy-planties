'use client';

import { useEffect } from 'react';
import { useOffline } from '@/hooks/useOffline';

/**
 * OfflineManager - Handles offline functionality and storage management
 * This component should be included in the app layout to manage offline state
 */
export function OfflineManager() {
  const {
    isOnline,
    pendingEntries,
    isSyncing,
    cacheOfflineData,
    syncPendingEntries,
    checkStorageQuota,
    cleanupOldCache,
  } = useOffline();

  // Cache data when app loads and user is online
  useEffect(() => {
    if (isOnline) {
      cacheOfflineData();
    }
  }, [isOnline, cacheOfflineData]);

  // Periodic storage quota check and cleanup
  useEffect(() => {
    const checkStorage = async () => {
      const quota = await checkStorageQuota();
      
      // If storage is getting full, clean up old cache
      if (quota.percentUsed > 75) {
        cleanupOldCache(24 * 3); // Clean cache older than 3 days
      }
      
      // If still very full, clean more aggressively
      if (quota.percentUsed > 90) {
        cleanupOldCache(24); // Clean cache older than 1 day
      }
    };

    // Check storage on mount and then every 5 minutes
    checkStorage();
    const interval = setInterval(checkStorage, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkStorageQuota, cleanupOldCache]);

  // Auto-sync pending entries when coming back online
  useEffect(() => {
    if (isOnline && pendingEntries.length > 0 && !isSyncing) {
      syncPendingEntries();
    }
  }, [isOnline, pendingEntries.length, isSyncing, syncPendingEntries]);

  // Show offline indicator (optional - can be styled as needed)
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 text-sm z-50">
        You are offline. {pendingEntries.length > 0 && `${pendingEntries.length} pending changes will sync when online.`}
      </div>
    );
  }

  // Show syncing indicator
  if (isSyncing) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-blue-500 text-white text-center py-2 text-sm z-50">
        Syncing {pendingEntries.length} pending changes...
      </div>
    );
  }

  return null;
}