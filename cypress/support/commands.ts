/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to handle API mocking
Cypress.Commands.add('mockApi', (method: string, url: string, response: any, statusCode = 200) => {
  cy.intercept(method, url, {
    statusCode,
    body: response,
  }).as(`api${method}${url.replace(/[^a-zA-Z0-9]/g, '')}`);
});

// Custom command to handle form submissions
Cypress.Commands.add('submitForm', (formSelector: string, data: Record<string, any>) => {
  cy.get(formSelector).within(() => {
    Object.entries(data).forEach(([field, value]) => {
      if (typeof value === 'string') {
        cy.get(`[name="${field}"], [data-testid="${field}-input"]`).clear().type(value);
      } else if (typeof value === 'boolean') {
        if (value) {
          cy.get(`[name="${field}"], [data-testid="${field}-checkbox"]`).check();
        } else {
          cy.get(`[name="${field}"], [data-testid="${field}-checkbox"]`).uncheck();
        }
      }
    });
    
    cy.get('[type="submit"], [data-testid="submit-button"]').click();
  });
});

// Custom command to handle drag and drop
Cypress.Commands.add('dragAndDrop', (sourceSelector: string, targetSelector: string) => {
  cy.get(sourceSelector).trigger('dragstart');
  cy.get(targetSelector).trigger('drop');
});

// Custom command to handle file uploads
Cypress.Commands.add('uploadFile', (selector: string, fileName: string, fileType = 'image/jpeg') => {
  cy.fixture(fileName, 'base64').then((fileContent) => {
    const blob = Cypress.Blob.base64StringToBlob(fileContent, fileType);
    const file = new File([blob], fileName, { type: fileType });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    
    cy.get(selector).then((input) => {
      const inputElement = input[0] as HTMLInputElement;
      inputElement.files = dataTransfer.files;
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
});

// Custom command to handle swipe gestures
Cypress.Commands.add('swipe', (selector: string, direction: 'left' | 'right' | 'up' | 'down') => {
  cy.get(selector).then(($el) => {
    const el = $el[0];
    const rect = el.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    
    let endX = startX;
    let endY = startY;
    
    switch (direction) {
      case 'left':
        endX = startX - 100;
        break;
      case 'right':
        endX = startX + 100;
        break;
      case 'up':
        endY = startY - 100;
        break;
      case 'down':
        endY = startY + 100;
        break;
    }
    
    cy.wrap(el)
      .trigger('touchstart', { touches: [{ clientX: startX, clientY: startY }] })
      .trigger('touchmove', { touches: [{ clientX: endX, clientY: endY }] })
      .trigger('touchend');
  });
});

// Custom command to check responsive design
Cypress.Commands.add('checkResponsive', (selector: string) => {
  const viewports = [
    { width: 375, height: 667, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1280, height: 720, name: 'desktop' },
  ];
  
  viewports.forEach((viewport) => {
    cy.viewport(viewport.width, viewport.height);
    cy.get(selector).should('be.visible');
    cy.log(`✓ ${selector} is visible on ${viewport.name}`);
  });
});

// Custom command to test keyboard navigation
Cypress.Commands.add('testKeyboardNavigation', (containerSelector: string) => {
  cy.get(containerSelector).within(() => {
    // Test tab navigation
    cy.get('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
      .first()
      .focus()
      .tab()
      .should('have.focus');
    
    // Test escape key
    cy.focused().type('{esc}');
    
    // Test enter key on buttons
    cy.get('button').first().focus().type('{enter}');
  });
});

// Custom command to simulate network conditions
Cypress.Commands.add('simulateSlowNetwork', () => {
  cy.intercept('**', (req) => {
    req.reply((res) => {
      // Add 2 second delay to simulate slow network
      return new Promise((resolve) => {
        setTimeout(() => resolve(res), 2000);
      });
    });
  });
});

// Custom command to check PWA features
Cypress.Commands.add('checkPWAFeatures', () => {
  // Check service worker registration
  cy.window().then((win) => {
    expect(win.navigator.serviceWorker).to.exist;
  });
  
  // Check manifest
  cy.get('link[rel="manifest"]').should('exist');
  
  // Check app icons
  cy.get('link[rel="icon"]').should('exist');
  
  // Check viewport meta tag
  cy.get('meta[name="viewport"]').should('exist');
});

declare global {
  namespace Cypress {
    interface Chainable {
      mockApi(method: string, url: string, response: any, statusCode?: number): Chainable<void>;
      submitForm(formSelector: string, data: Record<string, any>): Chainable<void>;
      dragAndDrop(sourceSelector: string, targetSelector: string): Chainable<void>;
      uploadFile(selector: string, fileName: string, fileType?: string): Chainable<void>;
      swipe(selector: string, direction: 'left' | 'right' | 'up' | 'down'): Chainable<void>;
      checkResponsive(selector: string): Chainable<void>;
      testKeyboardNavigation(containerSelector: string): Chainable<void>;
      simulateSlowNetwork(): Chainable<void>;
      checkPWAFeatures(): Chainable<void>;
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
    }
  }
}