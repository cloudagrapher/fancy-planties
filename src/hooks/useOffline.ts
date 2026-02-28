'use client';

import { useState, useEffect, useCallback } from 'react';

export interface OfflinePlant {
  id: number;
  nickname: string | null;
  location: string | null;
  plant: {
    id: number;
    family: string;
    genus: string;
    species: string;
    commonName: string;
    careInstructions: string | null;
  } | null;
  [key: string]: unknown;
}

export interface OfflinePropagation {
  id: number;
  nickname: string | null;
  status: string;
  [key: string]: unknown;
}

export interface OfflineCareEntry {
  id: number;
  careType: string;
  careDate: string;
  [key: string]: unknown;
}

export interface OfflineData {
  plants: OfflinePlant[];
  propagations: OfflinePropagation[];
  careHistory: OfflineCareEntry[];
  lastSync: string;
}

interface SyncResultEntry {
  success: boolean;
  entry: { id: string };
}

export interface PendingCareEntry {
  id: string;
  plantInstanceId: number;
  careType: 'fertilizer' | 'repot' | 'water' | 'prune' | 'inspect' | 'flush' | 'other';
  notes?: string;
  timestamp: string;
}

/**
 * Hook for managing offline functionality
 * Handles network status, offline data caching, and sync operations
 */
export function useOffline() {
  const [isOnline, setIsOnline] = useState(true);
  const [offlineData, setOfflineData] = useState<OfflineData | null>(null);
  const [pendingEntries, setPendingEntries] = useState<PendingCareEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Initialize network status
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    };

    // Set initial status
    updateOnlineStatus();

    // Listen for network changes
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Load cached data and pending entries from localStorage
  useEffect(() => {
    const loadCachedData = () => {
      try {
        const cached = localStorage.getItem('fancy-planties-offline-data');
        if (cached) {
          setOfflineData(JSON.parse(cached));
        }

        const pending = localStorage.getItem('fancy-planties-pending-entries');
        if (pending) {
          setPendingEntries(JSON.parse(pending));
        }

        const lastSync = localStorage.getItem('fancy-planties-last-sync');
        if (lastSync) {
          setLastSyncTime(lastSync);
        }
      } catch (error) {
        console.error('Error loading cached data:', error);
      }
    };

    loadCachedData();
  }, []);

  // NOTE: Auto-sync on reconnect is handled by OfflineManager component,
  // which has proper dependency tracking. Removed duplicate effect here
  // that had missing deps (pendingEntries.length, syncPendingEntries).

  /**
   * Cache data for offline use
   */
  const cacheOfflineData = useCallback(async () => {
    if (!isOnline) return;

    try {
      const response = await fetch('/api/offline/data');
      if (response.ok) {
        const data = await response.json();
        setOfflineData(data);
        localStorage.setItem('fancy-planties-offline-data', JSON.stringify(data));
        localStorage.setItem('fancy-planties-last-sync', data.lastSync);
        setLastSyncTime(data.lastSync);
      }
    } catch (error) {
      console.error('Error caching offline data:', error);
    }
  }, [isOnline]);

  /**
   * Add a care entry to pending queue when offline
   */
  const addPendingCareEntry = useCallback((entry: Omit<PendingCareEntry, 'id' | 'timestamp'>) => {
    const newEntry: PendingCareEntry = {
      ...entry,
      id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    const updated = [...pendingEntries, newEntry];
    setPendingEntries(updated);
    localStorage.setItem('fancy-planties-pending-entries', JSON.stringify(updated));

    return newEntry.id;
  }, [pendingEntries]);

  /**
   * Sync pending entries when back online
   */
  const syncPendingEntries = useCallback(async () => {
    if (!isOnline || pendingEntries.length === 0 || isSyncing) return;

    setIsSyncing(true);
    try {
      const response = await fetch('/api/offline/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pendingEntries }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Remove successfully synced entries
        const successfulIds = result.results
          .filter((r: SyncResultEntry) => r.success)
          .map((r: SyncResultEntry) => r.entry.id);

        const remaining = pendingEntries.filter(entry => !successfulIds.includes(entry.id));
        setPendingEntries(remaining);
        localStorage.setItem('fancy-planties-pending-entries', JSON.stringify(remaining));

        // Refresh offline data after sync
        await cacheOfflineData();
      }
    } catch (error) {
      console.error('Error syncing pending entries:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, pendingEntries, isSyncing, cacheOfflineData]);

  /**
   * Get plant data (from cache if offline, from server if online)
   */
  const getPlantData = useCallback(() => {
    if (isOnline) {
      // Return null to indicate should fetch from server
      return null;
    }
    
    return offlineData?.plants || [];
  }, [isOnline, offlineData]);

  /**
   * Get propagation data (from cache if offline, from server if online)
   */
  const getPropagationData = useCallback(() => {
    if (isOnline) {
      return null;
    }
    
    return offlineData?.propagations || [];
  }, [isOnline, offlineData]);

  /**
   * Check if we have cached data available
   */
  const hasCachedData = useCallback(() => {
    return offlineData !== null;
  }, [offlineData]);

  /**
   * Clear all cached data
   */
  const clearCache = useCallback(() => {
    setOfflineData(null);
    setPendingEntries([]);
    setLastSyncTime(null);
    localStorage.removeItem('fancy-planties-offline-data');
    localStorage.removeItem('fancy-planties-pending-entries');
    localStorage.removeItem('fancy-planties-last-sync');
  }, []);

  return {
    // Network status
    isOnline,
    
    // Data management
    offlineData,
    pendingEntries,
    hasCachedData: hasCachedData(),
    
    // Sync status
    isSyncing,
    lastSyncTime,
    
    // Data access
    getPlantData,
    getPropagationData,
    
    // Actions
    cacheOfflineData,
    addPendingCareEntry,
    syncPendingEntries,
    clearCache,
  };
}