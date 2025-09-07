/// <reference types="cypress" />

// Additional custom commands for plant management testing
// Note: Some commands are already defined in e2e.ts

Cypress.Commands.add('mockApi', (method, url, response) => {
  cy.intercept(method, url, response);
});

declare global {
  namespace Cypress {
    interface Chainable {
      mockApi(method: string, url: string, response: any): Chainable<void>;
    }
  }
}