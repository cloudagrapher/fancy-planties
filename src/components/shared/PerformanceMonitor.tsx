'use client';

import { useEffect, useState } from 'react';
import { performanceMonitoring } from '@/lib/utils/performance';

interface PerformanceMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  renderTime?: number;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  showOverlay?: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export function PerformanceMonitor({
  enabled = process.env.NODE_ENV === 'development',
  showOverlay = false,
  onMetricsUpdate,
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});

  useEffect(() => {
    if (!enabled) return;

    // Track Core Web Vitals
    performanceMonitoring.trackWebVitals();

    // Monitor memory usage periodically
    const memoryInterval = setInterval(() => {
      const memory = performanceMonitoring.monitorMemoryUsage();
      if (memory) {
        setMetrics(prev => {
          const updated = { ...prev, memory };
          onMetricsUpdate?.(updated);
          return updated;
        });
      }
    }, 5000);

    return () => {
      clearInterval(memoryInterval);
    };
  }, [enabled, onMetricsUpdate]);

  if (!enabled || !showOverlay) return null;

  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-80 text-white p-3 rounded-lg text-xs font-mono z-50 max-w-xs">
      <div className="font-bold mb-2">Performance Metrics</div>
      
      {metrics.lcp && (
        <div>LCP: {metrics.lcp.toFixed(2)}ms</div>
      )}
      
      {metrics.fid && (
        <div>FID: {metrics.fid.toFixed(2)}ms</div>
      )}
      
      {metrics.cls && (
        <div>CLS: {metrics.cls.toFixed(4)}</div>
      )}
      
      {metrics.memory && (
        <div className="mt-2">
          <div>Memory Usage:</div>
          <div>Used: {(metrics.memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB</div>
          <div>Total: {(metrics.memory.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB</div>
          <div>Limit: {(metrics.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(1)}MB</div>
        </div>
      )}
      
      {metrics.renderTime && (
        <div className="mt-2">
          Last Render: {metrics.renderTime.toFixed(2)}ms
        </div>
      )}
    </div>
  );
}

// HOC for measuring component render time
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) {
  return function PerformanceTrackedComponent(props: P) {
    const [renderTime, setRenderTime] = useState<number>();

    useEffect(() => {
      const time = performanceMonitoring.measureRenderTime(componentName, () => {
        // Component has rendered
      });
      setRenderTime(time);
    });

    return <WrappedComponent {...props} />;
  };
}

// Hook for tracking component performance
export function usePerformanceTracking(componentName: string) {
  const [metrics, setMetrics] = useState<{
    renderCount: number;
    averageRenderTime: number;
    lastRenderTime: number;
  }>({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
  });

  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      setMetrics(prev => {
        const newRenderCount = prev.renderCount + 1;
        const newAverageRenderTime = 
          (prev.averageRenderTime * prev.renderCount + renderTime) / newRenderCount;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`${componentName} render #${newRenderCount}: ${renderTime.toFixed(2)}ms (avg: ${newAverageRenderTime.toFixed(2)}ms)`);
        }
        
        return {
          renderCount: newRenderCount,
          averageRenderTime: newAverageRenderTime,
          lastRenderTime: renderTime,
        };
      });
    };
  });

  return metrics;
}

// Performance budget component
interface PerformanceBudgetProps {
  budgets: {
    lcp: number; // ms
    fid: number; // ms
    cls: number; // score
    bundleSize: number; // KB
  };
  onBudgetExceeded?: (metric: string, value: number, budget: number) => void;
}

export function PerformanceBudget({
  budgets,
  onBudgetExceeded,
}: PerformanceBudgetProps) {
  const [violations, setViolations] = useState<string[]>([]);

  useEffect(() => {
    // Check bundle size
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const bundleSize = navigation.transferSize / 1024; // Convert to KB
        if (bundleSize > budgets.bundleSize) {
          setViolations(prev => [...prev, `Bundle size: ${bundleSize.toFixed(1)}KB > ${budgets.bundleSize}KB`]);
          onBudgetExceeded?.('bundleSize', bundleSize, budgets.bundleSize);
        }
      }
    }

    // Monitor Core Web Vitals against budgets
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // LCP monitoring
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry.startTime > budgets.lcp) {
          setViolations(prev => [...prev, `LCP: ${lastEntry.startTime.toFixed(1)}ms > ${budgets.lcp}ms`]);
          onBudgetExceeded?.('lcp', lastEntry.startTime, budgets.lcp);
        }
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // FID monitoring
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          // Type assertion for first-input entries
          const fidEntry = entry as PerformanceEventTiming;
          if (fidEntry.processingStart) {
            const fid = fidEntry.processingStart - fidEntry.startTime;
            if (fid > budgets.fid) {
              setViolations(prev => [...prev, `FID: ${fid.toFixed(1)}ms > ${budgets.fid}ms`]);
              onBudgetExceeded?.('fid', fid, budgets.fid);
            }
          }
        });
      }).observe({ entryTypes: ['first-input'] });

      // CLS monitoring
      new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        if (clsValue > budgets.cls) {
          setViolations(prev => [...prev, `CLS: ${clsValue.toFixed(4)} > ${budgets.cls}`]);
          onBudgetExceeded?.('cls', clsValue, budgets.cls);
        }
      }).observe({ entryTypes: ['layout-shift'] });
    }
  }, [budgets, onBudgetExceeded]);

  if (process.env.NODE_ENV !== 'development' || violations.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-red-600 text-white p-3 rounded-lg text-xs font-mono z-50 max-w-sm">
      <div className="font-bold mb-2">⚠️ Performance Budget Violations</div>
      {violations.map((violation, index) => (
        <div key={index} className="mb-1">{violation}</div>
      ))}
    </div>
  );
}