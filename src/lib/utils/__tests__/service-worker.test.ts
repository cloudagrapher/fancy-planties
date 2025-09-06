/**
 * Test for ServiceWorkerManager utility
 */

import { ServiceWorkerManager } from '../service-worker';

// Mock service worker registration
const mockRegistration = {
  addEventListener: jest.fn(),
  update: jest.fn(),
  waiting: {
    postMessage: jest.fn(),
  },
  active: {
    postMessage: jest.fn(),
  },
  installing: null,
};

// Mock navigator.serviceWorker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: jest.fn().mockResolvedValue(mockRegistration),
    addEventListener: jest.fn(),
    controller: null,
  },
  writable: true,
});

describe('ServiceWorkerManager', () => {
  let swManager: ServiceWorkerManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the mock to resolved state
    (navigator.serviceWorker.register as jest.Mock).mockResolvedValue(mockRegistration);
    
    // Reset singleton instance by clearing private registration
    swManager = ServiceWorkerManager.getInstance();
    (swManager as any).registration = null;
    (swManager as any).updateAvailable = false;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be a singleton', () => {
    const instance1 = ServiceWorkerManager.getInstance();
    const instance2 = ServiceWorkerManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should register service worker', async () => {
    const result = await swManager.register();
    
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/custom-sw.js', {
      scope: '/',
    });
    expect(result).toBe(true);
  });

  it('should handle registration failure', async () => {
    (navigator.serviceWorker.register as jest.Mock).mockRejectedValue(new Error('Registration failed'));
    
    const result = await swManager.register();
    expect(result).toBe(false);
  });

  it('should post messages to service worker', () => {
    // Simulate successful registration
    (swManager as any).registration = mockRegistration;
    
    const message = { type: 'TEST_MESSAGE', data: 'test' };
    swManager.postMessage(message);
    
    expect(mockRegistration.active.postMessage).toHaveBeenCalledWith(message);
  });

  it('should handle skip waiting', () => {
    (swManager as any).registration = mockRegistration;
    
    swManager.skipWaiting();
    
    expect(mockRegistration.waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('should cache offline data', () => {
    (swManager as any).registration = mockRegistration;
    
    const testData = { plants: [], propagations: [] };
    swManager.cacheOfflineData(testData);
    
    expect(mockRegistration.active.postMessage).toHaveBeenCalledWith({
      type: 'CACHE_OFFLINE_DATA',
      data: testData,
    });
  });

  it('should register background sync', () => {
    (swManager as any).registration = mockRegistration;
    
    swManager.registerBackgroundSync();
    
    expect(mockRegistration.active.postMessage).toHaveBeenCalledWith({
      type: 'REGISTER_BACKGROUND_SYNC',
    });
  });

  it('should return registration status', () => {
    expect(swManager.isRegistered()).toBe(false);
    
    (swManager as any).registration = mockRegistration;
    expect(swManager.isRegistered()).toBe(true);
  });
});