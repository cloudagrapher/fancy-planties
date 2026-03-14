'use client';

import { useState, useCallback, useRef } from 'react';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UseToastOptions {
  /** Auto-dismiss timeout in ms (default: 3000). Set to 0 to disable. */
  duration?: number;
  /** Maximum number of visible toasts (default: 3) */
  maxToasts?: number;
}

/**
 * Lightweight toast notification hook.
 *
 * Usage:
 *   const { toasts, showToast, dismissToast } = useToast();
 *   showToast('Saved!', 'success');
 *
 * Renders: map over `toasts` in your component to display them.
 */
export function useToast({ duration = 3000, maxToasts = 3 }: UseToastOptions = {}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++idRef.current;
    setToasts(prev => {
      const next = [...prev, { id, message, type }];
      // Keep only the most recent toasts
      return next.slice(-maxToasts);
    });

    if (duration > 0) {
      setTimeout(() => dismissToast(id), duration);
    }

    return id;
  }, [duration, maxToasts, dismissToast]);

  return { toasts, showToast, dismissToast } as const;
}
