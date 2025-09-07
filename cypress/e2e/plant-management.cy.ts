/// <reference types="cypress" />
import '../support/e2e';

describe('Plant Management E2E', () => {
  beforeEach(() => {
    cy.clearTestData();
    cy.seedTestData();
    cy.setMobileViewport();
    cy.login();
  });

  afterEach(() => {
    cy.clearTestData();
  });

  describe('Plant Creation Flow', () => {
    it('creates a new plant successfully', () => {
      cy.visit('/dashboard/plants');
      
      // Click add plant button
      cy.get('[data-testid="add-plant-fab"]').click();
      
      // Fill out plant form
      cy.get('[data-testid="plant-type-selector"]').click();
      cy.get('[data-testid="plant-option-monstera"]').click();
      
      cy.get('[data-testid="nickname-input"]').type('My First Monstera');
      cy.get('[data-testid="location-input"]').type('Living Room');
      cy.get('[data-testid="schedule-select"]').select('2 weeks');
      
      // Submit form
      cy.get('[data-testid="save-plant-button"]').click();
      
      // Verify plant was created
      cy.get('[data-testid="success-toast"]').should('contain', 'Plant added successfully');
      cy.get('[data-testid="plant-card"]').should('contain', 'My First Monstera');
      cy.get('[data-testid="plant-card"]').should('contain', 'Living Room');
    });

    it('validates required fields', () => {
      cy.visit('/dashboard/plants');
      cy.get('[data-testid="add-plant-fab"]').click();
      
      // Try to submit without required fields
      cy.get('[data-testid="save-plant-button"]').click();
      
      // Check validation errors
      cy.get('[data-testid="nickname-error"]').should('contain', 'Nickname is required');
      cy.get('[data-testid="location-error"]').should('contain', 'Location is required');
    });

    it('handles plant type search and selection', () => {
      cy.visit('/dashboard/plants');
      cy.get('[data-testid="add-plant-fab"]').click();
      
      // Search for plant type
      cy.get('[data-testid="plant-type-search"]').type('snake');
      cy.get('[data-testid="plant-option-snake-plant"]').should('be.visible');
      cy.get('[data-testid="plant-option-snake-plant"]').click();
      
      // Verify selection
      cy.get('[data-testid="selected-plant-type"]').should('contain', 'Snake Plant');
    });
  });

  describe('Plant List and Search', () => {
    beforeEach(() => {
      // Create test plants
      cy.createPlant({
        plantType: 'monstera',
        nickname: 'Monstera Deliciosa',
        location: 'Living Room',
        schedule: '2 weeks',
      });
      
      cy.createPlant({
        plantType: 'snake-plant',
        nickname: 'Snake Plant',
        location: 'Bedroom',
        schedule: '1 month',
      });
    });

    it('displays all plants in grid view', () => {
      cy.visit('/dashboard/plants');
      
      cy.get('[data-testid="plant-card"]').should('have.length', 2);
      cy.get('[data-testid="plant-card"]').first().should('contain', 'Monstera Deliciosa');
      cy.get('[data-testid="plant-card"]').last().should('contain', 'Snake Plant');
    });

    it('searches plants by nickname', () => {
      cy.visit('/dashboard/plants');
      
      cy.get('[data-testid="search-input"]').type('Monstera');
      cy.waitForLoad();
      
      cy.get('[data-testid="plant-card"]').should('have.length', 1);
      cy.get('[data-testid="plant-card"]').should('contain', 'Monstera Deliciosa');
    });

    it('filters plants by location', () => {
      cy.visit('/dashboard/plants');
      
      cy.get('[data-testid="filter-button"]').click();
      cy.get('[data-testid="location-filter"]').select('Bedroom');
      cy.get('[data-testid="apply-filters"]').click();
      
      cy.get('[data-testid="plant-card"]').should('have.length', 1);
      cy.get('[data-testid="plant-card"]').should('contain', 'Snake Plant');
    });

    it('handles empty search results', () => {
      cy.visit('/dashboard/plants');
      
      cy.get('[data-testid="search-input"]').type('NonexistentPlant');
      cy.waitForLoad();
      
      cy.get('[data-testid="empty-state"]').should('be.visible');
      cy.get('[data-testid="empty-state"]').should('contain', 'No plants found');
    });
  });

  describe('Care Management', () => {
    beforeEach(() => {
      cy.createPlant({
        plantType: 'monstera',
        nickname: 'Test Plant',
        location: 'Living Room',
        schedule: '2 weeks',
      });
    });

    it('logs care from plant card', () => {
      cy.visit('/dashboard/plants');
      
      // Hover over plant card to show actions
      cy.get('[data-testid="plant-card"]').trigger('mouseover');
      cy.get('[data-testid="quick-care-button"]').click();
      
      // Select care type and log
      cy.get('[data-testid="care-type-fertilizer"]').click();
      cy.get('[data-testid="log-care-button"]').click();
      
      // Verify success
      cy.get('[data-testid="success-toast"]').should('contain', 'Care logged successfully');
    });

    it('shows care dashboard with overdue plants', () => {
      // Mock overdue plant
      cy.mockApi('GET', '/api/care/dashboard', {
        success: true,
        data: {
          overduePlants: [{
            id: 1,
            nickname: 'Test Plant',
            daysOverdue: 5,
          }],
          dueTodayPlants: [],
          upcomingPlants: [],
        },
      });

      cy.visit('/dashboard/care');
      
      cy.get('[data-testid="overdue-section"]').should('be.visible');
      cy.get('[data-testid="overdue-plant"]').should('contain', 'Test Plant');
      cy.get('[data-testid="overdue-indicator"]').should('contain', '5 days overdue');
    });

    it('handles quick care actions from care dashboard', () => {
      cy.visit('/dashboard/care');
      
      cy.get('[data-testid="overdue-plant"]').within(() => {
        cy.get('[data-testid="quick-fertilize"]').click();
      });
      
      cy.get('[data-testid="success-toast"]').should('be.visible');
    });
  });

  describe('Plant Detail View', () => {
    beforeEach(() => {
      cy.createPlant({
        plantType: 'monstera',
        nickname: 'Detailed Plant',
        location: 'Living Room',
        schedule: '2 weeks',
      });
    });

    it('opens plant detail modal', () => {
      cy.visit('/dashboard/plants');
      
      cy.get('[data-testid="plant-card"]').click();
      
      cy.get('[data-testid="plant-detail-modal"]').should('be.visible');
      cy.get('[data-testid="plant-name"]').should('contain', 'Detailed Plant');
      cy.get('[data-testid="plant-location"]').should('contain', 'Living Room');
    });

    it('displays care history timeline', () => {
      cy.visit('/dashboard/plants');
      cy.get('[data-testid="plant-card"]').click();
      
      cy.get('[data-testid="care-history-tab"]').click();
      cy.get('[data-testid="care-timeline"]').should('be.visible');
    });

    it('allows editing plant details', () => {
      cy.visit('/dashboard/plants');
      cy.get('[data-testid="plant-card"]').click();
      
      cy.get('[data-testid="edit-plant-button"]').click();
      
      cy.get('[data-testid="nickname-input"]').clear().type('Updated Plant Name');
      cy.get('[data-testid="save-changes-button"]').click();
      
      cy.get('[data-testid="success-toast"]').should('contain', 'Plant updated');
      cy.get('[data-testid="plant-name"]').should('contain', 'Updated Plant Name');
    });
  });

  describe('Mobile Navigation', () => {
    it('navigates between tabs using bottom navigation', () => {
      cy.visit('/dashboard/plants');
      
      // Test navigation to Care tab
      cy.get('[data-testid="nav-care"]').click();
      cy.url().should('include', '/dashboard/care');
      cy.get('[data-testid="care-dashboard"]').should('be.visible');
      
      // Test navigation to Propagation tab
      cy.get('[data-testid="nav-propagation"]').click();
      cy.url().should('include', '/dashboard/propagations');
      cy.get('[data-testid="propagation-dashboard"]').should('be.visible');
      
      // Test navigation to Profile tab
      cy.get('[data-testid="nav-profile"]').click();
      cy.url().should('include', '/dashboard/profile');
      cy.get('[data-testid="profile-dashboard"]').should('be.visible');
      
      // Return to Plants tab
      cy.get('[data-testid="nav-plants"]').click();
      cy.url().should('include', '/dashboard/plants');
      cy.get('[data-testid="plants-grid"]').should('be.visible');
    });

    it('maintains tab state when switching', () => {
      cy.visit('/dashboard/plants');
      
      // Search for a plant
      cy.get('[data-testid="search-input"]').type('Test Search');
      
      // Switch to Care tab and back
      cy.get('[data-testid="nav-care"]').click();
      cy.get('[data-testid="nav-plants"]').click();
      
      // Verify search is maintained
      cy.get('[data-testid="search-input"]').should('have.value', 'Test Search');
    });

    it('shows notification badges for overdue care', () => {
      // Mock overdue plants
      cy.mockApi('GET', '/api/care/dashboard', {
        success: true,
        data: {
          overduePlants: [{ id: 1 }, { id: 2 }],
        },
      });

      cy.visit('/dashboard/plants');
      
      cy.get('[data-testid="nav-care"]').within(() => {
        cy.get('[data-testid="notification-badge"]').should('contain', '2');
      });
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for different screen sizes', () => {
      cy.visit('/dashboard/plants');
      
      // Test mobile layout
      cy.setMobileViewport();
      cy.get('[data-testid="plants-grid"]').should('have.class', 'grid-cols-2');
      
      // Test tablet layout
      cy.setTabletViewport();
      cy.get('[data-testid="plants-grid"]').should('have.class', 'grid-cols-3');
      
      // Test desktop layout
      cy.setDesktopViewport();
      cy.get('[data-testid="plants-grid"]').should('have.class', 'grid-cols-4');
    });

    it('handles touch gestures on mobile', () => {
      cy.setMobileViewport();
      cy.visit('/dashboard/plants');
      
      // Test swipe gesture on plant card
      cy.get('[data-testid="plant-card"]').first().swipe('left');
      cy.get('[data-testid="swipe-actions"]').should('be.visible');
    });
  });

  describe('Performance', () => {
    it('loads within acceptable time limits', () => {
      cy.visit('/dashboard/plants');
      cy.measurePerformance();
      
      // Check that LCP is under 2.5 seconds
      cy.window().then((win) => {
        const lcp = win.performance.getEntriesByType('largest-contentful-paint')[0];
        if (lcp) {
          expect(lcp.startTime).to.be.lessThan(2500);
        }
      });
    });

    it('handles large plant collections efficiently', () => {
      // Mock large dataset
      const largePlantList = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        nickname: `Plant ${i + 1}`,
        location: `Room ${i % 5 + 1}`,
      }));

      cy.mockApi('GET', '/api/plant-instances', {
        success: true,
        data: {
          instances: largePlantList.slice(0, 20),
          totalCount: 100,
          hasMore: true,
        },
      });

      cy.visit('/dashboard/plants');
      
      // Verify virtual scrolling or pagination
      cy.get('[data-testid="plant-card"]').should('have.length', 20);
      
      // Test infinite scroll
      cy.scrollTo('bottom');
      cy.get('[data-testid="loading-more"]').should('be.visible');
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', () => {
      cy.mockApi('GET', '/api/plant-instances', {}, 500);
      
      cy.visit('/dashboard/plants');
      
      cy.get('[data-testid="error-message"]').should('be.visible');
      cy.get('[data-testid="retry-button"]').should('be.visible');
    });

    it('shows appropriate error for failed plant creation', () => {
      cy.mockApi('POST', '/api/plant-instances', {
        success: false,
        error: 'Plant creation failed',
      }, 400);

      cy.visit('/dashboard/plants');
      cy.get('[data-testid="add-plant-fab"]').click();
      
      cy.submitForm('[data-testid="plant-form"]', {
        nickname: 'Test Plant',
        location: 'Test Location',
      });
      
      cy.get('[data-testid="error-toast"]').should('contain', 'Plant creation failed');
    });

    it('handles offline mode', () => {
      cy.visit('/dashboard/plants');
      
      cy.goOffline();
      
      cy.get('[data-testid="offline-indicator"]').should('be.visible');
      cy.get('[data-testid="offline-message"]').should('contain', 'You are currently offline');
      
      cy.goOnline();
      
      cy.get('[data-testid="offline-indicator"]').should('not.exist');
    });
  });
});