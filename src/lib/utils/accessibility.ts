/**
 * Accessibility utilities for WCAG AA compliance
 * Provides functions to test and ensure accessibility standards
 */

/**
 * Calculate color contrast ratio between two colors
 * @param color1 - First color (hex, rgb, or hsl)
 * @param color2 - Second color (hex, rgb, or hsl)
 * @returns Contrast ratio (1-21)
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 1;
  
  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color combination meets WCAG AA standards
 * @param foreground - Foreground color
 * @param background - Background color
 * @param isLargeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns Whether combination meets WCAG AA standards
 */
export function meetsWCAGAA(
  foreground: string, 
  background: string, 
  isLargeText: boolean = false
): boolean {
  const ratio = calculateContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if color combination meets WCAG AAA standards
 * @param foreground - Foreground color
 * @param background - Background color
 * @param isLargeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns Whether combination meets WCAG AAA standards
 */
export function meetsWCAGAAA(
  foreground: string, 
  background: string, 
  isLargeText: boolean = false
): boolean {
  const ratio = calculateContrastRatio(foreground, background);
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate relative luminance for a color
 */
function getRelativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Keyboard navigation utilities
 */
export class KeyboardNavigation {
  private static isKeyboardUser = false;
  
  /**
   * Initialize keyboard navigation detection
   */
  static init(): void {
    if (typeof window === 'undefined') return;
    
    // Detect keyboard usage
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        this.isKeyboardUser = true;
        document.body.classList.add('keyboard-nav-active');
      }
    });
    
    // Detect mouse usage
    document.addEventListener('mousedown', () => {
      this.isKeyboardUser = false;
      document.body.classList.remove('keyboard-nav-active');
    });
  }
  
  /**
   * Check if user is navigating with keyboard
   */
  static isUsingKeyboard(): boolean {
    return this.isKeyboardUser;
  }
  
  /**
   * Trap focus within an element
   */
  static trapFocus(element: HTMLElement): () => void {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };
    
    element.addEventListener('keydown', handleTabKey);
    
    // Return cleanup function
    return () => {
      element.removeEventListener('keydown', handleTabKey);
    };
  }
}

/**
 * Screen reader utilities
 */
export class ScreenReader {
  /**
   * Announce message to screen readers
   */
  static announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (typeof window === 'undefined') return;
    
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement with proper error handling
    setTimeout(() => {
      try {
        if (announcement.parentNode === document.body) {
          document.body.removeChild(announcement);
        }
      } catch (error) {
        // Silently handle case where element was already removed
      }
    }, 1000);
  }
  
  /**
   * Create live region for dynamic content updates
   */
  static createLiveRegion(id: string, priority: 'polite' | 'assertive' = 'polite'): HTMLElement {
    if (typeof window === 'undefined') return document.createElement('div');
    
    let region = document.getElementById(id);
    
    if (!region) {
      region = document.createElement('div');
      region.id = id;
      region.setAttribute('aria-live', priority);
      region.setAttribute('aria-atomic', 'true');
      region.className = 'sr-only';
      document.body.appendChild(region);
    }
    
    return region;
  }
}

/**
 * Reduced motion utilities
 */
export class ReducedMotion {
  /**
   * Check if user prefers reduced motion
   */
  static prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  
  /**
   * Conditionally apply animation based on user preference
   */
  static conditionalAnimation(
    element: HTMLElement, 
    animationClass: string, 
    fallbackClass?: string
  ): void {
    if (this.prefersReducedMotion()) {
      if (fallbackClass) {
        element.classList.add(fallbackClass);
      }
    } else {
      element.classList.add(animationClass);
    }
  }
}

/**
 * Color scheme utilities
 */
export class ColorScheme {
  /**
   * Check if user prefers high contrast
   */
  static prefersHighContrast(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-contrast: high)').matches;
  }
}

/**
 * Validate ARIA attributes
 */
export function validateARIA(element: HTMLElement): string[] {
  const errors: string[] = [];
  
  // Check for required ARIA attributes
  const role = element.getAttribute('role');
  const ariaLabel = element.getAttribute('aria-label');
  const ariaLabelledBy = element.getAttribute('aria-labelledby');
  
  // Interactive elements should have accessible names
  if (element.matches('button, input, select, textarea, [role="button"], [role="link"]')) {
    const hasAccessibleName = ariaLabel || 
                             ariaLabelledBy || 
                             element.textContent?.trim() ||
                             (element.tagName === 'INPUT' && hasAssociatedLabel(element as HTMLInputElement));
    
    if (!hasAccessibleName) {
      errors.push('Interactive element missing accessible name');
    }
  }
  
  // Check for invalid ARIA combinations
  if (role === 'button' && element.tagName === 'A' && !element.getAttribute('href')) {
    errors.push('Button role on anchor without href');
  }
  
  return errors;
}

/**
 * Check if input has an associated label
 */
function hasAssociatedLabel(input: HTMLInputElement): boolean {
  if (!input.id) return false;
  
  // Check for label with for attribute
  const label = document.querySelector(`label[for="${input.id}"]`);
  return !!label;
}

/**
 * Test color combinations for our design system
 */
export const designSystemColorTests = {
  // Primary mint green combinations - using darker shades for better contrast
  mintOnWhite: () => meetsWCAGAA('#047857', '#ffffff'), // mint-700 on white
  mintOnNeutral50: () => meetsWCAGAA('#047857', '#fefefe'), // mint-700 on neutral-50
  whiteOnMint: () => meetsWCAGAA('#ffffff', '#047857'), // white on mint-700
  
  // Secondary salmon combinations - using darker shades for better contrast
  salmonOnWhite: () => meetsWCAGAA('#be123c', '#ffffff'), // salmon-700 on white
  salmonOnNeutral50: () => meetsWCAGAA('#be123c', '#fefefe'), // salmon-700 on neutral-50
  whiteOnSalmon: () => meetsWCAGAA('#ffffff', '#be123c'), // white on salmon-700
  
  // Text combinations
  primaryTextOnBackground: () => meetsWCAGAA('#1f2937', '#fefefe'),
  secondaryTextOnBackground: () => meetsWCAGAA('#4b5563', '#fefefe'),
  mutedTextOnBackground: () => meetsWCAGAA('#6b7280', '#fefefe'), // Using neutral-500 for better contrast
  
  // Error states
  errorOnBackground: () => meetsWCAGAA('#dc2626', '#fefefe'), // Using red-600 for better contrast
  errorTextOnBackground: () => meetsWCAGAA('#dc2626', '#fefefe'),
  
  // Success states
  successOnBackground: () => meetsWCAGAA('#047857', '#fefefe'), // Using mint-700 for success text
  successTextOnBackground: () => meetsWCAGAA('#047857', '#fefefe'),
};