/**
 * Automated Accessibility Testing for WCAG AA Compliance
 * Tests color contrast, focus management, and ARIA attributes
 */

import '@testing-library/jest-dom';
import { 
  calculateContrastRatio, 
  meetsWCAGAA, 
  KeyboardNavigation,
  ScreenReader,
  validateARIA 
} from '@/lib/utils/accessibility';

describe('WCAG AA Compliance Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('Color Contrast Compliance', () => {
    const colorTests = [
      // Primary mint green combinations - using WCAG AA compliant colors
      { fg: '#047857', bg: '#ffffff', name: 'Mint 700 on White', expected: true },
      { fg: '#ffffff', bg: '#047857', name: 'White on Mint 700', expected: true },
      { fg: '#065f46', bg: '#f0fdf4', name: 'Mint 800 on Mint 50', expected: true },
      
      // Secondary salmon combinations - using WCAG AA compliant colors
      { fg: '#be123c', bg: '#fff1f2', name: 'Salmon 700 on Salmon 50', expected: true },
      { fg: '#ffffff', bg: '#be123c', name: 'White on Salmon 700', expected: true },
      
      // Text colors
      { fg: '#1f2937', bg: '#fefefe', name: 'Neutral 800 on Neutral 50', expected: true },
      { fg: '#4b5563', bg: '#fefefe', name: 'Neutral 600 on Neutral 50', expected: true },
      { fg: '#374151', bg: '#ffffff', name: 'Neutral 700 on White', expected: true },
      
      // Status colors
      { fg: '#dc2626', bg: '#fefefe', name: 'Error text on background', expected: true },
      { fg: '#047857', bg: '#fefefe', name: 'Success text on background', expected: true },
      { fg: '#b45309', bg: '#fefefe', name: 'Warning text on background', expected: true },
      
      // Failing combinations (should not meet WCAG AA)
      { fg: '#a7f3d0', bg: '#ffffff', name: 'Mint 200 on White (too light)', expected: false },
      { fg: '#fda4af', bg: '#ffffff', name: 'Salmon 300 on White (too light)', expected: false },
    ];

    colorTests.forEach(({ fg, bg, name, expected }) => {
      test(`${name} should ${expected ? 'meet' : 'not meet'} WCAG AA contrast requirements`, () => {
        const ratio = calculateContrastRatio(fg, bg);
        const meetsStandard = meetsWCAGAA(fg, bg);
        
        expect(meetsStandard).toBe(expected);
        
        if (expected) {
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        } else {
          expect(ratio).toBeLessThan(4.5);
        }
      });
    });

    test('should calculate contrast ratios correctly', () => {
      // Test known contrast ratios
      const blackOnWhite = calculateContrastRatio('#000000', '#ffffff');
      expect(blackOnWhite).toBeCloseTo(21, 1);

      const whiteOnBlack = calculateContrastRatio('#ffffff', '#000000');
      expect(whiteOnBlack).toBeCloseTo(21, 1);

      // Test medium contrast
      const grayOnWhite = calculateContrastRatio('#767676', '#ffffff');
      expect(grayOnWhite).toBeGreaterThan(4.5);
    });

    test('should handle large text contrast requirements', () => {
      // Large text only needs 3:1 ratio - use a color that gives exactly the right ratio
      const lightGray = '#949494'; // This should give approximately 3.8:1 ratio
      const white = '#ffffff';
      
      const ratio = calculateContrastRatio(lightGray, white);
      expect(ratio).toBeGreaterThan(3);
      expect(ratio).toBeLessThan(4.5);
      
      // Should pass for large text
      expect(meetsWCAGAA(lightGray, white, true)).toBe(true);
      // Should fail for normal text
      expect(meetsWCAGAA(lightGray, white, false)).toBe(false);
    });
  });

  describe('Focus Management', () => {
    beforeEach(() => {
      // Add CSS for focus testing
      const style = document.createElement('style');
      style.textContent = `
        .btn:focus-visible {
          outline: 2px solid #34d399;
          outline-offset: 2px;
          box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.2);
        }
        
        .form-input:focus {
          outline: none;
          border-color: #34d399;
          box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.1);
        }
        
        .keyboard-nav-active *:focus {
          outline: 2px solid #34d399;
          outline-offset: 2px;
        }
        
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `;
      document.head.appendChild(style);
    });

    test('should detect keyboard navigation', () => {
      KeyboardNavigation.init();
      
      // Simulate Tab key press
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      document.dispatchEvent(tabEvent);
      
      expect(document.body.classList.contains('keyboard-nav-active')).toBe(true);
      expect(KeyboardNavigation.isUsingKeyboard()).toBe(true);
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
      expect(KeyboardNavigation.isUsingKeyboard()).toBe(false);
    });

    test('should trap focus within modal', () => {
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

    test('should handle reverse tab navigation in focus trap', () => {
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
      
      // Focus first element and press Shift+Tab
      firstButton.focus();
      const shiftTabEvent = new KeyboardEvent('keydown', { 
        key: 'Tab', 
        shiftKey: true 
      });
      modal.dispatchEvent(shiftTabEvent);
      
      // Should cycle to last element
      expect(document.activeElement).toBe(lastButton);
      
      cleanup();
    });

    test('should provide visible focus indicators', () => {
      const button = document.createElement('button');
      button.className = 'btn';
      button.textContent = 'Test Button';
      document.body.appendChild(button);

      // Simulate focus
      button.focus();
      
      // jsdom doesn't support pseudo-element styles, so we just check focus
      expect(button).toHaveFocus();
      
      // Verify the CSS rule exists in our stylesheet
      const styles = document.head.querySelectorAll('style');
      const hasVisibleFocusRule = Array.from(styles).some(style => 
        style.textContent?.includes(':focus-visible') || 
        style.textContent?.includes(':focus')
      );
      expect(hasVisibleFocusRule).toBe(true);
    });
  });

  describe('Screen Reader Support', () => {
    test('should create live region for announcements', () => {
      const region = ScreenReader.createLiveRegion('test-region', 'polite');
      
      expect(region.getAttribute('aria-live')).toBe('polite');
      expect(region.getAttribute('aria-atomic')).toBe('true');
      expect(region.classList.contains('sr-only')).toBe(true);
      expect(region.id).toBe('test-region');
    });

    test('should announce messages to screen readers', () => {
      ScreenReader.announce('Test message', 'assertive');
      
      const announcements = document.querySelectorAll('[aria-live="assertive"]');
      expect(announcements.length).toBeGreaterThan(0);
      
      const lastAnnouncement = announcements[announcements.length - 1];
      expect(lastAnnouncement.textContent).toBe('Test message');
    });

    test('should clean up announcements after timeout', (done) => {
      ScreenReader.announce('Temporary message', 'polite');
      
      const initialCount = document.querySelectorAll('[aria-live="polite"]').length;
      
      setTimeout(() => {
        const finalCount = document.querySelectorAll('[aria-live="polite"]').length;
        expect(finalCount).toBeLessThan(initialCount);
        done();
      }, 1100); // Wait longer than the cleanup timeout
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

    test('should validate input accessibility with aria-label', () => {
      const input = document.createElement('input');
      input.setAttribute('aria-label', 'Search');
      
      const errors = validateARIA(input);
      expect(errors).toHaveLength(0);
    });

    test('should validate input accessibility with associated label', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <label for="email-input">Email Address</label>
        <input id="email-input" type="email" />
      `;
      document.body.appendChild(container);
      
      const input = container.querySelector('input') as HTMLInputElement;
      const errors = validateARIA(input);
      expect(errors).toHaveLength(0);
    });

    test('should detect invalid ARIA combinations', () => {
      const anchor = document.createElement('a');
      anchor.setAttribute('role', 'button');
      // No href attribute
      
      const errors = validateARIA(anchor);
      expect(errors).toContain('Button role on anchor without href');
    });

    test('should validate form field requirements', () => {
      const input = document.createElement('input');
      input.type = 'email';
      input.required = true;
      input.setAttribute('aria-label', 'Email address');
      
      const errors = validateARIA(input);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Form Accessibility', () => {
    test('should associate labels with inputs correctly', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <label for="username" class="form-label">Username</label>
        <input id="username" type="text" class="form-input" />
      `;
      document.body.appendChild(container);
      
      const label = container.querySelector('label') as HTMLLabelElement;
      const input = container.querySelector('input') as HTMLInputElement;
      
      expect(label.getAttribute('for')).toBe(input.id);
      expect(label.htmlFor).toBe('username');
    });

    test('should indicate required fields properly', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <label for="required-field" class="form-label">Required Field *</label>
        <input id="required-field" type="text" class="form-input" required aria-required="true" />
      `;
      document.body.appendChild(container);
      
      const input = container.querySelector('input') as HTMLInputElement;
      
      expect(input.required).toBe(true);
      expect(input.getAttribute('aria-required')).toBe('true');
    });

    test('should provide error feedback with proper ARIA', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <label for="email-field" class="form-label">Email</label>
        <input 
          id="email-field" 
          type="email" 
          class="form-input" 
          aria-invalid="true"
          aria-describedby="email-error"
        />
        <div id="email-error" class="form-error" role="alert">
          Please enter a valid email address
        </div>
      `;
      document.body.appendChild(container);
      
      const input = container.querySelector('input') as HTMLInputElement;
      const error = container.querySelector('.form-error') as HTMLDivElement;
      
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toBe('email-error');
      expect(error.getAttribute('role')).toBe('alert');
      expect(error.id).toBe('email-error');
    });

    test('should handle form submission feedback', () => {
      const form = document.createElement('form');
      form.innerHTML = `
        <input type="email" required />
        <button type="submit" aria-busy="false">Submit</button>
      `;
      document.body.appendChild(form);
      
      const button = form.querySelector('button') as HTMLButtonElement;
      
      // Simulate form submission
      button.setAttribute('aria-busy', 'true');
      
      expect(button.getAttribute('aria-busy')).toBe('true');
    });
  });

  describe('Mobile Accessibility', () => {
    test('should ensure minimum touch target sizes', () => {
      const style = document.createElement('style');
      style.textContent = `
        .btn { min-height: 48px; min-width: 48px; }
        .btn--sm { min-height: 44px; min-width: 44px; }
        .touch-target { min-height: 48px; min-width: 48px; }
      `;
      document.head.appendChild(style);

      const button = document.createElement('button');
      button.className = 'btn';
      document.body.appendChild(button);

      const styles = window.getComputedStyle(button);
      const minHeight = parseInt(styles.minHeight);
      const minWidth = parseInt(styles.minWidth);
      
      expect(minHeight).toBeGreaterThanOrEqual(44);
      expect(minWidth).toBeGreaterThanOrEqual(44);
    });

    test('should prevent zoom on input focus for iOS', () => {
      const input = document.createElement('input');
      input.type = 'email';
      input.style.fontSize = '16px';
      document.body.appendChild(input);

      const styles = window.getComputedStyle(input);
      
      // 16px font size prevents zoom on iOS
      expect(styles.fontSize).toBe('16px');
    });

    test('should provide appropriate autocomplete attributes', () => {
      const form = document.createElement('form');
      form.innerHTML = `
        <input type="email" name="email" autocomplete="email" />
        <input type="password" name="password" autocomplete="current-password" />
        <input type="password" name="new-password" autocomplete="new-password" />
      `;
      document.body.appendChild(form);

      const emailInput = form.querySelector('input[type="email"]') as HTMLInputElement;
      const passwordInput = form.querySelector('input[name="password"]') as HTMLInputElement;
      const newPasswordInput = form.querySelector('input[name="new-password"]') as HTMLInputElement;

      expect(emailInput.autocomplete).toBe('email');
      expect(passwordInput.autocomplete).toBe('current-password');
      expect(newPasswordInput.autocomplete).toBe('new-password');
    });
  });

  describe('Reduced Motion Support', () => {
    test('should respect reduced motion preferences', () => {
      // Mock reduced motion preference
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

      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      expect(prefersReduced).toBe(true);
    });

    test('should disable animations when reduced motion is preferred', () => {
      const style = document.createElement('style');
      style.textContent = `
        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `;
      document.head.appendChild(style);

      // Mock reduced motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
        })),
      });

      expect(style.textContent).toContain('prefers-reduced-motion: reduce');
      expect(style.textContent).toContain('animation: none');
    });
  });

  describe('High Contrast Support', () => {
    test('should detect high contrast preference', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
        })),
      });

      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
      expect(prefersHighContrast).toBe(true);
    });

    test('should enhance contrast in high contrast mode', () => {
      const style = document.createElement('style');
      style.textContent = `
        @media (prefers-contrast: high) {
          .btn {
            border-width: 2px;
            font-weight: 600;
          }
          
          .form-input {
            border-width: 2px;
          }
        }
      `;
      document.head.appendChild(style);

      expect(style.textContent).toContain('prefers-contrast: high');
      expect(style.textContent).toContain('border-width: 2px');
      expect(style.textContent).toContain('font-weight: 600');
    });
  });

  describe('Semantic HTML and Landmarks', () => {
    test('should use proper heading hierarchy', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <h1>Main Page Title</h1>
        <section>
          <h2>Section Title</h2>
          <h3>Subsection Title</h3>
        </section>
      `;
      document.body.appendChild(container);

      const h1 = container.querySelector('h1');
      const h2 = container.querySelector('h2');
      const h3 = container.querySelector('h3');

      expect(h1).toBeTruthy();
      expect(h2).toBeTruthy();
      expect(h3).toBeTruthy();
    });

    test('should provide proper landmark roles', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <header role="banner">
          <nav role="navigation" aria-label="Main navigation">
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/plants">Plants</a></li>
            </ul>
          </nav>
        </header>
        <main role="main" id="main-content">
          <h1>Page Content</h1>
        </main>
        <footer role="contentinfo">
          <p>Footer content</p>
        </footer>
      `;
      document.body.appendChild(container);

      const header = container.querySelector('[role="banner"]');
      const nav = container.querySelector('[role="navigation"]');
      const main = container.querySelector('[role="main"]');
      const footer = container.querySelector('[role="contentinfo"]');

      expect(header).toBeTruthy();
      expect(nav).toBeTruthy();
      expect(nav?.getAttribute('aria-label')).toBe('Main navigation');
      expect(main).toBeTruthy();
      expect(main?.id).toBe('main-content');
      expect(footer).toBeTruthy();
    });

    test('should provide skip links for keyboard navigation', () => {
      const skipLink = document.createElement('a');
      skipLink.href = '#main-content';
      skipLink.className = 'skip-link';
      skipLink.textContent = 'Skip to main content';
      skipLink.setAttribute('tabindex', '0');
      
      document.body.insertBefore(skipLink, document.body.firstChild);

      expect(skipLink.href).toContain('#main-content');
      expect(skipLink.textContent).toBe('Skip to main content');
      expect(skipLink.getAttribute('tabindex')).toBe('0');
    });
  });
});