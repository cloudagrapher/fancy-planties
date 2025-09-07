import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 375,
    viewportHeight: 667,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    env: {
      // Test environment variables
      TEST_USER_EMAIL: 'test@example.com',
      TEST_USER_PASSWORD: 'testpassword123',
    },
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
        
        // Database seeding tasks
        seedDatabase() {
          // Implementation would seed test database
          return null;
        },
        
        clearDatabase() {
          // Implementation would clear test database
          return null;
        },
      });
    },
  },

  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
    supportFile: 'cypress/support/component.ts',
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
    indexHtmlFile: 'cypress/support/component-index.html',
  },
});