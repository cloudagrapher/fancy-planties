import { useEffect } from 'react';

/**
 * Custom hook that prevents body scrolling when active.
 *
 * Saves and restores the previous overflow style on cleanup,
 * so nested modals don't clobber each other.
 *
 * Usage:
 *   useScrollLock(isOpen);
 */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [active]);
}
