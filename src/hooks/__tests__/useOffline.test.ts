import { renderHook, act } from '@testing-library/react';
import { useOffline } from '../useOffline';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock fetch
global.fetch = jest.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('useOffline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  it('should initialize with online status', () => {
    const { result } = renderHook(() => useOffline());
    
    expect(result.current.isOnline).toBe(true);
    expect(result.current.pendingEntries).toEqual([]);
    expect(result.current.hasCachedData).toBe(false);
  });

  it('should detect offline status', () => {
    const { result } = renderHook(() => useOffline());
    
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      window.dispatchEvent(new Event('offline'));
    });
    
    expect(result.current.isOnline).toBe(false);
  });

  it('should add pending care entries when offline', () => {
    const { result } = renderHook(() => useOffline());
    
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      window.dispatchEvent(new Event('offline'));
    });
    
    act(() => {
      const entryId = result.current.addPendingCareEntry({
        plantInstanceId: 1,
        careType: 'fertilizer',
        notes: 'Test care entry',
      });
      expect(entryId).toBeDefined();
    });
    
    expect(result.current.pendingEntries).toHaveLength(1);
    expect(result.current.pendingEntries[0]).toMatchObject({
      plantInstanceId: 1,
      careType: 'fertilizer',
      notes: 'Test care entry',
    });
  });

  it('should cache offline data', async () => {
    const mockData = {
      plants: [{ id: 1, name: 'Test Plant' }],
      propagations: [],
      careHistory: [],
      lastSync: '2023-01-01T00:00:00Z',
    };
    
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });
    
    const { result } = renderHook(() => useOffline());
    
    await act(async () => {
      await result.current.cacheOfflineData();
    });
    
    expect(fetch).toHaveBeenCalledWith('/api/offline/data');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'fancy-planties-offline-data',
      JSON.stringify(mockData)
    );
  });

  it('should sync pending entries when back online', async () => {
    const { result } = renderHook(() => useOffline());
    
    // Add pending entry while offline
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      result.current.addPendingCareEntry({
        plantInstanceId: 1,
        careType: 'fertilizer',
      });
    });
    
    // Mock successful sync response
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        results: [{ success: true, entry: { id: 'test-id' } }],
      }),
    });
    
    // Go back online and sync
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      await result.current.syncPendingEntries();
    });
    
    expect(fetch).toHaveBeenCalledWith('/api/offline/sync', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));
  });

  it('should clear cache', () => {
    const { result } = renderHook(() => useOffline());
    
    act(() => {
      result.current.clearCache();
    });
    
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('fancy-planties-offline-data');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('fancy-planties-pending-entries');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('fancy-planties-last-sync');
  });

  it('should return cached data when offline', () => {
    const mockCachedData = {
      plants: [{ id: 1, name: 'Cached Plant' }],
      propagations: [],
      careHistory: [],
      lastSync: '2023-01-01T00:00:00Z',
    };
    
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockCachedData));
    
    const { result } = renderHook(() => useOffline());
    
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false });
    });
    
    const plantData = result.current.getPlantData();
    expect(plantData).toEqual(mockCachedData.plants);
  });

  it('should return null for plant data when online', () => {
    const { result } = renderHook(() => useOffline());
    
    const plantData = result.current.getPlantData();
    expect(plantData).toBeNull();
  });
});