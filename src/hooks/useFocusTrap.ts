import { useEffect, useRef, type RefObject } from 'react';

/**
 * Custom hook that traps keyboard focus within a container element.
 *
 * When active, pressing Tab cycles through focusable elements inside the
 * container, wrapping from last → first and first → last (with Shift+Tab).
 * Focus is moved into the container on mount and restored to the previously
 * focused element on unmount.
 *
 * Usage:
 *   const containerRef = useFocusTrap<HTMLDivElement>(isOpen);
 *   return <div ref={containerRef}>…</div>;
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useFocusTrap<T extends HTMLElement>(active: boolean): RefObject<T | null> {
  const containerRef = useRef<T | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    // Remember what was focused before the trap activated
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    if (!container) return;

    // Move focus into the container — prefer the close button or first focusable element
    const focusFirst = () => {
      const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        // Fallback: make the container itself focusable
        container.setAttribute('tabindex', '-1');
        container.focus();
      }
    };

    // Small delay to let the DOM settle (portal rendering, animations)
    const timerId = setTimeout(focusFirst, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: wrap from first → last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: wrap from last → first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timerId);
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus to the previously focused element
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [active]);

  return containerRef;
}
