// Optimized Service Worker for Fancy Planties
// Provides advanced caching, offline functionality, and performance optimization

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `fancy-planties-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `fancy-planties-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `fancy-planties-images-${CACHE_VERSION}`;
const API_CACHE = `fancy-planties-api-${CACHE_VERSION}`;

// Cache size limits
const CACHE_LIMITS = {
  [DYNAMIC_CACHE]: 50,
  [IMAGE_CACHE]: 100,
  [API_CACHE]: 30,
};

// Assets to cache immediately (critical resources)
const STATIC_ASSETS = [
  '/',
  '/dashboard/plants',
  '/dashboard/care', 
  '/dashboard/propagations',
  '/dashboard/profile',
  '/manifest.json',
  '/icon.svg',
];

// API endpoints to cache for offline access
const CACHEABLE_API_PATTERNS = [
  /^\/api\/plant-instances(\?.*)?$/,
  /^\/api\/plants\/search(\?.*)?$/,
  /^\/api\/propagations(\?.*)?$/,
  /^\/api\/care\/dashboard(\?.*)?$/,
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('SW: Installing optimized service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('SW: Caching critical static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Initialize other caches
      caches.open(DYNAMIC_CACHE),
      caches.open(IMAGE_CACHE),
      caches.open(API_CACHE),
    ])
    .then(() => {
      console.log('SW: Installation complete');
      return self.skipWaiting();
    })
    .catch((error) => {
      console.error('SW: Installation failed:', error);
    })
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('SW: Activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheName.includes(CACHE_VERSION)) {
              console.log('SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Claim all clients
      self.clients.claim(),
    ])
    .then(() => {
      console.log('SW: Activation complete');
    })
  );
});

// Fetch event - intelligent caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Route requests to appropriate handlers
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  } else if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(handleStaticAsset(request));
  } else if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
  } else if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
  } else {
    event.respondWith(handleGenericRequest(request));
  }
});

// Handle API requests with intelligent caching
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isCacheable = CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url.pathname));
  
  if (!isCacheable) {
    // Non-cacheable API requests (mutations) - network only
    try {
      return await fetch(request);
    } catch (error) {
      return createOfflineResponse('This action requires an internet connection');
    }
  }

  // Cacheable API requests - stale-while-revalidate
  const cache = await caches.open(API_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Start network request
  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        // Update cache with fresh data
        await cache.put(request, response.clone());
        await limitCacheSize(API_CACHE, CACHE_LIMITS[API_CACHE]);
      }
      return response;
    })
    .catch(() => null);

  // Return cached response immediately if available, otherwise wait for network
  if (cachedResponse) {
    // Return cached response and update in background
    networkPromise.catch(() => {}); // Prevent unhandled rejection
    return cachedResponse;
  } else {
    // No cache, wait for network
    const networkResponse = await networkPromise;
    return networkResponse || createOfflineResponse('Data not available offline');
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('SW: Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Handle image requests with optimized caching
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
      await cache.put(request, response.clone());
      await limitCacheSize(IMAGE_CACHE, CACHE_LIMITS[IMAGE_CACHE]);
    }
    return response;
  } catch (error) {
    // Return placeholder image for failed image requests
    return createPlaceholderImage();
  }
}

// Handle navigation with network-first, cache fallback
async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, response.clone());
      await limitCacheSize(DYNAMIC_CACHE, CACHE_LIMITS[DYNAMIC_CACHE]);
    }
    return response;
  } catch (error) {
    console.log('SW: Network failed for navigation, trying cache');
    
    // Try cached version
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to cached root page
    const rootResponse = await cache.match('/');
    if (rootResponse) {
      return rootResponse;
    }
    
    // Last resort: offline page
    return createOfflinePage();
  }
}

// Handle generic requests
async function handleGenericRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      await limitCacheSize(DYNAMIC_CACHE, CACHE_LIMITS[DYNAMIC_CACHE]);
    }
    return response;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    return cachedResponse || createOfflineResponse('Resource not available offline');
  }
}

// Utility functions
function isImageRequest(request) {
  const url = new URL(request.url);
  return /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(url.pathname) ||
         request.headers.get('accept')?.includes('image/');
}

async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxSize) {
    // Remove oldest entries (FIFO)
    const keysToDelete = keys.slice(0, keys.length - maxSize);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
  }
}

function createOfflineResponse(message) {
  return new Response(
    JSON.stringify({ 
      error: 'Offline', 
      message,
      timestamp: new Date().toISOString()
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    }
  );
}

function createOfflinePage() {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Fancy Planties - Offline</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: system-ui; text-align: center; padding: 2rem; }
        .offline { color: #666; }
      </style>
    </head>
    <body>
      <h1>🌱 Fancy Planties</h1>
      <div class="offline">
        <p>You're currently offline</p>
        <p>Please check your internet connection and try again</p>
      </div>
    </body>
    </html>
  `;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

function createPlaceholderImage() {
  // Simple 1x1 transparent pixel
  const pixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  return fetch(pixel);
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('SW: Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case 'care-log-sync':
      event.waitUntil(syncOfflineData('care-logs'));
      break;
    case 'plant-update-sync':
      event.waitUntil(syncOfflineData('plant-updates'));
      break;
    case 'propagation-sync':
      event.waitUntil(syncOfflineData('propagations'));
      break;
  }
});

// Sync offline data when connection is restored
async function syncOfflineData(type) {
  try {
    console.log(`SW: Syncing offline ${type}`);
    
    // Notify clients that sync is happening
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_START',
        data: { syncType: type }
      });
    });
    
    // Actual sync implementation would go here
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Notify clients that sync is complete
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        data: { syncType: type }
      });
    });
    
  } catch (error) {
    console.error(`SW: Failed to sync ${type}:`, error);
  }
}

// Message handling for client communication
self.addEventListener('message', (event) => {
  console.log('SW: Message received:', event.data);
  
  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CACHE_CLEAR':
      clearAllCaches();
      break;
    case 'CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage(status);
      });
      break;
  }
});

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  console.log('SW: All caches cleared');
}

// Get cache status for debugging
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    status[name] = keys.length;
  }
  
  return status;
}