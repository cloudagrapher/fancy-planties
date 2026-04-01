import { useEffect } from 'react';

/**
 * Custom hook that calls a handler when the Escape key is pressed.
 *
 * Usage:
 *   useEscapeKey(onClose);
 *   useEscapeKey(onClose, isOpen); // Only active when isOpen is true
 */
export function useEscapeKey(handler: () => void, active = true): void {
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handler();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handler, active]);
}
