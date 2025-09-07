'use client';

import { useEffect, useState } from 'react';
import { useServiceWorker } from '@/lib/utils/service-worker';
import { useOffline } from '@/hooks/useOffline';

/**
 * Service Worker Provider Component
 * Handles service worker registration and update notifications
 */
export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  const { register, skipWaiting, cacheOfflineData } = useServiceWorker();
  const { cacheOfflineData: cacheData } = useOffline();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    // Register service worker on mount
    register();

    // Listen for update available
    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
      setShowUpdatePrompt(true);
    };

    // Listen for sync complete
    const handleSyncComplete = (event: CustomEvent) => {
      console.log('Sync completed:', event.detail);
      // Refresh cached data after sync
      cacheData();
    };

    window.addEventListener('sw-update-available', handleUpdateAvailable);
    window.addEventListener('sw-sync-complete', handleSyncComplete as EventListener);

    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
      window.removeEventListener('sw-sync-complete', handleSyncComplete as EventListener);
    };
  }, [register, cacheData]);

  const handleUpdateApp = () => {
    skipWaiting();
    setShowUpdatePrompt(false);
    // Reload the page to get the new version
    window.location.reload();
  };

  const dismissUpdate = () => {
    setShowUpdatePrompt(false);
  };

  return (
    <>
      {children}
      
      {/* Update Available Notification */}
      {showUpdatePrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary-200 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900">
                  App Update Available
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  A new version of Fancy Planties is available with improvements and bug fixes.
                </p>
                
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleUpdateApp}
                    className="px-3 py-1.5 bg-primary-200 text-primary-800 text-sm font-medium rounded-md hover:bg-primary-300 transition-colors"
                  >
                    Update Now
                  </button>
                  <button
                    onClick={dismissUpdate}
                    className="px-3 py-1.5 text-gray-600 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
                  >
                    Later
                  </button>
                </div>
              </div>
              
              <button
                onClick={dismissUpdate}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}