'use client';

import { useCallback } from 'react';

export type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'selection' | 'impact' | 'notification';

/** Telegram WebApp-style haptic feedback API (non-standard) */
interface HapticFeedbackAPI {
  impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
  selectionChanged: () => void;
  notificationOccurred: (type: 'success' | 'error' | 'warning') => void;
}

interface NavigatorWithHaptics extends Navigator {
  hapticFeedback: HapticFeedbackAPI;
}

/**
 * Hook for providing haptic feedback on supported devices
 */
export function useHapticFeedback() {
  const triggerHaptic = useCallback((type: HapticFeedbackType = 'light') => {
    // Check if device supports haptic feedback
    if (!('vibrate' in navigator)) {
      return;
    }

    // For devices with advanced haptic feedback (Telegram WebApp / iOS Safari)
    if ('hapticFeedback' in navigator) {
      const hapticNav = navigator as NavigatorWithHaptics;
      try {
        switch (type) {
          case 'light':
            hapticNav.hapticFeedback.impactOccurred('light');
            break;
          case 'medium':
            hapticNav.hapticFeedback.impactOccurred('medium');
            break;
          case 'heavy':
            hapticNav.hapticFeedback.impactOccurred('heavy');
            break;
          case 'selection':
            hapticNav.hapticFeedback.selectionChanged();
            break;
          case 'notification':
            hapticNav.hapticFeedback.notificationOccurred('success');
            break;
          default:
            hapticNav.hapticFeedback.impactOccurred('light');
        }
        return;
      } catch {
        // Haptic feedback not available — fall through to vibration API
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

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Vibration not supported
    }
  }, []);

  const isHapticSupported = typeof navigator !== 'undefined' &&
    ((typeof navigator.vibrate === 'function') || 'hapticFeedback' in navigator);

  return {
    triggerHaptic,
    isHapticSupported,
  };
}