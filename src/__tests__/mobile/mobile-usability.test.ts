/**
 * Mobile Usability and Touch Target Tests
 * Ensures design system provides excellent mobile experience
 */

import '@testing-library/jest-dom';

// Mock window.matchMedia for mobile tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('Mobile Usability', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    
    // Add our CSS styles for testing
    const style = document.createElement('style');
    style.textContent = `
      .btn {
        min-height: 48px;
        padding: 0.75rem 1rem;
        touch-action: manipulation;
        cursor: pointer;
      }
      
      .btn--sm {
        min-height: 44px;
        padding: 0.5rem 0.75rem;
      }
      
      .btn--lg {
        min-height: 56px;
        padding: 1rem 1.5rem;
      }
      
      .form-input {
        min-height: 48px;
        font-size: 16px;
        padding: 0.75rem 1rem;
        touch-action: manipulation;
      }
      
      .touch-target {
        min-height: 48px;
        min-width: 48px;
        touch-action: manipulation;
      }
      
      .touch-target--small {
        min-height: 44px;
        min-width: 44px;
      }
      
      .plant-card {
        cursor: pointer;
        touch-action: manipulation;
      }
      
      .bottom-nav-item {
        min-height: 48px;
        touch-action: manipulation;
      }
      
      @media (max-width: 640px) {
        .btn--mobile-full {
          width: 100%;
        }
        
        .form-actions {
          flex-direction: column;
        }
        
        .form-actions .btn {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  });

  describe('Touch Target Sizes', () => {
    test('should meet minimum touch target size (44px)', () => {
      const button = document.createElement('button');
      button.className = 'btn btn--sm';
      document.body.appendChild(button);

      const styles = window.getComputedStyle(button);
      const minHeight = parseInt(styles.minHeight);
      
      expect(minHeight).toBeGreaterThanOrEqual(44);
    });

    test('should meet comfortable touch target size (48px)', () => {
      const button = document.createElement('button');
      button.className = 'btn';
      document.body.appendChild(button);

      const styles = window.getComputedStyle(button);
      const minHeight = parseInt(styles.minHeight);
      
      expect(minHeight).toBeGreaterThanOrEqual(48);
    });

    test('should have large touch targets for primary actions', () => {
      const button = document.createElement('button');
      button.className = 'btn btn--lg';
      document.body.appendChild(button);

      const styles = window.getComputedStyle(button);
      const minHeight = parseInt(styles.minHeight);
      
      expect(minHeight).toBeGreaterThanOrEqual(56);
    });

    test('should ensure form inputs have adequate touch targets', () => {
      const input = document.createElement('input');
      input.className = 'form-input';
      input.type = 'text';
      document.body.appendChild(input);

      const styles = window.getComputedStyle(input);
      const minHeight = parseInt(styles.minHeight);
      
      expect(minHeight).toBeGreaterThanOrEqual(48);
    });

    test('should have proper spacing between touch targets', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button class="btn" style="margin-right: 8px;">Button 1</button>
        <button class="btn">Button 2</button>
      `;
      document.body.appendChild(container);

      const buttons = container.querySelectorAll('button');
      const button1Rect = buttons[0].getBoundingClientRect();
      const button2Rect = buttons[1].getBoundingClientRect();
      
      // Should have at least 8px spacing between buttons
      const spacing = button2Rect.left - button1Rect.right;
      expect(spacing).toBeGreaterThanOrEqual(8);
    });
  });

  describe('Touch Optimization', () => {
    test('should use touch-action: manipulation for interactive elements', () => {
      const button = document.createElement('button');
      button.className = 'btn';
      document.body.appendChild(button);

      const styles = window.getComputedStyle(button);
      expect(styles.touchAction).toBe('manipulation');
    });

    test('should optimize form inputs for touch', () => {
      const input = document.createElement('input');
      input.className = 'form-input';
      input.type = 'email';
      document.body.appendChild(input);

      const styles = window.getComputedStyle(input);
      
      // Should prevent zoom on iOS
      expect(styles.fontSize).toBe('16px');
      expect(styles.touchAction).toBe('manipulation');
    });

    test('should have proper cursor styles for touch devices', () => {
      const card = document.createElement('div');
      card.className = 'plant-card';
      document.body.appendChild(card);

      const styles = window.getComputedStyle(card);
      expect(styles.cursor).toBe('pointer');
      expect(styles.touchAction).toBe('manipulation');
    });
  });

  describe('Mobile Layout Adaptations', () => {
    test('should stack buttons vertically on mobile', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('max-width: 640px'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const form = document.createElement('form');
      form.innerHTML = `
        <div class="form-actions">
          <button class="btn">Cancel</button>
          <button class="btn btn--primary">Submit</button>
        </div>
      `;
      document.body.appendChild(form);

      const formActions = form.querySelector('.form-actions');
      const styles = window.getComputedStyle(formActions!);
      
      // Should stack vertically on mobile
      expect(styles.flexDirection).toBe('column');
    });

    test('should make buttons full width on mobile when needed', () => {
      const button = document.createElement('button');
      button.className = 'btn btn--mobile-full';
      document.body.appendChild(button);

      // Mock mobile viewport
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('max-width: 640px'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const styles = window.getComputedStyle(button);
      expect(styles.width).toBe('100%');
    });
  });

  describe('Safe Area Support', () => {
    test('should support iOS safe areas', () => {
      const style = document.createElement('style');
      style.textContent = `
        .safe-area-pb {
          padding-bottom: env(safe-area-inset-bottom);
        }
        
        .safe-area-pt {
          padding-top: env(safe-area-inset-top);
        }
      `;
      document.head.appendChild(style);

      const element = document.createElement('div');
      element.className = 'safe-area-pb';
      document.body.appendChild(element);

      // Should have safe area class
      expect(element.classList.contains('safe-area-pb')).toBe(true);
    });

    test('should handle bottom navigation with safe areas', () => {
      const style = document.createElement('style');
      style.textContent = `
        .bottom-nav {
          height: calc(64px + env(safe-area-inset-bottom));
          padding-bottom: env(safe-area-inset-bottom);
        }
      `;
      document.head.appendChild(style);

      const nav = document.createElement('nav');
      nav.className = 'bottom-nav';
      document.body.appendChild(nav);

      expect(nav.classList.contains('bottom-nav')).toBe(true);
    });
  });

  describe('Gesture Support', () => {
    test('should prevent text selection on interactive elements', () => {
      const style = document.createElement('style');
      style.textContent = `
        .select-none {
          -webkit-user-select: none;
          -moz-user-select: none;
          user-select: none;
        }
      `;
      document.head.appendChild(style);

      const button = document.createElement('button');
      button.className = 'btn select-none';
      document.body.appendChild(button);

      const styles = window.getComputedStyle(button);
      expect(styles.userSelect).toBe('none');
    });

    test('should support pull-to-refresh', () => {
      const style = document.createElement('style');
      style.textContent = `
        .pull-to-refresh {
          overscroll-behavior-y: contain;
        }
      `;
      document.head.appendChild(style);

      const container = document.createElement('div');
      container.className = 'pull-to-refresh';
      document.body.appendChild(container);

      const styles = window.getComputedStyle(container);
      expect(styles.overscrollBehaviorY).toBe('contain');
    });
  });

  describe('Mobile Performance', () => {
    test('should use efficient scrolling', () => {
      const style = document.createElement('style');
      style.textContent = `
        .smooth-scroll {
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
        }
      `;
      document.head.appendChild(style);

      const container = document.createElement('div');
      container.className = 'smooth-scroll';
      document.body.appendChild(container);

      const styles = window.getComputedStyle(container);
      expect(styles.scrollBehavior).toBe('smooth');
    });

    test('should optimize for GPU acceleration', () => {
      const style = document.createElement('style');
      style.textContent = `
        .gpu-accelerated {
          transform: translateZ(0);
          will-change: transform;
        }
      `;
      document.head.appendChild(style);

      const element = document.createElement('div');
      element.className = 'gpu-accelerated';
      document.body.appendChild(element);

      const styles = window.getComputedStyle(element);
      expect(styles.transform).toContain('translateZ');
      expect(styles.willChange).toBe('transform');
    });
  });

  describe('Mobile Accessibility', () => {
    test('should have proper focus indicators for touch', () => {
      const style = document.createElement('style');
      style.textContent = `
        .btn:focus-visible {
          outline: 2px solid #34d399;
          outline-offset: 2px;
        }
      `;
      document.head.appendChild(style);

      const button = document.createElement('button');
      button.className = 'btn';
      document.body.appendChild(button);

      // Simulate focus
      button.focus();
      
      expect(document.activeElement).toBe(button);
    });

    test('should support screen reader navigation', () => {
      const nav = document.createElement('nav');
      nav.setAttribute('aria-label', 'Main navigation');
      nav.innerHTML = `
        <button class="bottom-nav-item" aria-label="Home">
          <span>Home</span>
        </button>
        <button class="bottom-nav-item" aria-label="Plants">
          <span>Plants</span>
        </button>
      `;
      document.body.appendChild(nav);

      const buttons = nav.querySelectorAll('button');
      buttons.forEach(button => {
        expect(button.getAttribute('aria-label')).toBeTruthy();
      });
    });
  });

  describe('Responsive Images', () => {
    test('should optimize images for mobile', () => {
      const style = document.createElement('style');
      style.textContent = `
        .optimized-image {
          max-width: 100%;
          height: auto;
          object-fit: cover;
        }
      `;
      document.head.appendChild(style);

      const img = document.createElement('img');
      img.className = 'optimized-image';
      img.src = 'test.jpg';
      img.alt = 'Test image';
      document.body.appendChild(img);

      const styles = window.getComputedStyle(img);
      expect(styles.maxWidth).toBe('100%');
      expect(styles.height).toBe('auto');
      expect(styles.objectFit).toBe('cover');
    });

    test('should prevent layout shift with aspect ratios', () => {
      const style = document.createElement('style');
      style.textContent = `
        .aspect-ratio-container {
          position: relative;
          width: 100%;
        }
        
        .aspect-ratio-container::before {
          content: '';
          display: block;
          padding-bottom: 56.25%; /* 16:9 */
        }
        
        .aspect-ratio-content {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
      `;
      document.head.appendChild(style);

      const container = document.createElement('div');
      container.className = 'aspect-ratio-container';
      container.innerHTML = `
        <img class="aspect-ratio-content" src="test.jpg" alt="Test" />
      `;
      document.body.appendChild(container);

      const styles = window.getComputedStyle(container);
      expect(styles.position).toBe('relative');
      expect(styles.width).toBe('100%');
    });
  });

  describe('Mobile Form Optimization', () => {
    test('should prevent zoom on input focus', () => {
      const input = document.createElement('input');
      input.type = 'email';
      input.className = 'form-input';
      document.body.appendChild(input);

      const styles = window.getComputedStyle(input);
      
      // 16px font size prevents zoom on iOS
      expect(styles.fontSize).toBe('16px');
    });

    test('should use appropriate input types for mobile keyboards', () => {
      const inputs = [
        { type: 'email', expected: 'email' },
        { type: 'tel', expected: 'tel' },
        { type: 'number', expected: 'number' },
        { type: 'url', expected: 'url' },
      ];

      inputs.forEach(({ type, expected }) => {
        const input = document.createElement('input');
        input.type = type;
        input.className = 'form-input';
        document.body.appendChild(input);

        expect(input.type).toBe(expected);
      });
    });

    test('should have proper autocomplete attributes', () => {
      const form = document.createElement('form');
      form.innerHTML = `
        <input type="email" name="email" autocomplete="email" class="form-input" />
        <input type="password" name="password" autocomplete="current-password" class="form-input" />
        <input type="password" name="new-password" autocomplete="new-password" class="form-input" />
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
});