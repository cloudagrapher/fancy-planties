'use client';

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { reactOptimization, performanceMonitoring } from '@/lib/utils/performance';

/**
 * Hook for optimizing component performance with memoization and debouncing
 */
export function usePerformanceOptimization() {
  const renderCountRef = useRef(0);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
  });

  // Track render performance
  useEffect(() => {
    const startTime = performance.now();
    renderCountRef.current += 1;
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      setPerformanceMetrics(prev => {
        const newRenderCount = renderCountRef.current;
        const newAverageRenderTime = 
          (prev.averageRenderTime * (newRenderCount - 1) + renderTime) / newRenderCount;
        
        return {
          renderCount: newRenderCount,
          averageRenderTime: newAverageRenderTime,
          lastRenderTime: renderTime,
        };
      });
    };
  });

  // Optimized state update function
  const optimizedStateUpdate = useCallback((updateFn: () => void) => {
    reactOptimization.optimizedStateUpdate(updateFn);
  }, []);

  // Debounced state update function
  const debouncedStateUpdate = useCallback((updateFn: () => void, delay: number = 300) => {
    return reactOptimization.debouncedStateUpdate(updateFn, delay);
  }, []);

  // Memoized expensive calculation helper
  const memoizeCalculation = useCallback(<T, R>(
    fn: (input: T) => R,
    keyFn?: (input: T) => string
  ) => {
    return reactOptimization.memoizeExpensiveCalculation(fn, keyFn);
  }, []);

  return {
    performanceMetrics,
    optimizedStateUpdate,
    debouncedStateUpdate,
    memoizeCalculation,
  };
}

/**
 * Hook for virtual scrolling optimization
 */
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollHandlerRef = useRef<((scrollTop: number) => void) | null>(null);

  // Calculate visible items
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex, visibleCount: endIndex - startIndex + 1 };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Create debounced scroll handler
  const scrollHandler = useMemo(() => {
    if (!scrollHandlerRef.current) {
      scrollHandlerRef.current = (newScrollTop: number) => {
        setScrollTop(newScrollTop);
      };
    }
    return scrollHandlerRef.current;
  }, []);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange.startIndex, visibleRange.endIndex]);

  return {
    visibleItems,
    visibleRange,
    scrollHandler,
    totalHeight: items.length * itemHeight,
    offsetY: visibleRange.startIndex * itemHeight,
  };
}

/**
 * Hook for image lazy loading optimization
 */
export function useImageLazyLoading() {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Create intersection observer for lazy loading
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            if (src) {
              setLoadedImages(prev => new Set([...prev, src]));
              observerRef.current?.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const observeImage = useCallback((element: HTMLImageElement | null) => {
    if (element && observerRef.current) {
      observerRef.current.observe(element);
    }
  }, []);

  const isImageLoaded = useCallback((src: string) => {
    return loadedImages.has(src);
  }, [loadedImages]);

  return {
    observeImage,
    isImageLoaded,
    loadedImages,
  };
}

/**
 * Hook for debounced search optimization
 */
export function useDebouncedSearch(
  searchFn: (query: string) => Promise<any>,
  delay: number = 300
) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced search effect
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsLoading(true);
    setError(null);

    timeoutRef.current = setTimeout(async () => {
      try {
        abortControllerRef.current = new AbortController();
        const searchResults = await searchFn(query);
        setResults(searchResults);
        setIsLoading(false);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
          setIsLoading(false);
        }
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, searchFn, delay]);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
  };
}

/**
 * Hook for memory usage monitoring
 */
export function useMemoryMonitoring(enabled: boolean = process.env.NODE_ENV === 'development') {
  const [memoryUsage, setMemoryUsage] = useState<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const updateMemoryUsage = () => {
      const memory = performanceMonitoring.monitorMemoryUsage();
      if (memory) {
        setMemoryUsage(memory);
      }
    };

    // Update immediately
    updateMemoryUsage();

    // Update every 5 seconds
    const interval = setInterval(updateMemoryUsage, 5000);

    return () => clearInterval(interval);
  }, [enabled]);

  return memoryUsage;
}

/**
 * Hook for bundle size optimization
 */
export function useBundleOptimization() {
  const [bundleMetrics, setBundleMetrics] = useState<{
    totalSize: number;
    gzippedSize: number;
    loadTime: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        setBundleMetrics({
          totalSize: navigation.transferSize || 0,
          gzippedSize: navigation.encodedBodySize || 0,
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        });
      }
    }
  }, []);

  return bundleMetrics;
}

/**
 * Hook for component render optimization
 */
export function useRenderOptimization(componentName: string) {
  const renderTimeRef = useRef<number[]>([]);
  const [averageRenderTime, setAverageRenderTime] = useState(0);

  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      renderTimeRef.current.push(renderTime);
      
      // Keep only last 10 render times
      if (renderTimeRef.current.length > 10) {
        renderTimeRef.current = renderTimeRef.current.slice(-10);
      }
      
      // Calculate average
      const average = renderTimeRef.current.reduce((sum, time) => sum + time, 0) / renderTimeRef.current.length;
      setAverageRenderTime(average);
      
      // Log slow renders in development
      if (process.env.NODE_ENV === 'development' && renderTime > 16) {
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    };
  });

  return {
    averageRenderTime,
    renderCount: renderTimeRef.current.length,
  };
}