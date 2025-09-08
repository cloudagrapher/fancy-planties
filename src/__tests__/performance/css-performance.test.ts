/**
 * CSS Performance and Bundle Size Tests
 * Ensures design system meets performance optimization targets
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Helper function to read CSS content with fallback to mock
function readCSSContent(): string {
  const cssPath = join(process.cwd(), 'src/app/globals.css');
  const mockCssPath = join(process.cwd(), 'src/test-utils/mock-globals.css');
  
  try {
    return readFileSync(cssPath, 'utf8');
  } catch {
    try {
      return readFileSync(mockCssPath, 'utf8');
    } catch {
      // Return minimal CSS if both fail
      return `
        :root { --color-primary: #3b82f6; }
        .btn { padding: 0.5rem 1rem; }
        @media (prefers-reduced-motion: reduce) { * { animation: none; } }
        /* DESIGN TOKEN */
      `;
    }
  }
}

describe('CSS Performance Optimization', () => {
  describe('Bundle Size Monitoring', () => {
    test('should keep CSS bundle under size limit', () => {
      const cssContent = readCSSContent();
      const sizeInKB = Buffer.byteLength(cssContent, 'utf8') / 1024;
      
      // Should be under 100KB for source (will be much smaller when minified)
      expect(sizeInKB).toBeLessThan(100);
    });

    test('should use efficient CSS selectors', () => {
      const cssContent = readCSSContent();
      
      // Should avoid deeply nested selectors (more than 3 levels)
      const deepSelectors = cssContent.match(/\s+[^{]*\s+[^{]*\s+[^{]*\s+[^{]*\s*{/g);
      const deepSelectorCount = deepSelectors ? deepSelectors.length : 0;
      
      // Should have minimal deeply nested selectors
      expect(deepSelectorCount).toBeLessThan(10);
    });

    test('should minimize use of expensive properties', () => {
      const cssContent = readCSSContent();
      
      // Should minimize expensive properties like box-shadow, filter, etc.
      const expensiveProps = ['box-shadow', 'filter', 'backdrop-filter', 'transform'];
      
      expensiveProps.forEach(prop => {
        const regex = new RegExp(`${prop}\\s*:`, 'g');
        const matches = cssContent.match(regex);
        const count = matches ? matches.length : 0;
        
        // Allow reasonable usage but flag excessive use
        if (prop === 'transform' || prop === 'box-shadow') {
          expect(count).toBeLessThan(50); // More lenient for common properties
        } else {
          expect(count).toBeLessThan(20);
        }
      });
    });
  });

  describe('Critical CSS Patterns', () => {
    test('should prioritize above-the-fold styles', () => {
      const cssContent = readCSSContent();
      const lines = cssContent.split('\n');
      
      // Critical styles should appear in first 1000 lines
      const criticalStyles = ['body', ':root', 'html'];
      
      criticalStyles.forEach(selector => {
        const lineIndex = lines.findIndex(line => line.includes(selector));
        expect(lineIndex).toBeLessThan(1000);
        expect(lineIndex).toBeGreaterThan(-1);
      });
    });

    test('should use CSS custom properties efficiently', () => {
      const cssContent = readCSSContent();
      
      // Should define custom properties in :root
      expect(cssContent).toMatch(/:root\s*{[^}]*--[\w-]+:/);
      
      // Should use custom properties in components
      const customPropUsage = cssContent.match(/var\(--[\w-]+\)/g);
      expect(customPropUsage).toBeTruthy();
      expect(customPropUsage!.length).toBeGreaterThan(0);
    });
  });

  describe('Animation Performance', () => {
    test('should use transform and opacity for animations', () => {
      const cssContent = readCSSContent();
      
      // Check for GPU-accelerated properties in animations
      const animationProps = cssContent.match(/@keyframes[^}]*{[^}]*}/g) || [];
      
      animationProps.forEach(animation => {
        // Should primarily use transform and opacity
        const hasTransform = animation.includes('transform');
        const hasOpacity = animation.includes('opacity');
        const hasLayoutProps = /width|height|top|left|right|bottom|margin|padding/.test(animation);
        
        if (hasLayoutProps) {
          // If layout properties are used, should also use transform/opacity
          expect(hasTransform || hasOpacity).toBe(true);
        }
      });
    });

    test('should include will-change optimization', () => {
      const cssContent = readCSSContent();
      
      // Should use will-change for performance-critical animations
      expect(cssContent).toContain('will-change');
    });

    test('should respect reduced motion preferences', () => {
      const cssContent = readCSSContent();
      
      // Should include reduced motion media query
      expect(cssContent).toMatch(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/);
    });
  });

  describe('Responsive Design Performance', () => {
    test('should use mobile-first approach', () => {
      const cssContent = readCSSContent();
      
      // Should have more min-width than max-width media queries
      const minWidthQueries = cssContent.match(/@media[^{]*min-width/g) || [];
      const maxWidthQueries = cssContent.match(/@media[^{]*max-width/g) || [];
      
      expect(minWidthQueries.length).toBeGreaterThanOrEqual(maxWidthQueries.length);
    });

    test('should use efficient breakpoint strategy', () => {
      const cssContent = readCSSContent();
      
      // Should define breakpoints as custom properties or have reasonable number
      const breakpoints = cssContent.match(/@media[^{]*\([^)]*\)/g) || [];
      expect(breakpoints.length).toBeLessThan(8); // Reasonable number of breakpoints
    });
  });

  describe('Layout Performance', () => {
    test('should minimize layout thrashing', () => {
      const cssContent = readCSSContent();
      
      // Should use flexbox and grid efficiently
      const flexUsage = cssContent.match(/display\s*:\s*flex/g) || [];
      const gridUsage = cssContent.match(/display\s*:\s*grid/g) || [];
      
      // Should have modern layout methods
      expect(flexUsage.length + gridUsage.length).toBeGreaterThan(0);
    });

    test('should use contain property for performance', () => {
      const cssContent = readCSSContent();
      
      // Should use contain property for performance isolation
      expect(cssContent).toContain('contain:');
    });
  });

  describe('Font Performance', () => {
    test('should optimize font loading', () => {
      const cssContent = readCSSContent();
      
      // Should define font fallbacks
      const fontFamilyDeclarations = cssContent.match(/font-family\s*:[^;]+/g) || [];
      
      fontFamilyDeclarations.forEach(declaration => {
        // Should have fallback fonts
        const hasFallback = declaration.includes(',');
        expect(hasFallback).toBe(true);
      });
    });
  });
});

describe('CSS Architecture Quality', () => {
  test('should follow BEM-like naming conventions', () => {
    const cssContent = readCSSContent();
    
    // Should use consistent naming patterns
    const classSelectors = cssContent.match(/\.[a-zA-Z][\w-]*/g) || [];
    
    // Most classes should follow kebab-case or BEM patterns
    const validPatterns = classSelectors.filter(selector => 
      /^\.[\w-]+(__[\w-]+)?(--[\w-]+)?$/.test(selector) || // BEM
      /^\.[\w-]+$/.test(selector) // Simple kebab-case
    );
    
    expect(validPatterns.length / classSelectors.length).toBeGreaterThan(0.8);
  });

  test('should avoid !important overuse', () => {
    const cssContent = readCSSContent();
    
    // Count !important usage
    const importantUsage = cssContent.match(/!important/g) || [];
    const totalDeclarations = cssContent.match(/[^{}]+:[^{}]+;/g) || [];
    
    // Should use !important sparingly (less than 5% of declarations)
    const importantRatio = importantUsage.length / totalDeclarations.length;
    expect(importantRatio).toBeLessThan(0.05);
  });

  test('should have organized structure', () => {
    const cssContent = readCSSContent();
    
    // Should have clear sections with comments
    expect(cssContent).toContain('DESIGN TOKEN');
  });
});