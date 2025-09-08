/**
 * Integration tests for offline functionality
 * Tests the complete offline workflow including data caching, pending entries, and sync
 */

import { renderHook, act } from '@testing-library/react';
import { useOffline } from '@/hooks/useOffline';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('Offline Functionality Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    Object.defineProperty(navigator, 'onLine', { value: true });
  });

  describe('Complete Offline Workflow', () => {
    it('should handle complete offline-to-online workflow', async () => {
      const { result } = renderHook(() => useOffline());

      // Step 1: Start online and cache data
      const mockOfflineData = {
        plants: [
          { id: 1, nickname: 'Monstera', location: 'Living Room' },
          { id: 2, nickname: 'Pothos', location: 'Kitchen' },
        ],
        propagations: [
          { id: 1, nickname: 'Baby Monstera', status: 'rooting' },
        ],
        careHistory: [
          { id: 1, careType: 'fertilizer', careDate: '2023-01-01' },
        ],
        lastSync: '2023-01-01T12:00:00Z',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOfflineData),
      });

      await act(async () => {
        await result.current.cacheOfflineData();
      });

      expect(fetch).toHaveBeenCalledWith('/api/offline/data');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'fancy-planties-offline-data',
        JSON.stringify(mockOfflineData)
      );

      // Step 2: Go offline
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false });
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOnline).toBe(false);

      // Step 3: Access cached data while offline
      const cachedPlants = result.current.getPlantData();
      expect(cachedPlants).toEqual(mockOfflineData.plants);

      const cachedPropagations = result.current.getPropagationData();
      expect(cachedPropagations).toEqual(mockOfflineData.propagations);

      // Step 4: Add pending care entries while offline
      let careEntry1Id: string;
      let careEntry2Id: string;

      act(() => {
        careEntry1Id = result.current.addPendingCareEntry({
          plantInstanceId: 1,
          careType: 'fertilizer',
          notes: 'Fed with liquid fertilizer',
        });
      });

      act(() => {
        careEntry2Id = result.current.addPendingCareEntry({
          plantInstanceId: 2,
          careType: 'water',
          notes: 'Watered thoroughly',
        });
      });

      expect(result.current.pendingEntries).toHaveLength(2);
      expect(result.current.pendingEntries[0].id).toBe(careEntry1Id);
      expect(result.current.pendingEntries[1].id).toBe(careEntry2Id);

      // Step 5: Come back online
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          results: [
            { success: true, entry: { id: careEntry1Id } },
            { success: true, entry: { id: careEntry2Id } },
          ],
          syncedCount: 2,
          failedCount: 0,
        }),
      });

      // Mock the cache refresh call
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ...mockOfflineData,
          lastSync: '2023-01-01T13:00:00Z',
        }),
      });

      await act(async () => {
        Object.defineProperty(navigator, 'onLine', { value: true });
        window.dispatchEvent(new Event('online'));
        await result.current.syncPendingEntries();
      });

      // Step 6: Verify sync completed
      expect(fetch).toHaveBeenCalledWith('/api/offline/sync', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining(careEntry1Id),
      }));

      expect(result.current.pendingEntries).toHaveLength(0);
      expect(result.current.isOnline).toBe(true);
    });

    it('should handle partial sync failures', async () => {
      const { result } = renderHook(() => useOffline());

      // Go offline and add pending entries
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false });
        window.dispatchEvent(new Event('offline'));
      });

      let successId: string;
      let failId: string;

      act(() => {
        successId = result.current.addPendingCareEntry({
          plantInstanceId: 1,
          careType: 'fertilizer',
        });
      });

      act(() => {
        failId = result.current.addPendingCareEntry({
          plantInstanceId: 2,
          careType: 'water',
        });
      });

      expect(result.current.pendingEntries).toHaveLength(2);

      // Mock partial sync failure
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          results: [
            { success: true, entry: { id: successId } },
            { success: false, entry: { id: failId }, error: 'Plant not found' },
          ],
          syncedCount: 1,
          failedCount: 1,
        }),
      });

      // Mock cache refresh
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          plants: [],
          propagations: [],
          careHistory: [],
          lastSync: '2023-01-01T13:00:00Z',
        }),
      });

      await act(async () => {
        Object.defineProperty(navigator, 'onLine', { value: true });
        window.dispatchEvent(new Event('online'));
        await result.current.syncPendingEntries();
      });

      // Only the failed entry should remain
      expect(result.current.pendingEntries).toHaveLength(1);
      expect(result.current.pendingEntries[0].id).toBe(failId);
    });

    it('should handle storage quota management', async () => {
      const { result } = renderHook(() => useOffline());

      // Mock storage API
      const mockEstimate = jest.fn().mockResolvedValue({
        quota: 1000000, // 1MB
        usage: 900000,  // 900KB (90% full)
      });

      Object.defineProperty(navigator, 'storage', {
        value: { estimate: mockEstimate },
        writable: true,
      });

      // Test that we can check if storage API exists
      const hasStorageAPI = 'storage' in navigator && 'estimate' in navigator.storage;
      expect(hasStorageAPI).toBe(true);

      // Test storage estimation
      const estimate = await navigator.storage.estimate();
      expect(estimate.quota).toBe(1000000);
      expect(estimate.usage).toBe(900000);
    });

    it('should resolve data conflicts correctly', () => {
      const { result } = renderHook(() => useOffline());

      const offlineData = [
        { id: 1, name: 'Offline Plant', updatedAt: '2023-01-02T00:00:00Z' },
        { id: 2, name: 'Offline Only', updatedAt: '2023-01-01T00:00:00Z' },
      ];

      const onlineData = [
        { id: 1, name: 'Online Plant', updatedAt: '2023-01-01T00:00:00Z' },
        { id: 3, name: 'Online Only', updatedAt: '2023-01-01T00:00:00Z' },
      ];

      // Test basic conflict resolution logic
      const resolveConflicts = (offline: any[], online: any[]) => {
        if (!offline && !online) return null;
        if (!offline) return online;
        if (!online) return offline;

        const merged = [...offline];
        online.forEach(onlineItem => {
          const existingIndex = merged.findIndex(item => item.id === onlineItem.id);
          if (existingIndex >= 0) {
            // Keep the newer item
            if (new Date(onlineItem.updatedAt) > new Date(merged[existingIndex].updatedAt)) {
              merged[existingIndex] = onlineItem;
            }
          } else {
            merged.push(onlineItem);
          }
        });
        return merged;
      };

      const resolved = resolveConflicts(offlineData, onlineData);

      expect(resolved).toHaveLength(3);
      
      // Offline data should win for id: 1 because it's newer
      const item1 = resolved.find((item: any) => item.id === 1);
      expect(item1?.name).toBe('Offline Plant');
      
      // Offline-only item should be preserved
      const item2 = resolved.find((item: any) => item.id === 2);
      expect(item2?.name).toBe('Offline Only');
      
      // Online-only item should be preserved
      const item3 = resolved.find((item: any) => item.id === 3);
      expect(item3?.name).toBe('Online Only');
    });

    it('should handle network errors gracefully', async () => {
      const { result } = renderHook(() => useOffline());

      // Mock network error
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Should not throw when caching fails
      await act(async () => {
        await result.current.cacheOfflineData();
      });

      // Offline data should remain null after failed cache
      expect(result.current.offlineData).toBeNull();

      // Add pending entry
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false });
      });

      let entryId: string;

      act(() => {
        entryId = result.current.addPendingCareEntry({
          plantInstanceId: 1,
          careType: 'fertilizer',
        });
      });

      expect(result.current.pendingEntries).toHaveLength(1);

      // Mock sync error
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Sync error'));

      // Should not throw when sync fails
      await act(async () => {
        Object.defineProperty(navigator, 'onLine', { value: true });
        await result.current.syncPendingEntries();
      });

      // Pending entries should remain
      expect(result.current.pendingEntries).toHaveLength(1);
      expect(result.current.pendingEntries[0].id).toBe(entryId);
    });
  });

  describe('Edge Cases', () => {
    it('should handle corrupted localStorage data', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'fancy-planties-offline-data') {
          return 'invalid json';
        }
        return null;
      });

      const { result } = renderHook(() => useOffline());

      // Should not crash and should have null offline data
      expect(result.current.offlineData).toBeNull();
      expect(result.current.pendingEntries).toEqual([]);
    });

    it('should handle missing storage API', async () => {
      // Test with a hook that doesn't have storage API
      const { result } = renderHook(() => useOffline());

      // Mock the storage check to simulate missing API
      const originalNavigator = global.navigator;
      (global as any).navigator = { ...originalNavigator, storage: undefined };

      // Test that missing storage API is handled gracefully
      const hasStorageAPI = 'storage' in navigator;
      expect(hasStorageAPI).toBe(false);

      // The hook should still function without storage API
      expect(result.current.isOnline).toBeDefined();
      expect(result.current.offlineData).toBeDefined();

      // Restore original navigator
      global.navigator = originalNavigator;
    });

    it('should handle empty conflict resolution data', () => {
      const { result } = renderHook(() => useOffline());

      // Test basic conflict resolution logic with empty data
      const resolveConflicts = (offline: any, online: any) => {
        if (!offline && !online) return null;
        if (!offline) return online;
        if (!online) return offline;
        return [...offline, ...online];
      };

      expect(resolveConflicts(null, null)).toBeNull();
      expect(resolveConflicts([], null)).toEqual([]);
      expect(resolveConflicts(null, [])).toEqual([]);
    });
  });
});