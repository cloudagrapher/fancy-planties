'use client';

import { useState, useEffect, useCallback } from 'react';

type ViewMode = 'grid' | 'list';

/**
 * Manages a grid/list view mode toggle persisted to localStorage.
 * Defaults to the given `defaultMode` during SSR, then restores the saved
 * preference after hydration to avoid mismatch.
 */
export function usePersistedViewMode(
  storageKey: string,
  defaultMode: ViewMode = 'grid',
): [ViewMode, (mode: ViewMode) => void] {
  const [viewMode, setViewModeState] = useState<ViewMode>(defaultMode);

  // Restore persisted value after hydration
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'list' || saved === 'grid') {
      setViewModeState(saved);
    }
  }, [storageKey]);

  const setViewMode = useCallback(
    (mode: ViewMode) => {
      setViewModeState(mode);
      localStorage.setItem(storageKey, mode);
    },
    [storageKey],
  );

  return [viewMode, setViewMode];
}
