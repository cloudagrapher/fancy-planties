'use client';

import { useCallback } from 'react';

export type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'selection' | 'impact' | 'notification';

/**
 * Hook for providing haptic feedback on supported devices
 */
export function useHapticFeedback() {
  const triggerHaptic = useCallback((type: HapticFeedbackType = 'light') => {
    // Check if device supports haptic feedback
    if (!('vibrate' in navigator)) {
      return;
    }

    // For devices with advanced haptic feedback (iOS Safari)
    if ('hapticFeedback' in navigator) {
      try {
        switch (type) {
          case 'light':
            (navigator as any).hapticFeedback.impactOccurred('light');
            break;
          case 'medium':
            (navigator as any).hapticFeedback.impactOccurred('medium');
            break;
          case 'heavy':
            (navigator as any).hapticFeedback.impactOccurred('heavy');
            break;
          case 'selection':
            (navigator as any).hapticFeedback.selectionChanged();
            break;
          case 'notification':
            (navigator as any).hapticFeedback.notificationOccurred('success');
            break;
          default:
            (navigator as any).hapticFeedback.impactOccurred('light');
        }
        return;
      } catch (error) {
        console.log('Haptic feedback not available:', error);
      }
    }

    // Fallback to basic vibration API
    try {
      let pattern: number | number[];
      
      switch (type) {
        case 'light':
          pattern = 10;
          break;
        case 'medium':
          pattern = 20;
          break;
        case 'heavy':
          pattern = 50;
          break;
        case 'selection':
          pattern = [10, 10, 10];
          break;
        case 'notification':
          pattern = [50, 50, 50];
          break;
        default:
          pattern = 10;
      }

      navigator.vibrate(pattern);
    } catch (error) {
      console.log('Vibration not supported:', error);
    }
  }, []);

  const isHapticSupported = useCallback(() => {
    return 'vibrate' in navigator || 'hapticFeedback' in navigator;
  }, []);

  return {
    triggerHaptic,
    isHapticSupported: isHapticSupported(),
  };
}