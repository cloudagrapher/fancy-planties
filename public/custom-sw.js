// Custom Service Worker for Fancy Planties
// Handles offline functionality, background sync, and caching

const CACHE_NAME = 'fancy-planties-v1';
const OFFLINE_DATA_CACHE = 'fancy-planties-offline-data';
const STATIC_CACHE = 'fancy-planties-static';

// Files to cache for offline use
const STATIC_FILES = [
  '/',
  '/dashboard/plants',
  '/dashboard/care',
  '/dashboard/propagation',
  '/dashboard/profile',
  '/manifest.json',
  '/icon.svg',
];

// API endpoints that should be cached
const CACHEABLE_APIS = [
  '/api/offline/data',
  '/api/plant-instances',
  '/api/propagations',
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== OFFLINE_DATA_CACHE && 
                cacheName !== STATIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and external URLs
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  } else if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(handleStaticAssets(request));
  } else {
    event.respondWith(handlePageRequest(request));
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses for offline data API
    if (networkResponse.ok && url.pathname === '/api/offline/data') {
      const cache = await caches.open(OFFLINE_DATA_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed for API request:', url.pathname);
    
    // For offline data API, return cached version
    if (url.pathname === '/api/offline/data') {
      const cache = await caches.open(OFFLINE_DATA_CACHE);
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Return offline response for other APIs
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'This feature requires an internet connection' 
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAssets(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Handle page requests with network-first, fallback to cache
async function handlePageRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful page responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed for page request:', request.url);
    
    // Try to serve from cache
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await cache.match('/dashboard/plants');
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    throw error;
  }
}

// Background sync for offline care logging
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'care-sync') {
    event.waitUntil(syncPendingCareEntries());
  }
});

// Sync pending care entries when back online
async function syncPendingCareEntries() {
  try {
    // Get pending entries from IndexedDB or localStorage
    const pendingEntries = await getPendingEntries();
    
    if (pendingEntries.length === 0) {
      return;
    }
    
    console.log('Syncing', pendingEntries.length, 'pending care entries');
    
    const response = await fetch('/api/offline/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pendingEntries }),
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Sync completed:', result);
      
      // Clear synced entries
      await clearSyncedEntries(result.results);
      
      // Notify clients about successful sync
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SYNC_COMPLETE',
          data: result
        });
      });
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Helper function to get pending entries (placeholder)
async function getPendingEntries() {
  // In a real implementation, this would read from IndexedDB
  // For now, return empty array as entries are managed by the React app
  return [];
}

// Helper function to clear synced entries (placeholder)
async function clearSyncedEntries(results) {
  // In a real implementation, this would update IndexedDB
  console.log('Clearing synced entries:', results);
}

// Message handling for communication with the main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_OFFLINE_DATA':
      cacheOfflineData(data);
      break;
      
    case 'REGISTER_BACKGROUND_SYNC':
      // Register background sync when offline care entry is added
      self.registration.sync.register('care-sync');
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

// Cache offline data when requested
async function cacheOfflineData(data) {
  try {
    const cache = await caches.open(OFFLINE_DATA_CACHE);
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put('/api/offline/data', response);
    console.log('Offline data cached successfully');
  } catch (error) {
    console.error('Failed to cache offline data:', error);
  }
}

// Push notification handling (for future implementation)
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  const options = {
    body: 'You have plants that need care!',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'care-reminder',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Care Tasks'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Fancy Planties', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/dashboard/care')
    );
  }
});

console.log('Fancy Planties Service Worker loaded');