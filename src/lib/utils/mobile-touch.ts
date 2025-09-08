/**
 * Mobile touch interaction utilities
 */

export interface TouchTargetConfig {
  minSize: number; // Minimum touch target size in pixels
  padding: number; // Additional padding for touch area
}

export const TOUCH_TARGET_CONFIG: TouchTargetConfig = {
  minSize: 44, // Apple's recommended minimum touch target size
  padding: 8,
};

/**
 * Ensure touch targets meet minimum size requirements
 */
export function ensureTouchTargetSize(element: HTMLElement, config = TOUCH_TARGET_CONFIG): void {
  const rect = element.getBoundingClientRect();
  const { minSize, padding } = config;

  // Check if element is too small
  if (rect.width < minSize || rect.height < minSize) {
    // Add padding to increase touch area
    const horizontalPadding = Math.max(0, (minSize - rect.width) / 2 + padding);
    const verticalPadding = Math.max(0, (minSize - rect.height) / 2 + padding);

    element.style.padding = `${verticalPadding}px ${horizontalPadding}px`;
    element.style.minWidth = `${minSize}px`;
    element.style.minHeight = `${minSize}px`;
  }
}

/**
 * Add touch-friendly styles to interactive elements
 */
export function addTouchStyles(element: HTMLElement): void {
  // Prevent text selection on touch
  element.style.userSelect = 'none';
  (element.style as any).webkitUserSelect = 'none';
  
  // Prevent callout on touch and hold
  (element.style as any).webkitTouchCallout = 'none';
  
  // Prevent tap highlight
  (element.style as any).webkitTapHighlightColor = 'transparent';
  
  // Ensure proper touch action
  element.style.touchAction = 'manipulation';
  
  // Add cursor pointer for better UX
  element.style.cursor = 'pointer';
}

/**
 * Handle touch events with proper feedback
 */
export function addTouchFeedback(
  element: HTMLElement,
  options: {
    activeClass?: string;
    feedbackDuration?: number;
    hapticFeedback?: boolean;
  } = {}
): () => void {
  const {
    activeClass = 'touch-active',
    feedbackDuration = 150,
    hapticFeedback = true,
  } = options;

  let touchTimeout: NodeJS.Timeout | null = null;

  const handleTouchStart = (e: TouchEvent) => {
    // Add active state
    element.classList.add(activeClass);
    
    // Haptic feedback if supported
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10); // Short vibration
    }
    
    // Clear any existing timeout
    if (touchTimeout) {
      clearTimeout(touchTimeout);
    }
  };

  const handleTouchEnd = () => {
    // Remove active state after delay
    touchTimeout = setTimeout(() => {
      element.classList.remove(activeClass);
    }, feedbackDuration);
  };

  const handleTouchCancel = () => {
    element.classList.remove(activeClass);
    if (touchTimeout) {
      clearTimeout(touchTimeout);
    }
  };

  // Add event listeners
  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchend', handleTouchEnd, { passive: true });
  element.addEventListener('touchcancel', handleTouchCancel, { passive: true });

  // Return cleanup function
  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchend', handleTouchEnd);
    element.removeEventListener('touchcancel', handleTouchCancel);
    
    if (touchTimeout) {
      clearTimeout(touchTimeout);
    }
  };
}

/**
 * Detect if device supports touch
 */
export function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - Legacy support
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Get viewport dimensions accounting for mobile browsers
 */
export function getViewportDimensions(): { width: number; height: number } {
  // Use visualViewport API if available (better for mobile)
  if (window.visualViewport) {
    return {
      width: window.visualViewport.width,
      height: window.visualViewport.height,
    };
  }

  // Fallback to window dimensions
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/**
 * Check if element is within safe touch area (not too close to screen edges)
 */
export function isInSafeTouchArea(
  element: HTMLElement,
  safeMargin: number = 20
): boolean {
  const rect = element.getBoundingClientRect();
  const viewport = getViewportDimensions();

  return (
    rect.left >= safeMargin &&
    rect.top >= safeMargin &&
    rect.right <= viewport.width - safeMargin &&
    rect.bottom <= viewport.height - safeMargin
  );
}

/**
 * Prevent zoom on double tap for specific elements
 */
export function preventDoubleTabZoom(element: HTMLElement): () => void {
  let lastTouchEnd = 0;

  const handleTouchEnd = (e: TouchEvent) => {
    const now = new Date().getTime();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  };

  element.addEventListener('touchend', handleTouchEnd, { passive: false });

  return () => {
    element.removeEventListener('touchend', handleTouchEnd);
  };
}

/**
 * Add swipe gesture detection
 */
export function addSwipeGesture(
  element: HTMLElement,
  callbacks: {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
  },
  options: {
    threshold?: number;
    restraint?: number;
    allowedTime?: number;
  } = {}
): () => void {
  const {
    threshold = 100, // Minimum distance for swipe
    restraint = 100, // Maximum perpendicular distance
    allowedTime = 300, // Maximum time for swipe
  } = options;

  let startX = 0;
  let startY = 0;
  let startTime = 0;

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    startTime = new Date().getTime();
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    const endTime = new Date().getTime();

    const elapsedTime = endTime - startTime;
    if (elapsedTime > allowedTime) return;

    const distX = endX - startX;
    const distY = endY - startY;

    // Check for horizontal swipe
    if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint) {
      if (distX > 0 && callbacks.onSwipeRight) {
        callbacks.onSwipeRight();
      } else if (distX < 0 && callbacks.onSwipeLeft) {
        callbacks.onSwipeLeft();
      }
    }
    // Check for vertical swipe
    else if (Math.abs(distY) >= threshold && Math.abs(distX) <= restraint) {
      if (distY > 0 && callbacks.onSwipeDown) {
        callbacks.onSwipeDown();
      } else if (distY < 0 && callbacks.onSwipeUp) {
        callbacks.onSwipeUp();
      }
    }
  };

  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchend', handleTouchEnd, { passive: true });

  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchend', handleTouchEnd);
  };
}

/**
 * CSS classes for touch interactions
 */
export const TOUCH_STYLES = `
  .touch-target {
    min-width: 44px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    touch-action: manipulation;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
    cursor: pointer;
  }

  .touch-active {
    opacity: 0.7;
    transform: scale(0.95);
    transition: opacity 0.1s ease, transform 0.1s ease;
  }

  .touch-feedback {
    position: relative;
    overflow: hidden;
  }

  .touch-feedback::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    transition: width 0.3s ease, height 0.3s ease;
  }

  .touch-feedback.active::after {
    width: 200px;
    height: 200px;
  }

  @media (hover: none) and (pointer: coarse) {
    /* Mobile-specific styles */
    .hover-only {
      display: none !important;
    }
    
    .touch-only {
      display: block !important;
    }
    
    /* Increase button sizes on mobile */
    button, .btn {
      min-height: 44px;
      padding: 12px 16px;
    }
    
    /* Improve form inputs on mobile */
    input, textarea, select {
      min-height: 44px;
      font-size: 16px; /* Prevent zoom on iOS */
    }
  }

  @media (hover: hover) and (pointer: fine) {
    /* Desktop-specific styles */
    .touch-only {
      display: none !important;
    }
    
    .hover-only {
      display: block !important;
    }
  }
`;