// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR requests from command log
Cypress.on('window:before:load', (win) => {
  // Stub console methods to reduce noise
  cy.stub(win.console, 'log');
  cy.stub(win.console, 'warn');
});

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  // on uncaught exceptions that we expect (like network errors in offline mode)
  if (err.message.includes('Network Error') || 
      err.message.includes('Failed to fetch') ||
      err.message.includes('Load failed')) {
    return false;
  }
  
  // Let other errors fail the test
  return true;
});

// Custom viewport commands for mobile testing
Cypress.Commands.add('setMobileViewport', () => {
  cy.viewport(375, 667); // iPhone SE size
});

Cypress.Commands.add('setTabletViewport', () => {
  cy.viewport(768, 1024); // iPad size
});

Cypress.Commands.add('setDesktopViewport', () => {
  cy.viewport(1280, 720); // Desktop size
});

// Authentication helpers
Cypress.Commands.add('login', (email?: string, password?: string) => {
  const testEmail = email || Cypress.env('TEST_USER_EMAIL');
  const testPassword = password || Cypress.env('TEST_USER_PASSWORD');
  
  cy.visit('/auth/signin');
  cy.get('[data-testid="email-input"]').type(testEmail);
  cy.get('[data-testid="password-input"]').type(testPassword);
  cy.get('[data-testid="signin-button"]').click();
  
  // Wait for redirect to dashboard
  cy.url().should('include', '/dashboard');
});

Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="logout-button"]').click();
  cy.url().should('include', '/auth/signin');
});

// Plant management helpers
Cypress.Commands.add('createPlant', (plantData) => {
  cy.get('[data-testid="add-plant-button"]').click();
  
  if (plantData.plantType) {
    cy.get('[data-testid="plant-type-selector"]').click();
    cy.get(`[data-testid="plant-option-${plantData.plantType}"]`).click();
  }
  
  if (plantData.nickname) {
    cy.get('[data-testid="nickname-input"]').type(plantData.nickname);
  }
  
  if (plantData.location) {
    cy.get('[data-testid="location-input"]').type(plantData.location);
  }
  
  if (plantData.schedule) {
    cy.get('[data-testid="schedule-select"]').select(plantData.schedule);
  }
  
  cy.get('[data-testid="save-plant-button"]').click();
  
  // Wait for plant to be created
  cy.get('[data-testid="plant-card"]').should('contain', plantData.nickname);
});

Cypress.Commands.add('logCare', (plantName, careType = 'fertilizer') => {
  cy.get(`[data-testid="plant-card"]:contains("${plantName}")`).within(() => {
    cy.get('[data-testid="quick-care-button"]').click();
  });
  
  cy.get(`[data-testid="care-type-${careType}"]`).click();
  cy.get('[data-testid="log-care-button"]').click();
  
  // Wait for success message
  cy.get('[data-testid="success-message"]').should('be.visible');
});

// Wait helpers
Cypress.Commands.add('waitForLoad', () => {
  cy.get('[data-testid="loading-spinner"]').should('not.exist');
});

Cypress.Commands.add('waitForApiCall', (alias) => {
  cy.wait(alias);
  cy.waitForLoad();
});

// PWA helpers
Cypress.Commands.add('installPWA', () => {
  cy.window().then((win) => {
    // Trigger PWA install prompt
    win.dispatchEvent(new Event('beforeinstallprompt'));
  });
  
  cy.get('[data-testid="pwa-install-button"]').click();
});

Cypress.Commands.add('goOffline', () => {
  cy.window().then((win) => {
    // Simulate offline mode
    Object.defineProperty(win.navigator, 'onLine', {
      writable: true,
      value: false,
    });
    
    win.dispatchEvent(new Event('offline'));
  });
});

Cypress.Commands.add('goOnline', () => {
  cy.window().then((win) => {
    Object.defineProperty(win.navigator, 'onLine', {
      writable: true,
      value: true,
    });
    
    win.dispatchEvent(new Event('online'));
  });
});

// Database helpers
Cypress.Commands.add('seedTestData', () => {
  cy.task('seedDatabase');
});

Cypress.Commands.add('clearTestData', () => {
  cy.task('clearDatabase');
});

// Accessibility helpers
Cypress.Commands.add('checkA11y', () => {
  cy.injectAxe();
  cy.checkA11y();
});

// Performance helpers
Cypress.Commands.add('measurePerformance', () => {
  cy.window().then((win) => {
    const navigation = win.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const lcp = win.performance.getEntriesByType('largest-contentful-paint')[0];
    
    cy.log(`Load time: ${navigation.loadEventEnd - navigation.loadEventStart}ms`);
    if (lcp) {
      cy.log(`LCP: ${lcp.startTime}ms`);
    }
  });
});

// Mock API helper
Cypress.Commands.add('mockApi', (method, url, response) => {
  cy.intercept(method, url, response);
});

// Touch gesture helpers
Cypress.Commands.add('swipe', { prevSubject: 'element' }, (subject, direction) => {
  const element = subject[0];
  const rect = element.getBoundingClientRect();
  const startX = rect.left + rect.width / 2;
  const startY = rect.top + rect.height / 2;
  
  let endX = startX;
  let endY = startY;
  
  switch (direction) {
    case 'left':
      endX = startX - rect.width * 0.8;
      break;
    case 'right':
      endX = startX + rect.width * 0.8;
      break;
    case 'up':
      endY = startY - rect.height * 0.8;
      break;
    case 'down':
      endY = startY + rect.height * 0.8;
      break;
  }
  
  cy.wrap(subject)
    .trigger('touchstart', { touches: [{ clientX: startX, clientY: startY }] })
    .trigger('touchmove', { touches: [{ clientX: endX, clientY: endY }] })
    .trigger('touchend');
});

declare global {
  namespace Cypress {
    interface Chainable {
      setMobileViewport(): Chainable<void>;
      setTabletViewport(): Chainable<void>;
      setDesktopViewport(): Chainable<void>;
      login(email?: string, password?: string): Chainable<void>;
      logout(): Chainable<void>;
      createPlant(plantData: {
        plantType?: string;
        nickname?: string;
        location?: string;
        schedule?: string;
      }): Chainable<void>;
      logCare(plantName: string, careType?: string): Chainable<void>;
      waitForLoad(): Chainable<void>;
      waitForApiCall(alias: string): Chainable<void>;
      installPWA(): Chainable<void>;
      goOffline(): Chainable<void>;
      goOnline(): Chainable<void>;
      seedTestData(): Chainable<void>;
      clearTestData(): Chainable<void>;
      checkA11y(): Chainable<void>;
      measurePerformance(): Chainable<void>;
      mockApi(method: string, url: string, response: any): Chainable<void>;
      swipe(direction: 'left' | 'right' | 'up' | 'down'): Chainable<JQuery<HTMLElement>>;
    }
  }
}