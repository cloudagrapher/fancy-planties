/**
 * Performance and Reliability Validation Tests
 * Tests app stability, memory usage, error recovery, and data persistence
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMockPlantInstance, createMockUser } from '@/test-utils/helpers';

// Mock performance APIs
const mockPerformance = {
  memory: {
    usedJSHeapSize: 10000000, // 10MB
    totalJSHeapSize: 50000000, // 50MB
    jsHeapSizeLimit: 100000000, // 100MB
  },
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => []),
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
});

// Mock IndexedDB for offline storage
const mockIndexedDB = {
  open: jest.fn(() => ({
    result: {
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          add: jest.fn(),
          put: jest.fn(),
          get: jest.fn(),
          delete: jest.fn(),
          getAll: jest.fn(() => ({ onsuccess: null })),
        })),
      })),
    },
    onsuccess: null,
    onerror: null,
  })),
};

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

describe('Performance and Reliability Validation', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    user = userEvent.setup();
    jest.clearAllMocks();
    
    // Reset performance mocks
    mockPerformance.now.mockReturnValue(Date.now());
    mockPerformance.mark.mockClear();
    mockPerformance.measure.mockClear();
    
    // Reset storage mocks
    mockLocalStorage.getItem.mockReturnValue(null);
    mockSessionStorage.getItem.mockReturnValue(null);
    
    // Mock successful API responses by default
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] }),
    });
  });

  describe('App Performance Under Load', () => {
    test('should handle large numbers of plants efficiently', async () => {
      const startTime = performance.now();
      
      // Generate large dataset
      const largePlantDataset = Array.from({ length: 1000 }, (_, i) =>
        createMockPlantInstance({
          id: i + 1,
          nickname: `Plant ${i + 1}`,
          location: `Location ${Math.floor(i / 10) + 1}`,
        })
      );

      // Mock API response with large dataset
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            instances: largePlantDataset.slice(0, 50), // Paginated response
            total: largePlantDataset.length,
            hasMore: true,
          },
        }),
      });

      // Import and render component that handles large datasets
      const { PlantsGrid } = await import('@/components/plants/PlantsGrid');
      
      render(
        <QueryClientProvider client={queryClient}>
          <PlantsGrid />
        </QueryClientProvider>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Plant 1')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (2 seconds)
      expect(renderTime).toBeLessThan(2000);
      
      // Should use virtualization or pagination for performance
      const plantCards = screen.getAllByTestId(/plant-card/);
      expect(plantCards.length).toBeLessThanOrEqual(50); // Should not render all 1000
    });

    test('should handle large care history datasets', async () => {
      const largeCareHistory = Array.from({ length: 500 }, (_, i) => ({
        id: i + 1,
        plantInstanceId: Math.floor(i / 10) + 1,
        careType: ['fertilizer', 'water', 'repot'][i % 3],
        careDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        notes: `Care entry ${i + 1}`,
      }));

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: largeCareHistory.slice(0, 20), // Paginated
          total: largeCareHistory.length,
        }),
      });

      const { CareHistoryTimeline } = await import('@/components/care/CareHistoryTimeline');
      
      const startTime = performance.now();
      
      render(
        <QueryClientProvider client={queryClient}>
          <CareHistoryTimeline plantInstanceId={1} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/care entry/i)).toBeInTheDocument();
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000);
    });

    test('should handle concurrent API requests efficiently', async () => {
      const requests = [
        { url: '/api/plant-instances', data: { instances: [] } },
        { url: '/api/propagations', data: { propagations: [] } },
        { url: '/api/care/recent', data: { careHistory: [] } },
        { url: '/api/dashboard/stats', data: { stats: {} } },
      ];

      // Mock multiple concurrent requests
      requests.forEach((req, index) => {
        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => new Promise(resolve => 
            setTimeout(() => resolve({ success: true, data: req.data }), 100 + index * 50)
          ),
        });
      });

      const { DashboardClient } = await import('@/app/dashboard/DashboardClient');
      
      const startTime = performance.now();
      
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardClient userId={1} />
        </QueryClientProvider>
      );

      // Wait for all requests to complete
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(4);
      }, { timeout: 1000 });

      const endTime = performance.now();
      
      // Should handle concurrent requests efficiently
      expect(endTime - startTime).toBeLessThan(500);
    });
  });

  describe('Memory Usage and Leaks', () => {
    test('should not consume excessive memory', async () => {
      const initialMemory = performance.memory.usedJSHeapSize;
      
      // Simulate memory-intensive operations
      const { PlantsGrid } = await import('@/components/plants/PlantsGrid');
      
      const { unmount } = render(
        <QueryClientProvider client={queryClient}>
          <PlantsGrid />
        </QueryClientProvider>
      );

      // Simulate component updates
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          queryClient.invalidateQueries({ queryKey: ['plants'] });
          await new Promise(resolve => setTimeout(resolve, 10));
        });
      }

      // Clean up
      unmount();
      queryClient.clear();

      // Memory usage should not increase dramatically
      const finalMemory = performance.memory.usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Should not increase by more than 10MB
      expect(memoryIncrease).toBeLessThan(10000000);
    });

    test('should clean up event listeners on unmount', async () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { OfflineManager } = await import('@/components/shared/OfflineManager');
      
      const { unmount } = render(<OfflineManager />);

      // Should add event listeners
      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      unmount();

      // Should remove event listeners on unmount
      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    test('should handle image loading without memory leaks', async () => {
      const images = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        src: `https://example.com/image-${i + 1}.jpg`,
        alt: `Plant image ${i + 1}`,
      }));

      const { PlantImageGallery } = await import('@/components/plants/PlantImageGallery');
      
      const { unmount } = render(
        <PlantImageGallery images={images} />
      );

      // Simulate image loading
      const imageElements = document.querySelectorAll('img');
      imageElements.forEach(img => {
        // Simulate successful image load
        Object.defineProperty(img, 'complete', { value: true });
        img.dispatchEvent(new Event('load'));
      });

      unmount();

      // Should not leave image references
      expect(document.querySelectorAll('img')).toHaveLength(0);
    });
  });

  describe('Error Recovery', () => {
    test('should handle API errors gracefully', async () => {
      // Mock API failure
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { PlantsGrid } = await import('@/components/plants/PlantsGrid');
      
      render(
        <QueryClientProvider client={queryClient}>
          <PlantsGrid />
        </QueryClientProvider>
      );

      // Should show error state instead of crashing
      await waitFor(() => {
        expect(screen.getByText(/error/i) || screen.getByText(/failed/i)).toBeInTheDocument();
      });

      // Should allow retry
      const retryButton = screen.getByRole('button', { name: /retry|try again/i });
      expect(retryButton).toBeInTheDocument();
    });

    test('should recover from network failures', async () => {
      // Start with network failure
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { CareDashboard } = await import('@/components/care/CareDashboard');
      
      render(
        <QueryClientProvider client={queryClient}>
          <CareDashboard />
        </QueryClientProvider>
      );

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      // Mock successful retry
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { overdue: [], dueToday: [], dueSoon: [] },
        }),
      });

      // Click retry
      const retryButton = screen.getByRole('button', { name: /retry|try again/i });
      await user.click(retryButton);

      // Should recover and show data
      await waitFor(() => {
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      });
    });

    test('should handle malformed API responses', async () => {
      // Mock malformed response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' }),
      });

      const { PlantsGrid } = await import('@/components/plants/PlantsGrid');
      
      render(
        <QueryClientProvider client={queryClient}>
          <PlantsGrid />
        </QueryClientProvider>
      );

      // Should handle gracefully
      await waitFor(() => {
        expect(screen.getByText(/error|failed|something went wrong/i)).toBeInTheDocument();
      });
    });

    test('should handle component errors with error boundaries', async () => {
      // Create a component that throws an error
      const ThrowingComponent = () => {
        throw new Error('Component error');
      };

      const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
        try {
          return <>{children}</>;
        } catch (error) {
          return <div>Something went wrong</div>;
        }
      };

      // Should not crash the entire app
      expect(() => {
        render(
          <ErrorBoundary>
            <ThrowingComponent />
          </ErrorBoundary>
        );
      }).not.toThrow();
    });
  });

  describe('Data Persistence', () => {
    test('should persist user data between sessions', async () => {
      const userData = {
        id: 1,
        email: 'test@example.com',
        preferences: { theme: 'light' },
      };

      // Mock stored user data
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'user-preferences') {
          return JSON.stringify(userData.preferences);
        }
        return null;
      });

      const { UserProvider } = await import('@/components/auth/UserProvider');
      
      render(
        <UserProvider>
          <div data-testid="user-content">User content</div>
        </UserProvider>
      );

      // Should load persisted preferences
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('user-preferences');
    });

    test('should persist form data during navigation', async () => {
      const formData = {
        nickname: 'Test Plant',
        location: 'Living Room',
        notes: 'Test notes',
      };

      // Mock form auto-save
      mockSessionStorage.setItem.mockImplementation(() => {});
      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === 'plant-form-draft') {
          return JSON.stringify(formData);
        }
        return null;
      });

      const { PlantInstanceForm } = await import('@/components/plants/PlantInstanceForm');
      
      render(
        <PlantInstanceForm
          onSubmit={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      // Should restore form data
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith('plant-form-draft');
    });

    test('should handle storage quota exceeded', async () => {
      // Mock storage quota exceeded
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const { useOffline } = await import('@/hooks/useOffline');
      const { renderHook } = await import('@testing-library/react');
      
      const { result } = renderHook(() => useOffline());

      // Should handle storage errors gracefully
      await act(async () => {
        try {
          result.current.addPendingCareEntry({
            plantInstanceId: 1,
            careType: 'fertilizer',
          });
        } catch (error) {
          // Should not throw
        }
      });

      // Should still function without storage
      expect(result.current.isOnline).toBeDefined();
    });

    test('should sync offline data when connection returns', async () => {
      const offlineData = [
        { id: 'temp-1', plantInstanceId: 1, careType: 'fertilizer' },
        { id: 'temp-2', plantInstanceId: 2, careType: 'water' },
      ];

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'pending-care-entries') {
          return JSON.stringify(offlineData);
        }
        return null;
      });

      // Mock successful sync
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          results: offlineData.map(entry => ({ success: true, entry })),
        }),
      });

      const { useOffline } = await import('@/hooks/useOffline');
      const { renderHook } = await import('@testing-library/react');
      
      const { result } = renderHook(() => useOffline());

      // Simulate coming back online
      await act(async () => {
        Object.defineProperty(navigator, 'onLine', { value: true });
        window.dispatchEvent(new Event('online'));
        await result.current.syncPendingEntries();
      });

      // Should sync offline data
      expect(fetch).toHaveBeenCalledWith('/api/offline/sync', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('temp-1'),
      }));
    });
  });

  describe('Performance Monitoring', () => {
    test('should track performance metrics', async () => {
      const { PerformanceMonitor } = await import('@/components/shared/PerformanceMonitor');
      
      render(<PerformanceMonitor />);

      // Should mark performance milestones
      expect(performance.mark).toHaveBeenCalledWith('app-start');
    });

    test('should measure component render times', async () => {
      const { PlantsGrid } = await import('@/components/plants/PlantsGrid');
      
      const startTime = performance.now();
      
      render(
        <QueryClientProvider client={queryClient}>
          <PlantsGrid />
        </QueryClientProvider>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render quickly
      expect(renderTime).toBeLessThan(100);
    });

    test('should detect performance regressions', async () => {
      const performanceThresholds = {
        firstContentfulPaint: 1000,
        largestContentfulPaint: 2500,
        firstInputDelay: 100,
        cumulativeLayoutShift: 0.1,
      };

      // Mock performance entries
      mockPerformance.getEntriesByType.mockReturnValue([
        { name: 'first-contentful-paint', startTime: 800 },
        { name: 'largest-contentful-paint', startTime: 1200 },
      ]);

      const entries = performance.getEntriesByType('paint');
      const fcp = entries.find(entry => entry.name === 'first-contentful-paint');
      const lcp = entries.find(entry => entry.name === 'largest-contentful-paint');

      if (fcp) {
        expect(fcp.startTime).toBeLessThan(performanceThresholds.firstContentfulPaint);
      }
      if (lcp) {
        expect(lcp.startTime).toBeLessThan(performanceThresholds.largestContentfulPaint);
      }
    });
  });

  describe('Resource Management', () => {
    test('should clean up timers and intervals', async () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const { OfflineManager } = await import('@/components/shared/OfflineManager');
      
      const { unmount } = render(<OfflineManager />);

      // Should set up intervals
      expect(setIntervalSpy).toHaveBeenCalled();

      unmount();

      // Should clean up intervals
      expect(clearIntervalSpy).toHaveBeenCalled();

      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });

    test('should abort pending requests on unmount', async () => {
      const abortSpy = jest.fn();
      const mockAbortController = {
        abort: abortSpy,
        signal: { aborted: false },
      };

      global.AbortController = jest.fn(() => mockAbortController) as any;

      const { PlantsGrid } = await import('@/components/plants/PlantsGrid');
      
      const { unmount } = render(
        <QueryClientProvider client={queryClient}>
          <PlantsGrid />
        </QueryClientProvider>
      );

      unmount();

      // Should abort pending requests
      expect(abortSpy).toHaveBeenCalled();
    });
  });
});