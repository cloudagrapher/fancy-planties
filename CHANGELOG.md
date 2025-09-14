# Changelog

All notable changes to Fancy Planties will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Production deployment configuration with Docker and Nginx
- Comprehensive security headers and SSL/TLS support
- Database backup and restore scripts
- Application monitoring and logging system
- Health check endpoint with performance metrics
- Complete documentation suite (API, deployment, contributing, architecture)
- **Performance Testing Framework**: Enhanced testing suite with comprehensive performance benchmarking
  - Added performance test patterns for API response times, memory usage, and database query optimization
  - Implemented bundle size monitoring and regression detection
  - Created benchmark comparison testing for component rendering performance
  - Added performance test configuration with appropriate timeouts and resource limits

### Enhanced
- **CSV Import for Propagations**: Enhanced CSV import functionality with improved form UX
  - Better validation and error handling for propagation data imports
  - Improved user experience during import process
- **Plant Instances**: Implemented infinite scrolling for plant instances to improve performance with large collections

### Fixed
- **Mobile Responsive Design**: Applied comprehensive mobile optimizations to care page similar to propagation page improvements
  - Implemented dual layout system (mobile/desktop) for CareTaskCard component
  - Added touch-friendly interactions with proper button sizing (36px minimum height)
  - Optimized quick actions grid with better spacing and responsive breakpoints
  - Improved tab system with horizontal scrolling and shortened labels for mobile
  - Enhanced text handling with truncation and responsive sizing
  - Fixed overflow issues preventing buttons from being cut off on mobile viewports
  - Enhanced responsive design for plant search and propagation cards
- **Handbook Image Upload**: Fixed validation error in care guide creation where File objects were being sent instead of Base64 strings
  - Added proper File-to-Base64 conversion in form submission handler
  - Ensures compatibility with JSONB images field in database schema
  - Resolves "Invalid input: expected string, received object" validation errors

## [0.1.0] - 2025-09-07

### Added
- Initial release of Fancy Planties PWA
- Mobile-native bottom navigation with four main tabs
- User authentication system with Lucia Auth
- Plant taxonomy management with separate cultivar field
- Plant instance tracking with care schedules
- Enhanced propagation management with external source support
- Care dashboard with overdue, due today, and upcoming tasks
- Image management system with Base64 storage
- CSV import/export functionality for plant data
- Advanced search and filtering across all plant data
- Progressive Web App features with offline support
- Comprehensive test suite with Jest and Cypress
- Docker development environment

### Features

#### Plant Management
- Plant collection with detailed taxonomy (family, genus, species, cultivar, common name)
- Individual plant instances with nicknames, locations, and custom care schedules
- Smart plant taxonomy selector with autocomplete and "add new" functionality
- Fuzzy search across all taxonomy fields
- Plant activation/deactivation for collection management

#### Care Tracking
- Automated fertilizer scheduling with customizable intervals
- Care history timeline with all fertilizer and repotting events
- Visual care status indicators (overdue, due today, upcoming)
- Quick care logging with one-tap actions
- Care dashboard organized by urgency levels

#### Propagation Management
- Flexible propagation sources (internal plants or external sources)
- Status tracking through rooting, planting, and establishment stages
- External source tracking for gifts, trades, and purchases
- Propagation success analytics and timing statistics
- Conversion of successful propagations to full plant instances

#### Mobile Experience
- Bottom navigation with Plants, Care, Propagation, and Profile tabs
- Touch-optimized interface with proper sizing and gestures
- PWA installation support for native app experience
- Offline functionality with data synchronization
- Pull-to-refresh and infinite scroll capabilities

#### Data Management
- CSV import for plant lists, care schedules, and propagations
- Data export functionality for backup purposes
- User data segregation with row-level security
- Automatic data validation and conflict resolution

### Technical Implementation
- Next.js 15 App Router with TypeScript
- PostgreSQL database with Drizzle ORM
- Tailwind CSS v4 for styling
- React Query for state management
- Jest and Cypress for testing
- Docker Compose for development

### Security
- Session-based authentication with secure password hashing
- Row-level security policies for user data isolation
- Input validation with Zod schemas
- CSRF protection and rate limiting
- Security headers for production deployment

### Performance
- Code splitting and dynamic imports
- Image optimization and compression
- Service worker caching for offline support
- Database query optimization with proper indexing
- Bundle size optimization under 250KB gzipped

## [0.0.1] - 2025-09-06

### Added
- Initial project setup
- Basic Next.js configuration
- Database schema design
- Authentication foundation

---

## Release Notes

### Version 0.1.0 Highlights

This initial release establishes Fancy Planties as a comprehensive plant management solution with a focus on mobile-first design and user experience. Key achievements include:

**Mobile-Native Design**: The bottom navigation architecture provides a native app experience that works seamlessly across all devices while maintaining the flexibility of a web application.

**Comprehensive Plant Management**: From basic plant collection to detailed care scheduling and propagation tracking, the app covers the full lifecycle of plant care.

**Data Flexibility**: The enhanced taxonomy system with separate cultivar fields and flexible propagation sources accommodates real-world plant collecting scenarios.

**Production Ready**: Complete deployment infrastructure with security hardening, monitoring, and backup procedures ensures the application is ready for production use.

**Developer Experience**: Comprehensive documentation, testing suite, and development tools make the codebase maintainable and extensible.

### Breaking Changes

None in this initial release.

### Migration Guide

This is the initial release, so no migration is required.

### Known Issues

- Image storage uses Base64 encoding (will migrate to file storage in future versions)
- Offline sync is basic (will be enhanced with conflict resolution)
- No push notifications yet (planned for future release)

### Deprecations

None in this release.

### Security Updates

- Implemented comprehensive security headers
- Added rate limiting for API endpoints
- Configured SSL/TLS for production deployment
- Enabled row-level security for all user data

### Performance Improvements

- Optimized database queries with proper indexing
- Implemented code splitting for reduced bundle size
- Added service worker caching for offline performance
- Configured image compression for faster loading

---

For detailed technical changes, see the [commit history](https://github.com/your-repo/fancy-planties/commits/main).