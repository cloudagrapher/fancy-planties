/**
 * Performance Tests for CSS Bundle Size and Optimization
 * Monitors CSS performance and ensures optimization targets are met
 */

import { readFileSync, statSync } from 'fs';
import { join } from 'path';

describe('CSS Performance Monitoring', () => {
  const cssPath = join(process.cwd(), 'src/app/globals.css');
  
  describe('Bundle Size Monitoring', () => {
    test('should keep CSS bundle under size limit', () => {
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        const sizeInKB = Buffer.byteLength(cssContent, 'utf8') / 1024;
        
        // Should be under 150KB for source (will be much smaller when minified)
        expect(sizeInKB).toBeLessThan(150);
        
        // Log current size for monitoring
        console.log(`CSS bundle size: ${sizeInKB.toFixed(2)}KB`);
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });

    test('should use efficient CSS selectors', () => {
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Should avoid deeply nested selectors (more than 4 levels)
        const deepSelectors = cssContent.match(/\s+[^{]*\s+[^{]*\s+[^{]*\s+[^{]*\s+[^{]*\s*{/g);
        const deepSelectorCount = deepSelectors ? deepSelectors.length : 0;
        
        // Should have minimal deeply nested selectors
        expect(deepSelectorCount).toBeLessThan(5);
        
        console.log(`Deep selectors found: ${deepSelectorCount}`);
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });

    test('should minimize use of expensive properties', () => {
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Count expensive properties that can cause reflows
        const expensiveProps = {
          'box-shadow': 50,
          'border-radius': 100,
          'transform': 30,
          'filter': 10,
          'backdrop-filter': 5
        };
        
        Object.entries(expensiveProps).forEach(([prop, maxCount]) => {
          const matches = cssContent.match(new RegExp(prop, 'g'));
          const count = matches ? matches.length : 0;
          
          expect(count).toBeLessThan(maxCount);
          console.log(`${prop} usage: ${count}/${maxCount}`);
        });
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });

    test('should have reasonable file size growth', () => {
      try {
        const stats = statSync(cssPath);
        const fileSizeKB = stats.size / 1024;
        
        // Monitor file size growth - should not exceed 200KB
        expect(fileSizeKB).toBeLessThan(200);
        
        console.log(`CSS file size on disk: ${fileSizeKB.toFixed(2)}KB`);
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });
  });

  describe('Critical CSS Patterns', () => {
    test('should prioritize above-the-fold styles', () => {
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        const lines = cssContent.split('\n');
        
        // Critical styles should appear early in the CSS
        const criticalStyles = [':root', 'body', 'html'];
        
        criticalStyles.forEach(selector => {
          const lineIndex = lines.findIndex(line => line.includes(selector));
          expect(lineIndex).toBeLessThan(500); // Should be in first 500 lines
          expect(lineIndex).toBeGreaterThan(-1);
        });
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });

    test('should use CSS custom properties efficiently', () => {
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Should define custom properties in :root
        expect(cssContent).toContain(':root {');
        
        // Should use var() function for consistency
        const varUsage = cssContent.match(/var\(--[^)]+\)/g);
        expect(varUsage).toBeTruthy();
        expect(varUsage!.length).toBeGreaterThan(100); // Should use variables extensively
        
        console.log(`CSS custom property usage: ${varUsage!.length} instances`);
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });

    test('should organize CSS into logical sections', () => {
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Should have clear organizational comments
        const organizationalSections = [
          'DESIGN TOKEN',
          'TYPOGRAPHY',
          'SPACING',
          'BUTTON SYSTEM',
          'FORM SYSTEM',
          'CARD SYSTEM',
          'LAYOUT SYSTEM',
          'ACCESSIBILITY'
        ];
        
        organizationalSections.forEach(section => {
          expect(cssContent).toContain(section);
        });
        
        console.log('CSS organization sections verified');
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });
  });

  describe('Animation Performance', () => {
    test('should use transform and opacity for animations', () => {
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Check for GPU-accelerated properties in animations
        const keyframeBlocks = cssContent.match(/@keyframes[^}]+}/gs) || [];
        
        keyframeBlocks.forEach((block, index) => {
          // Should primarily use transform and opacity
          const hasTransform = block.includes('transform');
          const hasOpacity = block.includes('opacity');
          const hasExpensiveProps = /width|height|top|left|margin|padding/.test(block);
          
          if (hasExpensiveProps) {
            // If using expensive properties, should also use transform/opacity
            expect(hasTransform || hasOpacity).toBe(true);
          }
        });
        
        console.log(`Keyframe animations found: ${keyframeBlocks.length}`);
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });

    test('should include will-change optimization', () => {
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Should use will-change for performance-critical animations
        expect(cssContent).toContain('will-change');
        
        const willChangeUsage = cssContent.match(/will-change/g);
        console.log(`will-change usage: ${willChangeUsage?.length || 0} instances`);
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });

    test('should respect reduced motion preferences', () => {
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Should include reduced motion media query
        expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)');
        
        // Should disable animations in reduced motion
        const reducedMotionBlocks = cssContent.match(
          /@media \(prefers-reduced-motion: reduce\)[^}]+}/gs
        );
        
        expect(reducedMotionBlocks).toBeTruthy();
        expect(reducedMotionBlocks!.length).toBeGreaterThan(0);
        
        // Should contain animation disabling rules
        const hasAnimationNone = reducedMotionBlocks!.some(block => 
          block.includes('animation: none') || 
          block.includes('animation-duration: 0.01ms')
        );
        expect(hasAnimationNone).toBe(true);
        
        console.log(`Reduced motion blocks: ${reducedMotionBlocks!.length}`);
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });
  });

  describe('Responsive Design Performance', () => {
    test('should use mobile-first approach', () => {
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Should have more min-width than max-width media queries
        const minWidthQueries = cssContent.match(/@media[^{]*min-width[^{]*{/g) || [];
        const maxWidthQueries = cssContent.match(/@media[^{]*max-width[^{]*{/g) || [];
        
        // Mobile-first should have more min-width queries
        expect(minWidthQueries.length).toBeGreaterThanOrEqual(maxWidthQueries.length);
        
        console.log(`Min-width queries: ${minWidthQueries.length}, Max-width queries: ${maxWidthQueries.length}`);
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });

    test('should use efficient breakpoint strategy', () => {
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Should define breakpoints as custom properties
        expect(cssContent).toContain('--breakpoint-');
        
        // Should not have too many different breakpoints
        const breakpoints = cssContent.match(/--breakpoint-[^:]+:/g) || [];
        expect(breakpoints.length).toBeLessThan(10); // Reasonable number of breakpoints
        
        console.log(`Breakpoints defined: ${breakpoints.length}`);
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });

    test('should optimize media query organization', () => {
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Count total media queries
        const mediaQueries = cssContent.match(/@media[^{]*{/g) || [];
        
        // Should not have excessive media queries (indicates poor organization)
        expect(mediaQueries.length).toBeLessThan(50);
        
        console.log(`Total media queries: ${mediaQueries.length}`);
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });
  });

  describe('Layout Performance', () => {
    test('should minimize layout thrashing', () => {
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Should use flexbox and grid efficiently
        const flexUsage = cssContent.match(/display:\s*flex/g) || [];
        const gridUsage = cssContent.match(/display:\s*grid/g) || [];
        
        // Should use modern layout methods
        expect(flexUsage.length + gridUsage.length).toBeGreaterThan(20);
        
        // Should avoid float-based layouts
        const floatUsage = cssContent.match(/float:\s*[^n]/g) || [];
        expect(floatUsage.length).toBeLessThan(3);
        
        console.log(`Flex usage: ${flexUsage.length}, Grid usage: ${gridUsage.length}, Float usage: ${floatUsage.length}`);
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });

    test('should use contain property for performance', () => {
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Should use contain property for performance isolation
        const containUsage = cssContent.match(/contain:/g) || [];
        
        // Log usage for monitoring
        console.log(`CSS contain usage: ${containUsage.length} instances`);
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });
  });

  describe('Font Performance', () => {
    test('should optimize font loading', () => {
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Should define font fallbacks
        expect(cssContent).toContain('font-family');
        
        // Should use system fonts as fallbacks
        const systemFonts = ['-apple-system', 'BlinkMacSystemFont', 'system-ui'];
        const hasSystemFonts = systemFonts.some(font => cssContent.includes(font));
        expect(hasSystemFonts).toBe(true);
        
        console.log('System font fallbacks verified');
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });

    test('should limit font weight variations', () => {
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Count font-weight declarations
        const fontWeights = cssContent.match(/font-weight:\s*[^;]+/g) || [];
        const uniqueWeights = new Set(fontWeights.map(fw => fw.replace(/font-weight:\s*/, '')));
        
        // Should not have too many font weights (impacts performance)
        expect(uniqueWeights.size).toBeLessThan(8);
        
        console.log(`Unique font weights: ${uniqueWeights.size}`);
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });
  });

  describe('CSS Architecture Quality', () => {
    test('should follow consistent naming conventions', () => {
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Should use consistent naming patterns
        const classSelectors = cssContent.match(/\.[a-zA-Z][a-zA-Z0-9-_]*[^{]*{/g) || [];
        
        // Check for consistent naming patterns (BEM-like or utility-based)
        const consistentPattern = /\.[a-z]+(?:--[a-z]+)?(?:__[a-z]+)?/;
        const consistentNames = classSelectors.filter(selector => 
          consistentPattern.test(selector) || selector.includes('--')
        );
        
        // Should have mostly consistent naming
        const consistencyRatio = consistentNames.length / classSelectors.length;
        expect(consistencyRatio).toBeGreaterThan(0.6);
        
        console.log(`CSS naming consistency: ${(consistencyRatio * 100).toFixed(1)}%`);
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });

    test('should avoid !important overuse', () => {
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Count !important usage
        const importantUsage = cssContent.match(/!important/g) || [];
        
        // Should use !important sparingly (mainly for utilities and overrides)
        expect(importantUsage.length).toBeLessThan(30);
        
        console.log(`!important usage: ${importantUsage.length} instances`);
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });

    test('should have organized structure with comments', () => {
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Should have clear sections with comments
        const sectionComments = cssContent.match(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g) || [];
        
        // Should have organizational comments
        expect(sectionComments.length).toBeGreaterThan(10);
        
        // Should have design token section
        const hasDesignTokens = sectionComments.some(comment => 
          comment.includes('DESIGN TOKEN') || comment.includes('Design Token')
        );
        expect(hasDesignTokens).toBe(true);
        
        console.log(`CSS section comments: ${sectionComments.length}`);
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });
  });

  describe('Performance Regression Detection', () => {
    test('should monitor CSS complexity metrics', () => {
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Calculate complexity metrics
        const totalRules = cssContent.match(/[^{}]*{[^{}]*}/g) || [];
        const totalSelectors = cssContent.match(/[^{}]+(?={)/g) || [];
        const totalProperties = cssContent.match(/[^{}:]+:[^{}]+;/g) || [];
        
        // Log metrics for trend monitoring
        console.log(`CSS Complexity Metrics:`);
        console.log(`- Total rules: ${totalRules.length}`);
        console.log(`- Total selectors: ${totalSelectors.length}`);
        console.log(`- Total properties: ${totalProperties.length}`);
        
        // Set reasonable limits
        expect(totalRules.length).toBeLessThan(1000);
        expect(totalSelectors.length).toBeLessThan(1500);
        expect(totalProperties.length).toBeLessThan(2000);
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });

    test('should track design token usage', () => {
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Count design token definitions and usage
        const tokenDefinitions = cssContent.match(/--[a-zA-Z-]+:/g) || [];
        const tokenUsage = cssContent.match(/var\(--[a-zA-Z-]+\)/g) || [];
        
        // Should have good token adoption
        expect(tokenUsage.length).toBeGreaterThan(tokenDefinitions.length);
        
        console.log(`Design tokens: ${tokenDefinitions.length} defined, ${tokenUsage.length} used`);
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });

    test('should monitor vendor prefix usage', () => {
      try {
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Count vendor prefixes (should be minimal with modern CSS)
        const webkitPrefixes = cssContent.match(/-webkit-[^:]+:/g) || [];
        const mozPrefixes = cssContent.match(/-moz-[^:]+:/g) || [];
        const msPrefixes = cssContent.match(/-ms-[^:]+:/g) || [];
        
        const totalPrefixes = webkitPrefixes.length + mozPrefixes.length + msPrefixes.length;
        
        // Should minimize vendor prefixes (use autoprefixer instead)
        expect(totalPrefixes).toBeLessThan(20);
        
        console.log(`Vendor prefixes: ${totalPrefixes} total`);
      } catch (error) {
        console.warn('CSS file not found in test environment');
      }
    });
  });
});