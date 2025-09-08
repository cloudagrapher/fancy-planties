'use client';

import { useEffect, useRef, ReactNode } from 'react';
import { 
  addTouchFeedback, 
  addTouchStyles, 
  ensureTouchTargetSize,
  isTouchDevice,
  TOUCH_STYLES 
} from '@/lib/utils/mobile-touch';
import { 
  initializeMobileOptimizations,
  isMobile,
  addResizeHandler 
} from '@/lib/utils/responsive-layout';

interface MobileOptimizedProps {
  children: ReactNode;
  enableTouchFeedback?: boolean;
  ensureTouchTargets?: boolean;
  className?: string;
  touchActiveClass?: string;
  hapticFeedback?: boolean;
}

export default function MobileOptimized({
  children,
  enableTouchFeedback = true,
  ensureTouchTargets = true,
  className = '',
  touchActiveClass = 'touch-active',
  hapticFeedback = true,
}: MobileOptimizedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize mobile optimizations once
    initializeMobileOptimizations();

    // Add touch styles to document head if not already present
    if (!document.getElementById('mobile-touch-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'mobile-touch-styles';
      styleElement.textContent = TOUCH_STYLES;
      document.head.appendChild(styleElement);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cleanupFunctions: (() => void)[] = [];

    // Only apply mobile optimizations on touch devices
    if (isTouchDevice()) {
      // Find all interactive elements
      const interactiveElements = container.querySelectorAll(
        'button, [role="button"], a, input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );

      interactiveElements.forEach((element) => {
        const htmlElement = element as HTMLElement;

        // Add touch styles
        addTouchStyles(htmlElement);

        // Ensure minimum touch target size
        if (ensureTouchTargets) {
          ensureTouchTargetSize(htmlElement);
        }

        // Add touch feedback
        if (enableTouchFeedback) {
          const cleanup = addTouchFeedback(htmlElement, {
            activeClass: touchActiveClass,
            hapticFeedback,
          });
          cleanupFunctions.push(cleanup);
        }
      });
    }

    // Handle resize events
    const resizeCleanup = addResizeHandler(() => {
      // Re-optimize on resize (orientation change, etc.)
      if (ensureTouchTargets && isTouchDevice()) {
        const interactiveElements = container.querySelectorAll(
          'button, [role="button"], a, input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        
        interactiveElements.forEach((element) => {
          ensureTouchTargetSize(element as HTMLElement);
        });
      }
    });

    cleanupFunctions.push(resizeCleanup);

    // Cleanup function
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [enableTouchFeedback, ensureTouchTargets, touchActiveClass, hapticFeedback]);

  return (
    <div 
      ref={containerRef}
      className={`mobile-optimized ${className}`}
      style={{
        // Ensure proper touch behavior
        touchAction: 'manipulation',
        // Prevent text selection on mobile
        userSelect: isMobile() ? 'none' : 'auto',
        WebkitUserSelect: isMobile() ? 'none' : 'auto',
        // Prevent callout on touch and hold
        WebkitTouchCallout: 'none',
        // Prevent tap highlight
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Hook for mobile-specific behavior
 */
export function useMobileOptimization() {
  useEffect(() => {
    initializeMobileOptimizations();
  }, []);

  return {
    isMobile: isMobile(),
    isTouchDevice: isTouchDevice(),
  };
}

/**
 * Higher-order component for mobile optimization
 */
export function withMobileOptimization<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<MobileOptimizedProps, 'children'> = {}
) {
  return function MobileOptimizedComponent(props: P) {
    return (
      <MobileOptimized {...options}>
        <Component {...props} />
      </MobileOptimized>
    );
  };
}