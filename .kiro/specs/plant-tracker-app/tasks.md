# Fancy Planties - Implementation Plan

## Mobile-Native Bottom Navigation Architecture

- [x] 1. Project Foundation and Setup
  - Initialize Next.js 15 project with TypeScript and App Router
  - Configure Tailwind CSS with mobile-first utilities and Fancy Planties custom theme (green color palette, typography scale, component design tokens)
  - Setup Docker Compose with PostgreSQL database
  - Configure Drizzle ORM with TypeScript schema definitions
  - Setup basic PWA configuration with "Fancy Planties" manifest and service worker
  - _Requirements: 7.1, 7.2, 8.5_

- [x] 2. Database Schema and Core Infrastructure
  - [x] 2.1 Implement database schema with Drizzle
    - Create users, plants, plant_instances, propagations, and sessions tables
    - Implement Row-Level Security policies for user data segregation
    - Add proper indexes for performance optimization
    - _Requirements: 1.3, 8.4_

  - [x] 2.2 Create database connection and query utilities
    - Setup database connection with connection pooling
    - Implement base CRUD operations for all entities
    - Add error handling and logging for database operations
    - Create database migration and rollback utilities
    - _Requirements: 8.4_

- [x] 3. Authentication System Implementation
  - [x] 3.1 Setup Lucia auth with PostgreSQL adapter
    - Configure Lucia auth with session-based authentication
    - Implement secure password hashing with bcrypt
    - Create session management utilities
    - Add CSRF protection and rate limiting
    - _Requirements: 1.1, 1.2, 1.4_

  - [x] 3.2 Fix client/server component separation for authentication
    - Install `server-only` package to enforce boundaries
    - Create `/lib/auth/server.ts` - Server-only functions with `import 'server-only'`
    - Create `/lib/auth/client.ts` - Client-safe functions and types
    - Update `/lib/auth/index.ts` - Add server-only directive for Node.js modules
    - Update all import statements to use correct auth modules
    - Separate mixed client/server components (e.g., plants page)
    - Configure webpack fallbacks for Node.js modules in `next.config.ts`
    - _Requirements: Build system compatibility_

  - [x] 3.3 Create authentication UI components and flows
    - Build user registration form with validation
    - Create login form with error handling
    - Implement logout functionality
    - Add route protection middleware for authenticated pages
    - Create authentication API endpoints
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

- [x] 4. Enhanced Plant Taxonomy Management System
  - [x] 4.1 Implement enhanced plant taxonomy data models and validation
    - Create TypeScript interfaces for Plant with separate cultivar and common_name fields
    - Implement Zod validation schemas for all plant data with new taxonomy structure
    - Build plant taxonomy CRUD operations with user tracking
    - Add fuzzy search functionality across all taxonomy fields (family, genus, species, cultivar, common name)
    - _Requirements: 2.1, 2.2, 2.6_

  - [x] 4.2 Build enhanced PlantTaxonomySelector and PlantTaxonomyForm components
    - Create autocomplete search component with real-time suggestions across all taxonomy fields
    - Implement fuzzy matching across family, genus, species, cultivar, and common name
    - Add "Add new plant type" functionality when no matches found
    - Build detailed PlantTaxonomyForm with separate fields for Family, Genus, Species, Cultivar, Common Name
    - Add validation and help text for proper botanical naming conventions
    - Add recent selections and popular plants features
    - _Requirements: 2.1, 2.2, 2.6_

- [x] 5. CSV Data Import System
  - [x] 5.1 Create CSV parsing and validation utilities
    - Build CSV parser for plant taxonomy data with validation
    - Implement fertilizer schedule CSV import with plant matching
    - Create propagation data import with parent plant linking
    - Add data conflict resolution and duplicate handling
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 5.2 Build import UI and progress tracking for Profile tab
    - Create file upload component accessible from Profile tab
    - Implement import progress tracking and status reporting within Profile dashboard
    - Add import summary and error reporting with modal overlays
    - Build data preview and confirmation before import in Profile context
    - _Requirements: 6.1, 6.4, 6.5, 7.6_

- [x] 6. Plant Instance Management
  - [x] 6.1 Create plant instance data models and operations
    - Implement PlantInstance TypeScript interfaces and validation
    - Build CRUD operations for plant instances with user filtering
    - Add plant instance search and filtering functionality
    - Implement active/inactive plant status management
    - _Requirements: 2.2, 2.3, 2.5_

  - [x] 6.2 Build PlantCard and PlantsGrid components for Plants tab
    - Create mobile-optimized PlantCard component with touch interactions and swipe actions
    - Implement responsive PlantsGrid as the main Plants tab view with virtual scrolling
    - Add search and filter UI integrated into the Plants tab header
    - Build loading states and error handling for plant data within tab context
    - Implement pull-to-refresh and infinite scroll functionality for Plants tab
    - _Requirements: 2.3, 2.4, 7.3, 8.1, 8.2_

- [x] 7. Care Schedule and History Tracking
  - [x] 7.1 Implement care tracking data models and calculations
    - Create care history data structures and validation
    - Build fertilizer schedule calculation logic
    - Implement due date calculation and overdue detection
    - Add repotting history tracking functionality
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 7.2 Build care logging components and Care tab integration
    - Create quick care logging forms accessible from Care tab dashboard
    - Implement care history timeline display within plant detail modals
    - Build care task cards with urgency indicators for Care tab
    - Add care status indicators in plant grid and Care tab views
    - Create care reminder system with notification badges on bottom navigation
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7_
  - [x] 7.3 Build notification and reminder system
    - Implement overdue plant detection with visual priority indicators
    - Create care reminder notifications (browser notifications for PWA)
    - Add email digest functionality for weekly care summaries
    - Build care streak tracking and plant health analytics

- [x] 8. Plant Detail Views and Management
  - [x] 8.1 Create comprehensive plant detail page
    - Build plant instance detail view with all information
    - Implement care history timeline with visual indicators
    - Add plant notes and observation tracking
    - Create plant instance editing functionality
    - Link related propagations and show plant lineage
    - _Requirements: 2.2, 3.2, 4.4_

  - [x] 8.2 Build plant instance forms and validation
    - Create add/edit plant instance forms with taxonomy selector
    - Implement form validation with real-time feedback
    - Add location management and selection
    - Build plant nickname and custom field management
    - Create plant activation/deactivation functionality
    - _Requirements: 2.1, 2.2, 2.5_
  - [x] 8.3 Ensure there are no errors, there is proper test coverage, and all relevant tests pass for tasks 8.*
- [x] 9. Image Management System
  - [x] 9.1 Implement image upload and storage
    - Create ImageUpload component with drag-and-drop support
    - Implement Base64 image encoding and validation
    - Add image compression and size optimization
    - Build image gallery component for multiple images
    - Create primary image selection functionality
    - _Requirements: 5.1, 5.3, 5.4_

  - [x] 9.2 Build image management UI and features
    - Implement image deletion with confirmation
    - Create image reordering and organization features
    - Add image zoom and full-screen viewing
    - Build image association with plant instances and propagations
    - Prepare migration utilities for future file storage
    - _Requirements: 5.1, 5.2, 5.4, 5.5_
  - [x] 9.3 Ensure there are no errors, there is proper test coverage, and all relevant tests pass for tasks 9.*

- [x] 10. Enhanced Propagation Management System
  - [x] 10.1 Implement enhanced propagation tracking data models
    - Create enhanced Propagation TypeScript interfaces with source_type, external_source fields
    - Build propagation CRUD operations supporting both internal parent plant linking and external sources
    - Implement propagation status progression tracking
    - Add propagation success rate calculation utilities for both internal and external propagations
    - _Requirements: 4.1, 4.2, 4.5, 4.8, 4.9_

  - [x] 10.2 Build enhanced propagation tracking UI components for Propagation tab
    - Create PropagationDashboard component with status-grouped propagations showing source types
    - Build PropagationCard component with status indicators, source indicators, and quick actions
    - Implement enhanced PropagationForm with source type selection (internal/external)
    - Add plant selector for internal propagations and external source details form
    - Add propagation editing functionality to change parent relationships or external source info
    - Create propagation conversion to full plant instance functionality
    - Build propagation success analytics display in Propagation tab with source type breakdown
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8, 4.9, 4.10_
  - [x] 10.3 Ensure there are no errors, there is proper test coverage, and all relevant tests pass for tasks 10.*

- [x] 11. Bottom Navigation and Tab Architecture
  - [x] 11.1 Implement core navigation components
    - Create BottomNavigation component with four tabs (Plants, Care, Propagation, Profile)
    - Build TabContainer component with state preservation and lazy loading
    - Implement smooth tab transitions with proper animations
    - Add active tab indicators and notification badges for overdue care
    - Create responsive navigation that adapts to different screen sizes
    - _Requirements: 7.1, 7.2, 7.7_

  - [x] 11.2 Build tab-specific dashboard components
    - Create CareDashboard with overdue, due today, and upcoming sections
    - Build PropagationDashboard with status-grouped propagations
    - Implement ProfileDashboard with user stats and settings access
    - Add quick action buttons and contextual navigation
    - Create modal and overlay system for maintaining navigation context
    - _Requirements: 3.6, 3.7, 4.6, 7.3, 7.4, 7.5, 7.6_

  - [x] 11.3 Implement modal system and navigation context preservation
    - Create modal components (full-screen, bottom sheet, centered) for different screen sizes
    - Implement proper back button behavior that returns to originating tab
    - Build deep linking support that maintains tab context
    - Add modal stack management for nested modals
    - Create tab state preservation when switching between tabs
    - _Requirements: 7.7, 7.8_
  - [x] 11.4 Ensure there are no errors, there is proper test coverage, and all relevant tests pass for tasks 11.*

- [x] 12. Mobile-Native PWA Implementation
  - [x] 12.1 Implement service worker and offline functionality
    - Create service worker for static asset caching
    - Implement offline data viewing with cached plant information
    - Build background sync for offline care logging
    - Add network status detection and offline indicators
    - Create automatic sync when connectivity returns
    - _Requirements: 8.2, 8.3, 8.4_

  - [x] 12.2 Build mobile-optimized interactions and PWA features
    - Enhance touch-friendly interface with proper sizing and safe areas
    - Add swipe gestures for plant card interactions and tab switching
    - Create "Fancy Planties" app installation prompts and standalone mode detection
    - Add haptic feedback and mobile-specific micro-animations
    - Implement advanced PWA features like background sync and push notifications
    - _Requirements: 8.1, 8.2, 8.5_
  - [x] 12.3 Ensure there are no errors, there is proper test coverage, and all relevant tests pass for tasks 12.*
- [x] 13. Search and Filter System
  - [x] 13.1 Implement advanced search functionality
    - Create multi-field search across plant data
    - Build filter system for location, care status, plant type
    - Implement search result highlighting and sorting
    - Add saved search and filter presets
    - _Requirements: 2.4_

  - [x] 13.2 Build search UI and user experience within tab context
    - Create search interface with autocomplete suggestions for Plants tab
    - Implement filter chips and quick filter options in tab headers
    - Build search history and recent searches with tab-specific memory
    - Add search result pagination and performance optimization within tabs
    - _Requirements: 2.4, 9.1, 9.2_
  - [x] 13.3 Ensure there are no errors, there is proper test coverage, and all relevant tests pass for tasks 13.*
- [x] 14. Database Schema Updates for Enhanced Features

  **Note**: The CSV import system is implemented as a user-facing interface in the Profile tab, not as a backend script. Users upload CSV files through the web interface, which processes them with proper authentication and user data segregation.
  - [x] 14.1 Update plant taxonomy schema
    - Add cultivar field to plants table as separate column from common_name
    - Update plant taxonomy validation to support new field structure
    - Create database migration to add cultivar column and migrate existing data
    - Update all plant-related queries to include cultivar field
    - _Requirements: 2.6_

  - [x] 14.2 Update propagation schema for external sources
    - Add source_type, external_source, and external_source_details fields to propagations table
    - Make parent_instance_id nullable to support external propagations
    - Create database migration to add new fields with default values
    - Update propagation queries and validation to support new source tracking
    - _Requirements: 4.8, 4.9, 4.10_

  - [x] 14.3 Update CSV import system for new taxonomy structure
    - Modify plant CSV import to handle separate cultivar field
    - Update propagation CSV import to support external source detection
    - Add data migration utilities for existing CSV data
    - Update import validation and conflict resolution for new fields
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 14.4 Update frontend components for new schema
    - Update PlantTaxonomyForm component to include separate cultivar field input
    - Modify PlantTaxonomySelector to search across cultivar field
    - Update PropagationForm to support source type selection (internal/external)
    - Add external source input fields to PropagationForm (gift, trade, purchase details)
    - Update PropagationCard to display source type indicators
    - Modify plant and propagation display components to show cultivar information
    - Update all forms and validation to work with new database schema
    - _Requirements: 2.6, 4.8, 4.9, 4.10_

  - [x] 14.5 Update CSV import UI for enhanced features
    - Enhance Profile tab import interface to support new taxonomy structure with cultivar field
    - Add import preview showing cultivar field mapping and validation
    - Update propagation import to detect and handle external sources automatically
    - Add user-friendly import validation messages for new fields and source types
    - Create downloadable import templates and examples for new schema structure
    - Build import progress tracking for new field processing
    - Add import conflict resolution UI for cultivar vs common_name field mapping
    - _Requirements: 6.1, 6.2, 6.3, 7.6_

  - [x] 14.6 Ensure frontend components work with updated schema
    - Test all plant forms with new cultivar field requirements
    - Verify propagation forms handle source type selection correctly
    - Test search functionality across all taxonomy fields including cultivar
    - Validate import UI works with new schema structure
    - Ensure all existing plant and propagation data displays correctly with new fields
    - Test CSV import end-to-end with new taxonomy and propagation source features
    - _Requirements: 2.6, 4.8, 4.9, 4.10, 6.1, 6.2, 6.3_

  - [x] 14.7 Ensure there are no errors, there is proper test coverage, and all relevant tests pass for tasks 14.*

- [ ] 15. Performance Optimization and Testing
  - [x] 15.1 Implement performance optimizations
    - Add code splitting and dynamic imports for large components
    - Optimize bundle size with tree shaking and compression
    - Implement image lazy loading and optimization
    - Add database query optimization and proper indexing
    - Create performance monitoring and metrics collection
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ] 15.2 Create comprehensive test suite
    - Expand existing test coverage to include all components and utilities
    - Write unit tests for React components using React Testing Library
    - Create integration tests for API routes and database operations
    - Build end-to-end tests for critical user flows using Cypress
    - Add authentication flow testing and security validation
    - Create comprehensive CSV import testing with sample data
    - Organize all tests into a directory that vs-code can easily recognize as the test folder
    - Ensure all tests pass and maintain high coverage standards
    - _Requirements: All requirements validation_

- [ ] 16. Production Readiness and Deployment
  - [x] 16.1 Configure production environment and security
    - Setup production Docker configuration with security hardening
    - Implement environment-specific configuration management
    - Add comprehensive error logging and monitoring
    - Configure security headers for reverse proxy deployment
    - Create backup and recovery procedures
    - _Requirements: 1.3, 9.4_

  - [ ] 16.2 Prepare deployment and documentation
    - Create deployment scripts and docker-compose configuration
    - Build user documentation and getting started guide
    - Create API documentation for future extensions
    - Add contributor guidelines and development setup instructions
    - Configure application for reverse proxy deployment
    - _Requirements: 9.5_
  - [ ] 16.3 Ensure there are no errors, there is proper test coverage, and all relevant tests pass for tasks 16.*