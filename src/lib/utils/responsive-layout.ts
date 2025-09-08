/**
 * Responsive layout utilities for mobile optimization
 */

export interface BreakpointConfig {
  mobile: number;
  tablet: number;
  desktop: number;
  wide: number;
}

export const BREAKPOINTS: BreakpointConfig = {
  mobile: 640,   // sm
  tablet: 768,   // md
  desktop: 1024, // lg
  wide: 1280,    // xl
};

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'wide';

/**
 * Get current device type based on viewport width
 */
export function getDeviceType(): DeviceType {
  const width = window.innerWidth;
  
  if (width < BREAKPOINTS.mobile) return 'mobile';
  if (width < BREAKPOINTS.tablet) return 'tablet';
  if (width < BREAKPOINTS.desktop) return 'desktop';
  return 'wide';
}

/**
 * Check if current device is mobile
 */
export function isMobile(): boolean {
  return getDeviceType() === 'mobile';
}

/**
 * Check if current device is tablet or smaller
 */
export function isTabletOrSmaller(): boolean {
  const deviceType = getDeviceType();
  return deviceType === 'mobile' || deviceType === 'tablet';
}

/**
 * Get responsive grid columns based on device type
 */
export function getResponsiveColumns(
  config: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
    wide?: number;
  } = {}
): number {
  const deviceType = getDeviceType();
  const defaults = {
    mobile: 1,
    tablet: 2,
    desktop: 3,
    wide: 4,
  };
  
  const columns = { ...defaults, ...config };
  return columns[deviceType];
}

/**
 * Calculate responsive font size
 */
export function getResponsiveFontSize(
  baseSize: number,
  scaleFactor: number = 0.875
): string {
  const deviceType = getDeviceType();
  
  switch (deviceType) {
    case 'mobile':
      return `${baseSize * scaleFactor}rem`;
    case 'tablet':
      return `${baseSize * 0.9375}rem`;
    case 'desktop':
      return `${baseSize}rem`;
    case 'wide':
      return `${baseSize * 1.125}rem`;
    default:
      return `${baseSize}rem`;
  }
}

/**
 * Get responsive spacing values
 */
export function getResponsiveSpacing(
  baseSpacing: number,
  mobileScale: number = 0.75
): number {
  const deviceType = getDeviceType();
  
  switch (deviceType) {
    case 'mobile':
      return baseSpacing * mobileScale;
    case 'tablet':
      return baseSpacing * 0.875;
    case 'desktop':
      return baseSpacing;
    case 'wide':
      return baseSpacing * 1.125;
    default:
      return baseSpacing;
  }
}

/**
 * Handle viewport height issues on mobile (address bar)
 */
export function setMobileViewportHeight(): void {
  const setVH = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  // Set initial value
  setVH();

  // Update on resize and orientation change
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', () => {
    // Delay to account for browser UI changes
    setTimeout(setVH, 100);
  });
}

/**
 * Prevent horizontal scroll on mobile
 */
export function preventHorizontalScroll(): void {
  // Add CSS to prevent horizontal overflow
  const style = document.createElement('style');
  style.textContent = `
    html, body {
      overflow-x: hidden;
      max-width: 100vw;
    }
    
    * {
      box-sizing: border-box;
    }
    
    /* Prevent elements from causing horizontal scroll */
    .container, .page, .content {
      max-width: 100%;
      overflow-x: hidden;
    }
    
    /* Handle long text */
    .text-content {
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
    }
    
    /* Handle images */
    img {
      max-width: 100%;
      height: auto;
    }
    
    /* Handle tables */
    table {
      width: 100%;
      table-layout: fixed;
    }
    
    /* Handle pre and code blocks */
    pre, code {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * Add safe area padding for devices with notches
 */
export function addSafeAreaSupport(): void {
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --safe-area-inset-top: env(safe-area-inset-top, 0px);
      --safe-area-inset-right: env(safe-area-inset-right, 0px);
      --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
      --safe-area-inset-left: env(safe-area-inset-left, 0px);
    }
    
    .safe-area-top {
      padding-top: var(--safe-area-inset-top);
    }
    
    .safe-area-bottom {
      padding-bottom: var(--safe-area-inset-bottom);
    }
    
    .safe-area-left {
      padding-left: var(--safe-area-inset-left);
    }
    
    .safe-area-right {
      padding-right: var(--safe-area-inset-right);
    }
    
    .safe-area-all {
      padding-top: var(--safe-area-inset-top);
      padding-right: var(--safe-area-inset-right);
      padding-bottom: var(--safe-area-inset-bottom);
      padding-left: var(--safe-area-inset-left);
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * Optimize scrolling performance on mobile
 */
export function optimizeScrolling(): void {
  const style = document.createElement('style');
  style.textContent = `
    /* Smooth scrolling with momentum on iOS */
    * {
      -webkit-overflow-scrolling: touch;
    }
    
    /* Optimize scroll performance */
    .scroll-container {
      transform: translateZ(0);
      will-change: scroll-position;
    }
    
    /* Prevent scroll bounce on iOS */
    body {
      overscroll-behavior: none;
    }
    
    /* Optimize touch scrolling */
    .touch-scroll {
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * Handle keyboard visibility on mobile
 */
export function handleMobileKeyboard(): void {
  let initialViewportHeight = window.innerHeight;
  
  const handleResize = () => {
    const currentHeight = window.innerHeight;
    const heightDifference = initialViewportHeight - currentHeight;
    
    // If height decreased significantly, keyboard is likely open
    if (heightDifference > 150) {
      document.body.classList.add('keyboard-open');
      document.documentElement.style.setProperty('--keyboard-height', `${heightDifference}px`);
    } else {
      document.body.classList.remove('keyboard-open');
      document.documentElement.style.setProperty('--keyboard-height', '0px');
    }
  };

  window.addEventListener('resize', handleResize);
  
  // Handle focus events on form inputs
  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      setTimeout(() => {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    });
  });
}

/**
 * Add responsive utility classes
 */
export function addResponsiveUtilities(): void {
  const style = document.createElement('style');
  style.textContent = `
    /* Mobile-first responsive utilities */
    .mobile-only { display: block; }
    .tablet-only { display: none; }
    .desktop-only { display: none; }
    .mobile-hidden { display: none; }
    
    @media (min-width: ${BREAKPOINTS.mobile}px) {
      .mobile-only { display: none; }
      .tablet-only { display: block; }
      .tablet-hidden { display: none; }
    }
    
    @media (min-width: ${BREAKPOINTS.desktop}px) {
      .tablet-only { display: none; }
      .desktop-only { display: block; }
      .desktop-hidden { display: none; }
    }
    
    /* Responsive text sizes */
    .text-responsive-sm {
      font-size: ${getResponsiveFontSize(0.875)};
    }
    
    .text-responsive-base {
      font-size: ${getResponsiveFontSize(1)};
    }
    
    .text-responsive-lg {
      font-size: ${getResponsiveFontSize(1.125)};
    }
    
    .text-responsive-xl {
      font-size: ${getResponsiveFontSize(1.25)};
    }
    
    /* Responsive spacing */
    .p-responsive {
      padding: ${getResponsiveSpacing(16)}px;
    }
    
    .m-responsive {
      margin: ${getResponsiveSpacing(16)}px;
    }
    
    /* Mobile-optimized grid */
    .grid-responsive {
      display: grid;
      gap: ${getResponsiveSpacing(16)}px;
      grid-template-columns: repeat(${getResponsiveColumns()}, 1fr);
    }
    
    @media (min-width: ${BREAKPOINTS.mobile}px) {
      .grid-responsive {
        grid-template-columns: repeat(${getResponsiveColumns({ tablet: 2 })}, 1fr);
      }
    }
    
    @media (min-width: ${BREAKPOINTS.desktop}px) {
      .grid-responsive {
        grid-template-columns: repeat(${getResponsiveColumns({ desktop: 3 })}, 1fr);
      }
    }
    
    /* Mobile-friendly forms */
    @media (max-width: ${BREAKPOINTS.mobile - 1}px) {
      input, textarea, select, button {
        font-size: 16px !important; /* Prevent zoom on iOS */
        min-height: 44px;
      }
      
      .form-group {
        margin-bottom: 1rem;
      }
      
      .form-row {
        flex-direction: column;
      }
      
      .form-row > * {
        width: 100% !important;
        margin-bottom: 0.5rem;
      }
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * Initialize all mobile optimizations
 */
export function initializeMobileOptimizations(): void {
  // Only run on client side
  if (typeof window === 'undefined') return;
  
  setMobileViewportHeight();
  preventHorizontalScroll();
  addSafeAreaSupport();
  optimizeScrolling();
  handleMobileKeyboard();
  addResponsiveUtilities();
}

/**
 * Debounced resize handler for performance
 */
export function addResizeHandler(callback: () => void, delay: number = 250): () => void {
  let timeoutId: NodeJS.Timeout;
  
  const debouncedCallback = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(callback, delay);
  };
  
  window.addEventListener('resize', debouncedCallback);
  
  return () => {
    window.removeEventListener('resize', debouncedCallback);
    clearTimeout(timeoutId);
  };
}