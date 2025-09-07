/**
 * Performance monitoring utilities for the design system
 * Tracks CSS performance, bundle sizes, and rendering metrics
 */

/**
 * CSS Performance Monitor
 */
export class CSSPerformanceMonitor {
  private static instance: CSSPerformanceMonitor;
  private metrics: Map<string, number> = new Map();

  static getInstance(): CSSPerformanceMonitor {
    if (!CSSPerformanceMonitor.instance) {
      CSSPerformanceMonitor.instance = new CSSPerformanceMonitor();
    }
    return CSSPerformanceMonitor.instance;
  }

  /**
   * Monitor CSS loading performance
   */
  monitorCSSLoading(): void {
    if (typeof window === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name.includes('.css')) {
          this.metrics.set(`css-load-${entry.name}`, entry.duration);
        }
      });
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  /**
   * Monitor layout thrashing
   */
  monitorLayoutThrashing(): void {
    if (typeof window === 'undefined') return;

    let layoutCount = 0;
    const startTime = performance.now();

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'measure' && entry.name.includes('layout')) {
          layoutCount++;
        }
      });
    });

    observer.observe({ entryTypes: ['measure'] });

    // Check after 5 seconds
    setTimeout(() => {
      const duration = performance.now() - startTime;
      const layoutsPerSecond = layoutCount / (duration / 1000);
      
      if (layoutsPerSecond > 10) {
        console.warn(`High layout frequency detected: ${layoutsPerSecond.toFixed(2)} layouts/second`);
      }
      
      this.metrics.set('layouts-per-second', layoutsPerSecond);
    }, 5000);
  }

  /**
   * Monitor paint performance
   */
  monitorPaintPerformance(): void {
    if (typeof window === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name === 'first-paint') {
          this.metrics.set('first-paint', entry.startTime);
        }
        if (entry.name === 'first-contentful-paint') {
          this.metrics.set('first-contentful-paint', entry.startTime);
        }
      });
    });

    observer.observe({ entryTypes: ['paint'] });
  }

  /**
   * Monitor animation performance
   */
  monitorAnimationPerformance(): void {
    if (typeof window === 'undefined') return;

    let frameCount = 0;
    let lastTime = performance.now();
    const frameTimes: number[] = [];

    function measureFrame() {
      const currentTime = performance.now();
      const frameTime = currentTime - lastTime;
      frameTimes.push(frameTime);
      frameCount++;
      lastTime = currentTime;

      // Keep only last 60 frames
      if (frameTimes.length > 60) {
        frameTimes.shift();
      }

      // Calculate average FPS
      if (frameCount % 60 === 0) {
        const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        const fps = 1000 / avgFrameTime;
        
        if (fps < 30) {
          console.warn(`Low FPS detected: ${fps.toFixed(2)} FPS`);
        }
      }

      requestAnimationFrame(measureFrame);
    }

    requestAnimationFrame(measureFrame);
  }

  /**
   * Get all collected metrics
   */
  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Report performance summary
   */
  reportPerformance(): void {
    const metrics = this.getMetrics();
    
    console.group('🎨 CSS Performance Report');
    
    if (metrics['first-paint']) {
      console.log(`First Paint: ${metrics['first-paint'].toFixed(2)}ms`);
    }
    
    if (metrics['first-contentful-paint']) {
      console.log(`First Contentful Paint: ${metrics['first-contentful-paint'].toFixed(2)}ms`);
    }
    
    if (metrics['layouts-per-second']) {
      console.log(`Layout Frequency: ${metrics['layouts-per-second'].toFixed(2)} layouts/second`);
    }

    // CSS loading times
    Object.entries(metrics).forEach(([key, value]) => {
      if (key.startsWith('css-load-')) {
        const filename = key.replace('css-load-', '');
        console.log(`CSS Load (${filename}): ${value.toFixed(2)}ms`);
      }
    });
    
    console.groupEnd();
  }
}

/**
 * Bundle Size Monitor
 */
export class BundleSizeMonitor {
  /**
   * Estimate CSS bundle size from loaded stylesheets
   */
  static estimateCSSBundleSize(): Promise<number> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(0);
        return;
      }

      let totalSize = 0;
      const stylesheets = Array.from(document.styleSheets);
      let processed = 0;

      if (stylesheets.length === 0) {
        resolve(0);
        return;
      }

      stylesheets.forEach((stylesheet) => {
        try {
          if (stylesheet.href) {
            fetch(stylesheet.href)
              .then(response => response.text())
              .then(css => {
                totalSize += new Blob([css]).size;
                processed++;
                
                if (processed === stylesheets.length) {
                  resolve(totalSize);
                }
              })
              .catch(() => {
                processed++;
                if (processed === stylesheets.length) {
                  resolve(totalSize);
                }
              });
          } else {
            // Inline styles
            const rules = Array.from(stylesheet.cssRules || []);
            const inlineCSS = rules.map(rule => rule.cssText).join('\n');
            totalSize += new Blob([inlineCSS]).size;
            processed++;
            
            if (processed === stylesheets.length) {
              resolve(totalSize);
            }
          }
        } catch (error) {
          processed++;
          if (processed === stylesheets.length) {
            resolve(totalSize);
          }
        }
      });
    });
  }

  /**
   * Monitor and report bundle size
   */
  static async monitorBundleSize(): Promise<void> {
    const cssSize = await this.estimateCSSBundleSize();
    const cssSizeKB = cssSize / 1024;

    console.group('📦 Bundle Size Report');
    console.log(`Estimated CSS Bundle Size: ${cssSizeKB.toFixed(2)} KB`);
    
    if (cssSizeKB > 100) {
      console.warn('CSS bundle size exceeds 100KB - consider optimization');
    } else if (cssSizeKB > 50) {
      console.log('CSS bundle size is moderate - monitor for growth');
    } else {
      console.log('CSS bundle size is optimal');
    }
    
    console.groupEnd();
  }
}

/**
 * Critical CSS Performance
 */
export class CriticalCSSMonitor {
  /**
   * Identify above-the-fold CSS usage
   */
  static identifyAboveFoldCSS(): string[] {
    if (typeof window === 'undefined') return [];

    const aboveFoldElements: Element[] = [];
    const viewportHeight = window.innerHeight;
    
    // Get all visible elements above the fold
    document.querySelectorAll('*').forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.top < viewportHeight && rect.bottom > 0) {
        aboveFoldElements.push(element);
      }
    });

    // Extract used CSS classes
    const usedClasses = new Set<string>();
    aboveFoldElements.forEach((element) => {
      element.classList.forEach((className) => {
        usedClasses.add(className);
      });
    });

    return Array.from(usedClasses);
  }

  /**
   * Analyze unused CSS
   */
  static analyzeUnusedCSS(): Promise<string[]> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve([]);
        return;
      }

      const usedSelectors = new Set<string>();
      const allSelectors: string[] = [];

      // Collect all CSS selectors
      Array.from(document.styleSheets).forEach((stylesheet) => {
        try {
          Array.from(stylesheet.cssRules || []).forEach((rule) => {
            if (rule instanceof CSSStyleRule) {
              allSelectors.push(rule.selectorText);
              
              // Check if selector matches any element
              try {
                if (document.querySelector(rule.selectorText)) {
                  usedSelectors.add(rule.selectorText);
                }
              } catch (e) {
                // Invalid selector, skip
              }
            }
          });
        } catch (e) {
          // Cross-origin stylesheet, skip
        }
      });

      const unusedSelectors = allSelectors.filter(selector => !usedSelectors.has(selector));
      resolve(unusedSelectors);
    });
  }
}

/**
 * Responsive Performance Monitor
 */
export class ResponsivePerformanceMonitor {
  /**
   * Monitor viewport changes and performance impact
   */
  static monitorViewportChanges(): void {
    if (typeof window === 'undefined') return;

    let resizeCount = 0;
    let lastResize = performance.now();

    window.addEventListener('resize', () => {
      const now = performance.now();
      resizeCount++;
      
      // Measure time between resizes
      const timeSinceLastResize = now - lastResize;
      lastResize = now;

      // If resizing frequently, warn about potential performance issues
      if (timeSinceLastResize < 16) { // Less than one frame
        console.warn('Frequent viewport changes detected - may impact performance');
      }
    });

    // Report resize frequency after 10 seconds
    setTimeout(() => {
      if (resizeCount > 0) {
        console.log(`Viewport changes: ${resizeCount} in 10 seconds`);
      }
    }, 10000);
  }

  /**
   * Test responsive breakpoint performance
   */
  static testBreakpointPerformance(): void {
    if (typeof window === 'undefined') return;

    const breakpoints = [320, 640, 768, 1024, 1280, 1536];
    const results: Record<number, number> = {};

    breakpoints.forEach((width) => {
      const startTime = performance.now();
      
      // Temporarily change viewport width (for testing)
      const originalWidth = window.innerWidth;
      
      // Simulate breakpoint change by triggering media query evaluation
      const mediaQuery = window.matchMedia(`(min-width: ${width}px)`);
      
      const endTime = performance.now();
      results[width] = endTime - startTime;
    });

    console.group('📱 Responsive Performance');
    Object.entries(results).forEach(([breakpoint, time]) => {
      console.log(`Breakpoint ${breakpoint}px: ${time.toFixed(2)}ms`);
    });
    console.groupEnd();
  }
}

/**
 * Initialize all performance monitoring
 */
export function initializePerformanceMonitoring(): void {
  if (typeof window === 'undefined') return;

  const cssMonitor = CSSPerformanceMonitor.getInstance();
  
  // Start monitoring
  cssMonitor.monitorCSSLoading();
  cssMonitor.monitorLayoutThrashing();
  cssMonitor.monitorPaintPerformance();
  cssMonitor.monitorAnimationPerformance();
  
  // Monitor bundle size
  BundleSizeMonitor.monitorBundleSize();
  
  // Monitor responsive performance
  ResponsivePerformanceMonitor.monitorViewportChanges();
  
  // Report after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      cssMonitor.reportPerformance();
    }, 2000);
  });
}

/**
 * Performance optimization recommendations
 */
export function getPerformanceRecommendations(): string[] {
  const recommendations: string[] = [];
  
  // Check for common performance issues
  if (typeof window !== 'undefined') {
    // Check for excessive DOM elements
    const elementCount = document.querySelectorAll('*').length;
    if (elementCount > 1500) {
      recommendations.push('Consider reducing DOM complexity - high element count detected');
    }
    
    // Check for excessive CSS classes
    const allElements = document.querySelectorAll('*');
    let totalClasses = 0;
    allElements.forEach((el) => {
      totalClasses += el.classList.length;
    });
    
    if (totalClasses > 3000) {
      recommendations.push('Consider consolidating CSS classes - high class usage detected');
    }
    
    // Check for inline styles
    const inlineStyleElements = document.querySelectorAll('[style]');
    if (inlineStyleElements.length > 50) {
      recommendations.push('Reduce inline styles - prefer CSS classes for better performance');
    }
  }
  
  return recommendations;
}