/**
 * Accessibility initialization and runtime enhancements
 * Automatically sets up accessibility features when the app loads
 */

import { KeyboardNavigation, ScreenReader, ReducedMotion } from './accessibility';

/**
 * Initialize all accessibility features
 */
export function initializeAccessibility(): void {
  if (typeof window === 'undefined') return;

  // Initialize keyboard navigation detection
  KeyboardNavigation.init();

  // Set up skip links
  setupSkipLinks();

  // Initialize focus management
  setupFocusManagement();

  // Set up ARIA live regions
  setupLiveRegions();

  // Initialize reduced motion handling
  setupReducedMotionHandling();

  // Set up form accessibility enhancements
  setupFormAccessibility();

  // Initialize mobile accessibility features
  setupMobileAccessibility();

  // Set up color scheme detection
  setupColorSchemeDetection();
}

/**
 * Set up skip links for keyboard navigation
 */
function setupSkipLinks(): void {
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.className = 'skip-link';
  skipLink.textContent = 'Skip to main content';
  skipLink.setAttribute('tabindex', '0');

  // Insert at the beginning of the body
  document.body.insertBefore(skipLink, document.body.firstChild);

  // Ensure main content has proper ID
  const mainContent = document.querySelector('main') || 
                     document.querySelector('[role="main"]') ||
                     document.getElementById('main-content');

  if (mainContent && !mainContent.id) {
    mainContent.id = 'main-content';
  }
}

/**
 * Enhanced focus management
 */
function setupFocusManagement(): void {
  // Track focus for better keyboard navigation
  let lastFocusedElement: HTMLElement | null = null;

  document.addEventListener('focusin', (e) => {
    lastFocusedElement = e.target as HTMLElement;
  });

  // Return focus when modals close
  document.addEventListener('modal-closed', () => {
    if (lastFocusedElement && document.contains(lastFocusedElement)) {
      lastFocusedElement.focus();
    }
  });

  // Enhance focus visibility for keyboard users
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-nav-active');
    }
  });

  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-nav-active');
  });
}

/**
 * Set up ARIA live regions for announcements
 */
function setupLiveRegions(): void {
  // Create polite live region
  const politeRegion = ScreenReader.createLiveRegion('aria-live-polite', 'polite');
  
  // Create assertive live region
  const assertiveRegion = ScreenReader.createLiveRegion('aria-live-assertive', 'assertive');

  // Global announcement function
  (window as any).announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    ScreenReader.announce(message, priority);
  };
}

/**
 * Handle reduced motion preferences
 */
function setupReducedMotionHandling(): void {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  
  function handleReducedMotion(e: MediaQueryListEvent | MediaQueryList) {
    if (e.matches) {
      document.body.classList.add('reduce-motion');
      // Disable animations globally
      const style = document.createElement('style');
      style.id = 'reduced-motion-override';
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      `;
      document.head.appendChild(style);
    } else {
      document.body.classList.remove('reduce-motion');
      const existingStyle = document.getElementById('reduced-motion-override');
      if (existingStyle) {
        existingStyle.remove();
      }
    }
  }

  // Initial check
  handleReducedMotion(mediaQuery);
  
  // Listen for changes
  mediaQuery.addEventListener('change', handleReducedMotion);
}

/**
 * Enhance form accessibility
 */
function setupFormAccessibility(): void {
  // Auto-associate labels with inputs
  document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('input, select, textarea');
    
    inputs.forEach((input) => {
      const element = input as HTMLInputElement;
      
      // If no label association exists, try to find one
      if (!element.getAttribute('aria-labelledby') && !element.getAttribute('aria-label')) {
        const label = document.querySelector(`label[for="${element.id}"]`);
        if (!label && element.id) {
          // Look for a label that contains this input
          const parentLabel = element.closest('label');
          if (parentLabel) {
            parentLabel.setAttribute('for', element.id);
          }
        }
      }

      // Add required indicators
      if (element.required && !element.getAttribute('aria-required')) {
        element.setAttribute('aria-required', 'true');
      }

      // Set up validation feedback
      element.addEventListener('invalid', () => {
        element.setAttribute('aria-invalid', 'true');
        
        // Announce validation error
        const errorMessage = element.validationMessage;
        if (errorMessage) {
          ScreenReader.announce(`Validation error: ${errorMessage}`, 'assertive');
        }
      });

      element.addEventListener('input', () => {
        if (element.validity.valid) {
          element.removeAttribute('aria-invalid');
        }
      });
    });
  });

  // Form submission feedback
  document.addEventListener('submit', (e) => {
    const form = e.target as HTMLFormElement;
    const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    if (submitButton) {
      submitButton.setAttribute('aria-busy', 'true');
      ScreenReader.announce('Form is being submitted', 'polite');
    }
  });
}

/**
 * Mobile accessibility enhancements
 */
function setupMobileAccessibility(): void {
  // Prevent zoom on input focus for iOS
  const inputs = document.querySelectorAll('input, select, textarea');
  inputs.forEach((input) => {
    const element = input as HTMLInputElement;
    const computedStyle = window.getComputedStyle(element);
    
    // Ensure font size is at least 16px to prevent zoom
    if (parseFloat(computedStyle.fontSize) < 16) {
      element.style.fontSize = '16px';
    }
  });

  // Enhanced touch target sizing
  const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [role="button"]');
  interactiveElements.forEach((element) => {
    const el = element as HTMLElement;
    const rect = el.getBoundingClientRect();
    
    // Ensure minimum touch target size
    if (rect.height < 44 || rect.width < 44) {
      el.style.minHeight = '44px';
      el.style.minWidth = '44px';
    }
  });

  // Haptic feedback for supported devices
  if ('vibrate' in navigator) {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.matches('button, [role="button"]')) {
        navigator.vibrate(10); // Subtle haptic feedback
      }
    });
  }
}

/**
 * Color scheme detection and handling
 */
function setupColorSchemeDetection(): void {
  const highContrastQuery = window.matchMedia('(prefers-contrast: high)');

  function handleColorScheme() {
    // High contrast
    if (highContrastQuery.matches) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }

  // Initial setup
  handleColorScheme();

  // Listen for changes
  highContrastQuery.addEventListener('change', handleColorScheme);
}

/**
 * Validate page accessibility on load
 */
export function validatePageAccessibility(): void {
  if (typeof window === 'undefined') return;

  const issues: string[] = [];

  // Check for page title
  if (!document.title || document.title.trim() === '') {
    issues.push('Page is missing a title');
  }

  // Check for main landmark
  const main = document.querySelector('main, [role="main"]');
  if (!main) {
    issues.push('Page is missing a main landmark');
  }

  // Check for heading hierarchy
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  if (headings.length === 0) {
    issues.push('Page has no headings');
  } else {
    const h1Count = document.querySelectorAll('h1').length;
    if (h1Count === 0) {
      issues.push('Page is missing an h1 heading');
    } else if (h1Count > 1) {
      issues.push('Page has multiple h1 headings');
    }
  }

  // Check for images without alt text
  const images = document.querySelectorAll('img');
  images.forEach((img, index) => {
    if (!img.hasAttribute('alt')) {
      issues.push(`Image ${index + 1} is missing alt text`);
    }
  });

  // Check for form labels
  const inputs = document.querySelectorAll('input, select, textarea');
  inputs.forEach((input, index) => {
    const element = input as HTMLInputElement;
    const hasLabel = element.getAttribute('aria-label') || 
                    element.getAttribute('aria-labelledby') ||
                    document.querySelector(`label[for="${element.id}"]`);
    
    if (!hasLabel) {
      issues.push(`Form input ${index + 1} is missing a label`);
    }
  });

  // Log issues in development
  if (process.env.NODE_ENV === 'development' && issues.length > 0) {
    console.warn('Accessibility issues found:', issues);
  }
}

/**
 * Performance-optimized accessibility checker
 */
export function checkAccessibilityPerformance(): void {
  if (typeof window === 'undefined') return;

  // Check for excessive DOM depth
  const maxDepth = 15;
  const deepElements = document.querySelectorAll('*');
  let maxFoundDepth = 0;

  deepElements.forEach((element) => {
    let depth = 0;
    let parent = element.parentElement;
    
    while (parent) {
      depth++;
      parent = parent.parentElement;
    }
    
    maxFoundDepth = Math.max(maxFoundDepth, depth);
  });

  if (maxFoundDepth > maxDepth) {
    console.warn(`DOM depth (${maxFoundDepth}) exceeds recommended maximum (${maxDepth})`);
  }

  // Check for excessive number of focusable elements
  const focusableElements = document.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  if (focusableElements.length > 100) {
    console.warn(`High number of focusable elements (${focusableElements.length}) may impact keyboard navigation performance`);
  }
}