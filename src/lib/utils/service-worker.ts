'use client';

/**
 * Service Worker Registration and Management
 * Handles registration, updates, and communication with the service worker
 */

export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private registration: ServiceWorkerRegistration | null = null;
  private updateAvailable = false;

  private constructor() {}

  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }

  /**
   * Register the service worker
   */
  async register(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      if (process.env.NODE_ENV === 'development') console.log('Service Worker not supported');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/custom-sw.js', {
        scope: '/',
      });

      if (process.env.NODE_ENV === 'development') console.log('Service Worker registered successfully');

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.updateAvailable = true;
              this.notifyUpdateAvailable();
            }
          });
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', this.handleMessage.bind(this));

      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  /**
   * Update the service worker
   */
  async update(): Promise<void> {
    if (this.registration) {
      await this.registration.update();
    }
  }

  /**
   * Skip waiting and activate new service worker
   */
  skipWaiting(): void {
    if (this.registration?.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  /**
   * Send message to service worker
   */
  postMessage(message: any): void {
    if (this.registration?.active) {
      this.registration.active.postMessage(message);
    }
  }

  /**
   * Cache offline data in service worker
   */
  cacheOfflineData(data: any): void {
    this.postMessage({
      type: 'CACHE_OFFLINE_DATA',
      data,
    });
  }

  /**
   * Register background sync for care entries
   */
  registerBackgroundSync(): void {
    this.postMessage({
      type: 'REGISTER_BACKGROUND_SYNC',
    });
  }

  /**
   * Handle messages from service worker
   */
  private handleMessage(event: MessageEvent): void {
    const { type, data } = event.data;

    switch (type) {
      case 'SYNC_COMPLETE':
        if (process.env.NODE_ENV === 'development') console.log('Background sync completed:', data);
        // Dispatch custom event for React components to listen to
        window.dispatchEvent(new CustomEvent('sw-sync-complete', { detail: data }));
        break;

      default:
        if (process.env.NODE_ENV === 'development') console.log('Unknown message from service worker:', type);
    }
  }

  /**
   * Notify about available update
   */
  private notifyUpdateAvailable(): void {
    window.dispatchEvent(new CustomEvent('sw-update-available'));
  }

  /**
   * Check if update is available
   */
  isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }

  /**
   * Get registration status
   */
  isRegistered(): boolean {
    return this.registration !== null;
  }
}

/**
 * Hook for service worker functionality
 */
export function useServiceWorker() {
  const swManager = ServiceWorkerManager.getInstance();

  return {
    register: () => swManager.register(),
    update: () => swManager.update(),
    skipWaiting: () => swManager.skipWaiting(),
    cacheOfflineData: (data: any) => swManager.cacheOfflineData(data),
    registerBackgroundSync: () => swManager.registerBackgroundSync(),
    isUpdateAvailable: () => swManager.isUpdateAvailable(),
    isRegistered: () => swManager.isRegistered(),
  };
}