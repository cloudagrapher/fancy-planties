'use client';

import { useOffline } from '@/hooks/useOffline';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Network Status Indicator Component
 * Shows online/offline status and sync information
 */
export function NetworkStatus() {
  const { 
    isOnline, 
    isSyncing, 
    pendingEntries, 
    lastSyncTime,
    syncPendingEntries 
  } = useOffline();
  
  const [showStatus, setShowStatus] = useState(false);
  const [justWentOnline, setJustWentOnline] = useState(false);

  // Show status indicator when offline or when there are pending entries
  useEffect(() => {
    setShowStatus(!isOnline || pendingEntries.length > 0 || isSyncing);
  }, [isOnline, pendingEntries.length, isSyncing]);

  // Handle coming back online
  useEffect(() => {
    if (isOnline && !justWentOnline) {
      setJustWentOnline(true);
      const timer = setTimeout(() => setJustWentOnline(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, justWentOnline]);

  if (!showStatus && !justWentOnline) {
    return null;
  }

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (isSyncing) return 'bg-yellow-500';
    if (pendingEntries.length > 0) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isSyncing) return 'Syncing...';
    if (pendingEntries.length > 0) return `${pendingEntries.length} pending`;
    return 'Online';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />;
    if (isSyncing) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (pendingEntries.length > 0) return <AlertCircle className="w-4 h-4" />;
    return <Wifi className="w-4 h-4" />;
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <div 
        className={`
          flex items-center gap-2 px-3 py-2 rounded-full text-white text-sm font-medium
          ${getStatusColor()} shadow-lg backdrop-blur-sm
          transition-all duration-300 ease-in-out
          ${showStatus || justWentOnline ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
        `}
      >
        {getStatusIcon()}
        <span>{getStatusText()}</span>
        
        {/* Manual sync button when there are pending entries */}
        {isOnline && pendingEntries.length > 0 && !isSyncing && (
          <button
            onClick={syncPendingEntries}
            className="ml-1 p-1 hover:bg-white/20 rounded-full transition-colors"
            title="Sync now"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>
      
      {/* Last sync time */}
      {lastSyncTime && (isOnline || justWentOnline) && (
        <div className="mt-1 text-xs text-gray-600 text-right">
          Last sync: {new Date(lastSyncTime).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

/**
 * Offline Banner Component
 * Shows a prominent banner when offline with cached data info
 */
export function OfflineBanner() {
  const { isOnline, hasCachedData, offlineData } = useOffline();

  if (isOnline) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <WifiOff className="w-5 h-5 text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              You're currently offline
            </p>
            {hasCachedData ? (
              <p className="text-xs text-yellow-700">
                Viewing cached data from {offlineData?.lastSync ? 
                  new Date(offlineData.lastSync).toLocaleString() : 'earlier'}
              </p>
            ) : (
              <p className="text-xs text-yellow-700">
                No cached data available. Connect to internet to load your plants.
              </p>
            )}
          </div>
        </div>
        
        {hasCachedData && (
          <div className="text-xs text-yellow-700">
            {offlineData?.plants?.length || 0} plants cached
          </div>
        )}
      </div>
    </div>
  );
}