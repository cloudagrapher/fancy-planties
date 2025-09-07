/**
 * Performance optimization utilities
 */

import { startTransition } from 'react';

// Image optimization utilities
export const imageOptimization = {
  // Compress base64 images
  compressBase64Image: (base64: string, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate optimal dimensions
        const maxWidth = 800;
        const maxHeight = 600;
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      
      img.src = base64;
    });
  },

  // Generate thumbnail from base64
  generateThumbnail: (base64: string, size: number = 150): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = size;
        canvas.height = size;
        
        // Calculate crop dimensions for square thumbnail
        const minDim = Math.min(img.width, img.height);
        const x = (img.width - minDim) / 2;
        const y = (img.height - minDim) / 2;
        
        ctx?.drawImage(img, x, y, minDim, minDim, 0, 0, size, size);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
        resolve(thumbnail);
      };
      
      img.src = base64;
    });
  },

  // Lazy loading intersection observer
  createLazyLoadObserver: (callback: (entry: IntersectionObserverEntry) => void) => {
    return new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callback(entry);
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );
  },
};

// Virtual scrolling utilities
export const virtualScrolling = {
  // Calculate visible items for virtual scrolling
  calculateVisibleItems: (
    scrollTop: number,
    containerHeight: number,
    itemHeight: number,
    totalItems: number,
    overscan: number = 5
  ) => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      totalItems - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex, visibleCount: endIndex - startIndex + 1 };
  },

  // Debounced scroll handler
  createScrollHandler: (callback: (scrollTop: number) => void, delay: number = 16) => {
    let timeoutId: NodeJS.Timeout;
    
    return (scrollTop: number) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => callback(scrollTop), delay);
    };
  },
};

// Bundle optimization utilities
export const bundleOptimization = {
  // Preload critical resources
  preloadCriticalResources: () => {
    // Preload critical CSS
    const criticalCSS = document.createElement('link');
    criticalCSS.rel = 'preload';
    criticalCSS.as = 'style';
    criticalCSS.href = '/globals.css';
    document.head.appendChild(criticalCSS);

    // Preload critical fonts
    const font = document.createElement('link');
    font.rel = 'preload';
    font.as = 'font';
    font.type = 'font/woff2';
    font.crossOrigin = 'anonymous';
    font.href = '/fonts/system-font.woff2';
    document.head.appendChild(font);
  },

  // Tree shaking helper for unused imports
  removeUnusedImports: (imports: Record<string, any>, used: string[]) => {
    const optimized: Record<string, any> = {};
    used.forEach(key => {
      if (imports[key]) {
        optimized[key] = imports[key];
      }
    });
    return optimized;
  },
};

// Performance monitoring utilities
export const performanceMonitoring = {
  // Measure component render time
  measureRenderTime: (componentName: string, renderFn: () => void) => {
    const start = performance.now();
    renderFn();
    const end = performance.now();
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} render time: ${(end - start).toFixed(2)}ms`);
    }
    
    return end - start;
  },

  // Track Core Web Vitals
  trackWebVitals: () => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('LCP:', lastEntry.startTime);
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const fidEntry = entry as PerformanceEventTiming;
          if (fidEntry.processingStart) {
            console.log('FID:', fidEntry.processingStart - fidEntry.startTime);
          }
        });
      }).observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        console.log('CLS:', clsValue);
      }).observe({ entryTypes: ['layout-shift'] });
    }
  },

  // Memory usage monitoring
  monitorMemoryUsage: () => {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      const memory = (window.performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }
    return null;
  },
};

// React optimization utilities
export const reactOptimization = {
  // Optimized state update with startTransition
  optimizedStateUpdate: (updateFn: () => void) => {
    startTransition(() => {
      updateFn();
    });
  },

  // Debounced state update
  debouncedStateUpdate: (updateFn: () => void, delay: number = 300) => {
    let timeoutId: NodeJS.Timeout;
    
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        startTransition(() => {
          updateFn();
        });
      }, delay);
    };
  },

  // Memoization helper for expensive calculations
  memoizeExpensiveCalculation: <T, R>(
    fn: (input: T) => R,
    keyFn: (input: T) => string = (input) => JSON.stringify(input)
  ) => {
    const cache = new Map<string, R>();
    
    return (input: T): R => {
      const key = keyFn(input);
      
      if (cache.has(key)) {
        return cache.get(key)!;
      }
      
      const result = fn(input);
      cache.set(key, result);
      
      // Limit cache size to prevent memory leaks
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value;
        if (firstKey) {
          cache.delete(firstKey);
        }
      }
      
      return result;
    };
  },
};

// Database query optimization utilities
export const queryOptimization = {
  // Batch multiple queries
  batchQueries: async <T>(queries: (() => Promise<T>)[], batchSize: number = 5): Promise<T[]> => {
    const results: T[] = [];
    
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(query => query()));
      results.push(...batchResults);
    }
    
    return results;
  },

  // Query result caching
  createQueryCache: <T>(ttl: number = 5 * 60 * 1000) => {
    const cache = new Map<string, { data: T; timestamp: number }>();
    
    return {
      get: (key: string): T | null => {
        const entry = cache.get(key);
        if (!entry) return null;
        
        if (Date.now() - entry.timestamp > ttl) {
          cache.delete(key);
          return null;
        }
        
        return entry.data;
      },
      
      set: (key: string, data: T) => {
        cache.set(key, { data, timestamp: Date.now() });
      },
      
      clear: () => cache.clear(),
    };
  },
};