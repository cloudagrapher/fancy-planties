'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useHapticFeedback } from './useHapticFeedback';

export interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number; // Distance to trigger refresh
  resistance?: number; // Resistance factor for pull distance
  enabled?: boolean;
}

/**
 * Hook for implementing pull-to-refresh functionality
 */
export function usePullToRefresh(options: PullToRefreshOptions) {
  const {
    onRefresh,
    threshold = 80,
    resistance = 2.5,
    enabled = true,
  } = options;

  const { triggerHaptic } = useHapticFeedback();
  const elementRef = useRef<HTMLDivElement | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const touchStartRef = useRef<{ y: number; scrollTop: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || isRefreshing) return;

    const element = elementRef.current;
    if (!element) return;

    // Only start pull-to-refresh if at the top of the scroll container
    const scrollTop = element.scrollTop || window.pageYOffset;
    if (scrollTop > 0) return;

    const touch = e.touches[0];
    touchStartRef.current = {
      y: touch.clientY,
      scrollTop,
    };
  }, [enabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || isRefreshing || !touchStartRef.current) return;

    const element = elementRef.current;
    if (!element) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Only proceed if pulling down and at top of scroll
    if (deltaY <= 0 || element.scrollTop > 0) {
      if (isPulling) {
        setIsPulling(false);
        setPullDistance(0);
      }
      return;
    }

    // Calculate pull distance with resistance
    const distance = Math.min(deltaY / resistance, threshold * 1.5);
    
    if (!isPulling && distance > 10) {
      setIsPulling(true);
      triggerHaptic('light');
    }

    setPullDistance(distance);

    // Trigger haptic feedback when threshold is reached
    if (distance >= threshold && pullDistance < threshold) {
      triggerHaptic('medium');
    }

    // Prevent default scrolling when pulling
    if (isPulling) {
      e.preventDefault();
    }
  }, [enabled, isRefreshing, isPulling, pullDistance, threshold, resistance, triggerHaptic]);

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || isRefreshing || !touchStartRef.current) return;

    const shouldRefresh = pullDistance >= threshold;

    if (shouldRefresh) {
      setIsRefreshing(true);
      triggerHaptic('heavy');
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }

    // Reset state
    setIsPulling(false);
    setPullDistance(0);
    touchStartRef.current = null;
  }, [enabled, isRefreshing, pullDistance, threshold, onRefresh, triggerHaptic]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Animate pull distance changes
  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (!isPulling && !isRefreshing && pullDistance > 0) {
      // Animate back to 0
      const animate = () => {
        setPullDistance(prev => {
          const newDistance = prev * 0.9;
          if (newDistance < 1) {
            return 0;
          }
          animationFrameRef.current = requestAnimationFrame(animate);
          return newDistance;
        });
      };
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPulling, isRefreshing, pullDistance]);

  const getRefreshIndicatorStyle = () => {
    const progress = Math.min(pullDistance / threshold, 1);
    const opacity = Math.min(progress * 2, 1);
    const scale = 0.5 + (progress * 0.5);
    const rotation = progress * 180;

    return {
      opacity,
      transform: `scale(${scale}) rotate(${rotation}deg)`,
      transition: isPulling ? 'none' : 'all 0.3s ease-out',
    };
  };

  return {
    elementRef,
    isRefreshing,
    isPulling,
    pullDistance,
    progress: Math.min(pullDistance / threshold, 1),
    getRefreshIndicatorStyle,
  };
}