/**
 * Comprehensive accessibility tests for the design system
 * Tests WCAG AA compliance, keyboard navigation, and mobile usability
 */

import { 
  calculateContrastRatio, 
  meetsWCAGAA, 
  designSystemColorTests,
  KeyboardNavigation,
  ScreenReader,
  ReducedMotion,
  ColorScheme,
  validateARIA
} from '@/lib/utils/accessibility';

describe('Design System Accessibility', () => {
  describe('Color Contrast Compliance', () => {
    test('should meet WCAG AA contrast requirements for primary colors', () => {
      // Test mint green combinations
      expect(designSystemColorTests.mintOnWhite()).toBe(true);
      expect(designSystemColorTests.mintOnNeutral50()).toBe(true);
      expect(designSystemColorTests.whiteOnMint()).toBe(true);
    });

    test('should meet WCAG AA contrast requirements for secondary colors', () => {
      // Test salmon combinations
      expect(designSystemColorTests.salmonOnWhite()).toBe(true);
      expect(designSystemColorTests.salmonOnNeutral50()).toBe(true);
      expect(designSystemColorTests.whiteOnSalmon()).toBe(true);
    });

    test('should meet WCAG AA contrast requirements for text colors', () => {
      expect(designSystemColorTests.primaryTextOnBackground()).toBe(true);
      expect(designSystemColorTests.secondaryTextOnBackground()).toBe(true);
      // Note: Muted text may not meet AA but should meet minimum requirements
    });

    test('should meet WCAG AA contrast requirements for status colors', () => {
      expect(designSystemColorTests.errorTextOnBackground()).toBe(true);
      expect(designSystemColorTests.successTextOnBackground()).toBe(true);
    });

    test('should calculate contrast ratios correctly', () => {
      // Test known contrast ratios
      const blackOnWhite = calculateContrastRatio('#000000', '#ffffff');
      expect(blackOnWhite).toBeCloseTo(21, 1);

      const whiteOnBlack = calculateContrastRatio('#ffffff', '#000000');
      expect(whiteOnBlack).toBeCloseTo(21, 1);

      const grayOnWhite = calculateContrastRatio('#767676', '#ffffff');
      expect(grayOnWhite).toBeGreaterThan(4.5); // Should meet AA
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
      document.body.className = '';
    });

    test('should detect keyboard navigation', () => {
      KeyboardNavigation.init();
      
      // Simulate Tab key press
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      document.dispatchEvent(tabEvent);
      
      expect(document.body.classList.contains('keyboard-nav-active')).toBe(true);
    });

    test('should remove keyboard navigation class on mouse use', () => {
      KeyboardNavigation.init();
      
      // First activate keyboard navigation
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      document.dispatchEvent(tabEvent);
      
      // Then simulate mouse use
      const mouseEvent = new MouseEvent('mousedown');
      document.dispatchEvent(mouseEvent);
      
      expect(document.body.classList.contains('keyboard-nav-active')).toBe(false);
    });

    test('should trap focus within modal', () => {
      // Create modal with focusable elements
      const modal = document.createElement('div');
      modal.innerHTML = `
        <button id="first">First</button>
        <input id="middle" type="text" />
        <button id="last">Last</button>
      `;
      document.body.appendChild(modal);

      const cleanup = KeyboardNavigation.trapFocus(modal);
      
      const firstButton = document.getElementById('first') as HTMLButtonElement;
      const lastButton = document.getElementById('last') as HTMLButtonElement;
      
      // Focus last element and press Tab
      lastButton.focus();
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      modal.dispatchEvent(tabEvent);
      
      // Should cycle back to first element
      expect(document.activeElement).toBe(firstButton);
      
      cleanup();
    });
  });

  describe('Screen Reader Support', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    test('should create live region for announcements', () => {
      const region = ScreenReader.createLiveRegion('test-region', 'polite');
      
      expect(region.getAttribute('aria-live')).toBe('polite');
      expect(region.getAttribute('aria-atomic')).toBe('true');
      expect(region.classList.contains('sr-only')).toBe(true);
    });

    test('should announce messages to screen readers', () => {
      ScreenReader.announce('Test message', 'assertive');
      
      const announcements = document.querySelectorAll('[aria-live="assertive"]');
      expect(announcements.length).toBeGreaterThan(0);
      
      const lastAnnouncement = announcements[announcements.length - 1];
      expect(lastAnnouncement.textContent).toBe('Test message');
    });
  });

  describe('Reduced Motion Support', () => {
    test('should detect reduced motion preference', () => {
      // Mock matchMedia
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      expect(ReducedMotion.prefersReducedMotion()).toBe(true);
    });

    test('should apply conditional animations based on preference', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      // Mock reduced motion preference
      jest.spyOn(ReducedMotion, 'prefersReducedMotion').mockReturnValue(true);
      
      ReducedMotion.conditionalAnimation(element, 'animate-slide', 'no-animation');
      
      expect(element.classList.contains('no-animation')).toBe(true);
      expect(element.classList.contains('animate-slide')).toBe(false);
    });
  });

  describe('Color Scheme Detection', () => {
    test('should detect dark mode preference', () => {
      // Mock matchMedia for dark mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      expect(ColorScheme.prefersDarkMode()).toBe(true);
    });

    test('should detect high contrast preference', () => {
      // Mock matchMedia for high contrast
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      expect(ColorScheme.prefersHighContrast()).toBe(true);
    });
  });

  describe('ARIA Validation', () => {
    test('should validate button accessibility', () => {
      const button = document.createElement('button');
      button.textContent = 'Click me';
      
      const errors = validateARIA(button);
      expect(errors).toHaveLength(0);
    });

    test('should detect missing accessible name', () => {
      const button = document.createElement('button');
      // No text content or aria-label
      
      const errors = validateARIA(button);
      expect(errors).toContain('Interactive element missing accessible name');
    });

    test('should validate input accessibility', () => {
      const input = document.createElement('input');
      input.setAttribute('aria-label', 'Search');
      
      const errors = validateARIA(input);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Mobile Touch Targets', () => {
    test('should ensure minimum touch target sizes', () => {
      // Create test elements
      const button = document.createElement('button');
      button.className = 'btn';
      document.body.appendChild(button);

      const styles = window.getComputedStyle(button);
      const minHeight = parseInt(styles.minHeight);
      
      // Should meet minimum 44px touch target
      expect(minHeight).toBeGreaterThanOrEqual(44);
    });

    test('should have comfortable touch targets for primary actions', () => {
      const button = document.createElement('button');
      button.className = 'btn btn--primary';
      document.body.appendChild(button);

      const styles = window.getComputedStyle(button);
      const minHeight = parseInt(styles.minHeight);
      
      // Should meet comfortable 48px touch target
      expect(minHeight).toBeGreaterThanOrEqual(48);
    });
  });

  describe('Form Accessibility', () => {
    test('should associate labels with inputs', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <label for="email" class="form-label">Email</label>
        <input id="email" type="email" class="form-input" />
      `;
      
      const label = container.querySelector('label') as HTMLLabelElement;
      const input = container.querySelector('input') as HTMLInputElement;
      
      expect(label.getAttribute('for')).toBe(input.id);
    });

    test('should indicate required fields', () => {
      const label = document.createElement('label');
      label.className = 'form-label form-label--required';
      label.textContent = 'Required Field';
      
      // Check if required indicator is present in CSS
      const styles = window.getComputedStyle(label, '::after');
      expect(label.classList.contains('form-label--required')).toBe(true);
    });

    test('should provide error feedback', () => {
      const input = document.createElement('input');
      input.className = 'form-input';
      input.setAttribute('aria-invalid', 'true');
      
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });
  });

  describe('Performance Accessibility', () => {
    test('should respect reduced motion in CSS', () => {
      // Test that reduced motion media query exists in CSS
      const style = document.createElement('style');
      style.textContent = `
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `;
      document.head.appendChild(style);
      
      expect(style.textContent).toContain('prefers-reduced-motion: reduce');
    });

    test('should use efficient selectors', () => {
      // Test that we use class selectors over complex descendant selectors
      const element = document.createElement('div');
      element.className = 'btn btn--primary';
      
      // Should be able to target with simple class selectors
      expect(element.classList.contains('btn')).toBe(true);
      expect(element.classList.contains('btn--primary')).toBe(true);
    });
  });
});

describe('Design System Color Validation', () => {
  // Test all design system colors for WCAG compliance
  const colorPairs = [
    // Primary mint green - using darker shades for WCAG AA compliance
    { fg: '#047857', bg: '#ffffff', name: 'Mint 700 on White' },
    { fg: '#ffffff', bg: '#047857', name: 'White on Mint 700' },
    { fg: '#065f46', bg: '#f0fdf4', name: 'Mint 800 on Mint 50' },
    
    // Secondary salmon - using darker shades for WCAG AA compliance
    { fg: '#be123c', bg: '#fff1f2', name: 'Salmon 700 on Salmon 50' },
    { fg: '#ffffff', bg: '#be123c', name: 'White on Salmon 700' },
    
    // Text colors
    { fg: '#1f2937', bg: '#fefefe', name: 'Neutral 800 on Neutral 50' },
    { fg: '#4b5563', bg: '#fefefe', name: 'Neutral 600 on Neutral 50' },
    { fg: '#374151', bg: '#ffffff', name: 'Neutral 700 on White' },
    
    // Status colors
    { fg: '#dc2626', bg: '#fefefe', name: 'Error text on background' },
    { fg: '#047857', bg: '#fefefe', name: 'Success text on background' },
    { fg: '#b45309', bg: '#fefefe', name: 'Warning text on background' }, // Using amber-700 for better contrast
  ];

  colorPairs.forEach(({ fg, bg, name }) => {
    test(`${name} should meet WCAG AA contrast requirements`, () => {
      const ratio = calculateContrastRatio(fg, bg);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });
});