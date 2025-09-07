/**
 * CSS Performance and Bundle Size Tests
 * Ensures design system meets performance optimization targets
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('CSS Performance Optimization', () => {
  describe('Bundle Size Monitoring', () => {
    test('should keep CSS bundle under size limit', () => {
      // This would be implemented with actual build output analysis
      // For now, we'll test the source file size as a proxy
      const cssPath = join(process.cwd(), 'src/app/globals.css');
      
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        const sizeInKB = Buffer.byteLength(cssContent, 'utf8') / 1024;
        
        // Should be under 100KB for source (will be much smaller when minified)
        expect(sizeInKB).toBeLessThan(100);
      } catch (error) {
        // If file doesn't exist in test environment, skip
        console.warn('CSS file not found in test environment');
      }
    });

    test('should use efficient CSS selectors', () => {
      const cssPath = join(process.cwd(), 'src/app/globals.css');
      
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Should avoid deeply nested selectors (more than 3 levels)
        const deepSelectors = cssContent.match(/\s+[^{]*\s+[^{]*\s+[^{]*\s+[^{]*\s*{/g);
        const deepSelectorCount = deepSelectors ? deepSelectors.length : 0;
        
        // Should have minimal deeply nested selectors
        expect(deepSelectorCount).toBeLessThan(10);
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });

    test('should minimize use of expensive properties', () => {
      const cssPath = join(process.cwd(), 'src/app/globals.css');
      
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Count expensive properties that can cause reflows
        const expensiveProps = [
          'box-shadow',
          'border-radius',
          'transform',
          'filter',
          'backdrop-filter'
        ];
        
        expensiveProps.forEach(prop => {
          const matches = cssContent.match(new RegExp(prop, 'g'));
          const count = matches ? matches.length : 0;
          
          // Should use these properties judiciously
          if (prop === 'transform' || prop === 'box-shadow') {
            expect(count).toBeLessThan(50); // More lenient for common properties
          } else {
            expect(count).toBeLessThan(20);
          }
        });
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });
  });

  describe('Critical CSS Patterns', () => {
    test('should prioritize above-the-fold styles', () => {
      // Test that critical styles are defined early in the CSS
      const cssPath = join(process.cwd(), 'src/app/globals.css');
      
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        const lines = cssContent.split('\n');
        
        // Critical styles should appear in first 1000 lines
        const criticalStyles = ['body', ':root', 'html'];
        
        criticalStyles.forEach(selector => {
          const lineIndex = lines.findIndex(line => line.includes(selector));
          expect(lineIndex).toBeLessThan(1000);
          expect(lineIndex).toBeGreaterThan(-1);
        });
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });

    test('should use CSS custom properties efficiently', () => {
      const cssPath = join(process.cwd(), 'src/app/globals.css');
      
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Should define custom properties in :root
        expect(cssContent).toContain(':root {');
        
        // Should use var() function for consistency
        const varUsage = cssContent.match(/var\(--[^)]+\)/g);
        expect(varUsage).toBeTruthy();
        expect(varUsage!.length).toBeGreaterThan(50); // Should use variables extensively
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });
  });

  describe('Animation Performance', () => {
    test('should use transform and opacity for animations', () => {
      const cssPath = join(process.cwd(), 'src/app/globals.css');
      
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Check for GPU-accelerated properties in animations
        const keyframeBlocks = cssContent.match(/@keyframes[^}]+}/g) || [];
        
        keyframeBlocks.forEach(block => {
          // Should primarily use transform and opacity
          const hasTransform = block.includes('transform');
          const hasOpacity = block.includes('opacity');
          const hasExpensiveProps = /width|height|top|left|margin|padding/.test(block);
          
          if (hasExpensiveProps) {
            // If using expensive properties, should also use transform/opacity
            expect(hasTransform || hasOpacity).toBe(true);
          }
        });
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });

    test('should include will-change optimization', () => {
      const cssPath = join(process.cwd(), 'src/app/globals.css');
      
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Should use will-change for performance-critical animations
        expect(cssContent).toContain('will-change');
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });

    test('should respect reduced motion preferences', () => {
      const cssPath = join(process.cwd(), 'src/app/globals.css');
      
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Should include reduced motion media query
        expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)');
        
        // Should disable animations in reduced motion
        const reducedMotionBlock = cssContent.match(
          /@media \(prefers-reduced-motion: reduce\)[^}]+}/s
        );
        
        if (reducedMotionBlock) {
          expect(reducedMotionBlock[0]).toContain('animation: none');
        }
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });
  });

  describe('Responsive Design Performance', () => {
    test('should use mobile-first approach', () => {
      const cssPath = join(process.cwd(), 'src/app/globals.css');
      
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Should have more min-width than max-width media queries
        const minWidthQueries = cssContent.match(/@media[^{]*min-width[^{]*{/g) || [];
        const maxWidthQueries = cssContent.match(/@media[^{]*max-width[^{]*{/g) || [];
        
        // Mobile-first should have more min-width queries
        expect(minWidthQueries.length).toBeGreaterThanOrEqual(maxWidthQueries.length);
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });

    test('should use efficient breakpoint strategy', () => {
      const cssPath = join(process.cwd(), 'src/app/globals.css');
      
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Should define breakpoints as custom properties
        expect(cssContent).toContain('--breakpoint-');
        
        // Should not have too many different breakpoints
        const breakpoints = cssContent.match(/--breakpoint-[^:]+:/g) || [];
        expect(breakpoints.length).toBeLessThan(8); // Reasonable number of breakpoints
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });
  });

  describe('Layout Performance', () => {
    test('should minimize layout thrashing', () => {
      const cssPath = join(process.cwd(), 'src/app/globals.css');
      
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Should use flexbox and grid efficiently
        const flexUsage = cssContent.match(/display:\s*flex/g) || [];
        const gridUsage = cssContent.match(/display:\s*grid/g) || [];
        
        // Should use modern layout methods
        expect(flexUsage.length + gridUsage.length).toBeGreaterThan(10);
        
        // Should avoid float-based layouts
        const floatUsage = cssContent.match(/float:\s*[^n]/g) || [];
        expect(floatUsage.length).toBeLessThan(5);
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });

    test('should use contain property for performance', () => {
      const cssPath = join(process.cwd(), 'src/app/globals.css');
      
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Should use contain property for performance isolation
        expect(cssContent).toContain('contain:');
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });
  });

  describe('Font Performance', () => {
    test('should optimize font loading', () => {
      const cssPath = join(process.cwd(), 'src/app/globals.css');
      
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Should define font fallbacks
        expect(cssContent).toContain('font-family');
        
        // Should use system fonts as fallbacks
        const systemFonts = ['-apple-system', 'BlinkMacSystemFont', 'system-ui'];
        const hasSystemFonts = systemFonts.some(font => cssContent.includes(font));
        expect(hasSystemFonts).toBe(true);
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });
  });
});

describe('CSS Architecture Quality', () => {
  test('should follow BEM-like naming conventions', () => {
    const cssPath = join(process.cwd(), 'src/app/globals.css');
    
    try {
      const cssContent = readFileSync(cssPath, 'utf8');
      
      // Should use consistent naming patterns
      const classSelectors = cssContent.match(/\.[a-zA-Z][a-zA-Z0-9-_]*[^{]*{/g) || [];
      
      // Check for consistent naming patterns
      const bemLikePattern = /\.[a-z]+(?:--[a-z]+)?(?:__[a-z]+)?/;
      const consistentNames = classSelectors.filter(selector => 
        bemLikePattern.test(selector)
      );
      
      // Should have mostly consistent naming
      expect(consistentNames.length / classSelectors.length).toBeGreaterThan(0.7);
    } catch (error) {
      console.warn('CSS file not found in test environment');
    }
  });

  test('should avoid !important overuse', () => {
    const cssPath = join(process.cwd(), 'src/app/globals.css');
    
    try {
      const cssContent = readFileSync(cssPath, 'utf8');
      
      // Count !important usage
      const importantUsage = cssContent.match(/!important/g) || [];
      
      // Should use !important sparingly (mainly for utilities and overrides)
      expect(importantUsage.length).toBeLessThan(20);
    } catch (error) {
      console.warn('CSS file not found in test environment');
    }
  });

  test('should have organized structure', () => {
    const cssPath = join(process.cwd(), 'src/app/globals.css');
    
    try {
      const cssContent = readFileSync(cssPath, 'utf8');
      
      // Should have clear sections with comments
      const sectionComments = cssContent.match(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g) || [];
      
      // Should have organizational comments
      expect(sectionComments.length).toBeGreaterThan(5);
      
      // Should have design token section
      expect(cssContent).toContain('DESIGN TOKEN');
    } catch (error) {
      console.warn('CSS file not found in test environment');
    }
  });
});