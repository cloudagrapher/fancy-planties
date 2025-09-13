# Fancy Planties 🌱

A comprehensive plant management Progressive Web Application (PWA) built with Next.js 15, featuring mobile-native bottom navigation and offline capabilities. Track your plant collection, care schedules, propagations, and more with an intuitive, touch-optimized interface.

## ✨ Features

### 🌿 Plant Management

- **Plant Collection**: Organize your plants with detailed taxonomy (family, genus, species, cultivar)
- **Plant Instances**: Track individual plants with custom nicknames, locations, and care history
- **Smart Search**: Fuzzy search across all plant data with autocomplete suggestions
- **Image Gallery**: Upload and manage multiple photos per plant with Base64 storage

### 📅 Care Tracking

- **Care Dashboard**: Visual overview of overdue, due today, and upcoming care tasks
- **Fertilizer Scheduling**: Automated scheduling with customizable intervals
- **Care History**: Complete timeline of all care activities
- **Quick Actions**: Fast care logging with one-tap actions

### 🌱 Propagation Management

- **Flexible Sources**: Track propagations from your plants OR external sources (gifts, trades, purchases)
- **Status Tracking**: Monitor progress through rooting, planting, and establishment stages
- **Success Analytics**: View propagation success rates and timing statistics
- **Plant Conversion**: Convert successful propagations to full plant instances

### 📱 Mobile-Native Experience

- **Bottom Navigation**: Native app-like navigation with Plants, Care, Propagation, and Profile tabs
- **PWA Features**: Install as native app with offline support and push notifications
- **Touch Optimized**: Swipe gestures, haptic feedback, and thumb-friendly design
- **Responsive Design**: Seamless experience across mobile, tablet, and desktop

### 📊 Data Management

- **CSV Import/Export**: Bulk import existing plant data from spreadsheets
- **User Authentication**: Secure account system with data segregation
- **Admin Dashboard**: Curator-level administrative interface for user and plant management
- **Offline Support**: View and log care activities without internet connection
- **Backup & Sync**: Automatic data synchronization when connectivity returns

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- Git

### Development Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd fancy-planties
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Setup environment**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Choose your development approach:**

   #### Option A: Local Development (Recommended)

   Run the app locally with containerized database:

   ```bash
   # Start only the database (maps port 5433 externally to 5432 internally)
   docker compose -f docker-compose.dev.yml --env-file .env.local up -d postgres

   # Generate migration files from schema (first time only)
   npm run db:generate:local

   # Run database migrations using local environment (.env.local)
   npm run db:migrate:local

   # Seed database with plant taxonomy data (optional but recommended)
   npm run db:seed

   # Start development server locally
   npm run dev
   ```

   **Important**: Ensure your `.env.local` file has the correct DATABASE_URL:
   ```bash
   # For development with Docker on port 5433
   DATABASE_URL=postgresql://postgres:simple_password_123@localhost:5433/fancy_planties
   ```

   #### Option B: Fully Containerized Development

   Run both app and database in containers:

   ```bash
   # Start entire development environment
   docker compose -f docker-compose.dev.yml up
   
   # Or run in background
   docker compose -f docker-compose.dev.yml up -d
   ```

   #### Option C: Production-like Environment

   Test with production configuration:

   ```bash
   # Requires .env file with production variables
   docker compose -f docker-compose.prod.yml up -d
   ```

5. **Available Docker Compose Files:**
   - `docker-compose.dev.yml` - Development environment (database on port 5433)
   - `docker-compose.prod.yml` - Production environment with migrations
   - `docker-compose.yml` - Default production setup
   - `docker-compose.watchtower.yml` - Production with auto-updates

6. **Managing Docker Environments:**

   ```bash
   # Stop development environment
   docker compose -f docker-compose.dev.yml down
   
   # Stop and remove volumes (clears database data)
   docker compose -f docker-compose.dev.yml down -v
   
   # View logs
   docker compose -f docker-compose.dev.yml logs -f
   
   # Restart specific service
   docker compose -f docker-compose.dev.yml restart postgres
   ```

7. **Environment-Aware Database Configuration**

   The application now supports environment-specific database commands that automatically load the correct configuration:

   ```bash
   # Local development (uses .env.local)
   npm run db:generate:local   # Generate migrations for localhost:5433
   npm run db:migrate:local    # Apply migrations to localhost:5433
   npm run db:studio:local     # Open studio connected to localhost:5433
   npm run db:push:local       # Push schema to localhost:5433

   # Production (uses .env.prod)
   npm run db:generate:prod    # Generate migrations for postgres:5432
   npm run db:migrate:prod     # Apply migrations to postgres:5432 (Docker hostname)
   npm run db:studio:prod      # Open studio connected to postgres:5432
   npm run db:push:prod        # Push schema to postgres:5432

   # Auto-detection (fallback behavior)
   npm run db:generate         # Uses NODE_ENV or falls back to .env.prod
   npm run db:migrate          # Same auto-detection logic
   npm run db:studio           # Same auto-detection logic
   npm run db:push             # Same auto-detection logic
   ```

   **Environment Files**:
   - `.env.local` → `localhost:5433` (for local development with Docker)
   - `.env.prod` → `postgres:5432` (for Docker Compose environments)
   - `.env` → Fallback configuration

8. **Open the application**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - Create an account and start adding plants!

### CI/CD Skip Instructions

To save CI/CD resources when making documentation-only changes, you can skip builds by starting your commit message with specific keywords:

**Skip Keywords:**
- `[skip ci]` or `[ci skip]` - Standard CI skip patterns
- `[skip build]` or `[build skip]` - Explicit build skip
- `[docs]` - For documentation-only changes
- `[readme]` - For README updates

**Usage Examples:**
```bash
git commit -m "[readme] Update development setup instructions"
git commit -m "[docs] Fix typo in API documentation" 
git commit -m "[skip build] Minor formatting changes"
git commit -m "Add new plant feature"  # Normal build
```

The workflow will still run for pull requests to validate changes, but won't push new Docker images unnecessarily.

### Production Deployment

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for comprehensive deployment instructions.

## 📖 Documentation

- [**Getting Started Guide**](./docs/GETTING_STARTED.md) - Detailed setup and first steps
- [**Deployment Guide**](./docs/DEPLOYMENT.md) - Production deployment instructions
- [**API Documentation**](./docs/API.md) - REST API reference
- [**Contributing Guide**](./docs/CONTRIBUTING.md) - Development guidelines
- [**Architecture Overview**](./docs/ARCHITECTURE.md) - Technical architecture details

## 🛠️ Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Framework** | Next.js 15 App Router | React framework with SSR and static generation |
| **Database** | PostgreSQL + Drizzle ORM | Relational database with type-safe queries |
| **Authentication** | Lucia Auth | Session-based authentication |
| **Email Service** | Resend | Transactional email delivery for verification |
| **Styling** | Tailwind CSS v4 | Utility-first CSS framework |
| **PWA** | next-pwa | Progressive Web App features |
| **Testing** | Jest + Cypress | Unit, integration, and E2E testing |
| **Deployment** | Docker + Nginx | Containerized deployment with reverse proxy |

## 📱 Mobile App Installation

### iOS (Safari)

1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Tap "Add" to install

### Android (Chrome)

1. Open the app in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home screen"
4. Tap "Add" to install

### Desktop (Chrome/Edge)

1. Look for the install icon in the address bar
2. Click "Install Fancy Planties"
3. The app will open in its own window

## 🧪 Testing

Our comprehensive testing suite includes unit tests, integration tests, and end-to-end tests with optimized parallel execution for faster development cycles. The testing approach focuses on user workflows and behavior rather than implementation details.

### Test Execution

```bash
# Run all tests with parallel execution
npm test

# Specific test suites
npm test -- src/__tests__/api/plant-management.test.js
npm test -- src/__tests__/integration/
npm test -- src/__tests__/components/

# E2E tests
npm run test:e2e

# Test coverage with detailed reporting
npm run test:coverage

# Watch mode for development
npm run test:watch

# Email verification specific tests
npm test -- --testPathPattern="email" --verbose

# Run tests with specific patterns
npm test -- --testNamePattern="should create plant instance"
```

### Testing Architecture

Our testing strategy follows a hierarchical approach:

- **Integration Tests (60%)**: Complete user workflows and end-to-end functionality
- **API Tests (25%)**: Endpoint validation, authentication, and data handling
- **Component Tests (15%)**: User interactions, form validation, and error handling

### Key Testing Principles

- **Client/Server Separation**: Server components are tested through integration tests and API endpoints, not direct rendering
- **User-Focused**: Tests simulate real user interactions rather than testing implementation details
- **Reliable Patterns**: Consistent test utilities and factories ensure maintainable, non-flaky tests
- **Performance Optimized**: Parallel execution and proper cleanup for fast feedback cycles
- **Mock Strategy**: Proper separation of auth functions (`validateRequest` vs `validateVerifiedRequest`)
- **Response Format Validation**: Tests verify actual API response structures and data serialization

### Test Performance Optimization

The test suite is configured for optimal performance:

- **Parallel Execution**: Uses 50% of CPU cores locally, 2 workers in CI
- **Memory Management**: 512MB worker memory limit prevents memory leaks
- **Test Isolation**: Proper cleanup between tests with resetMocks/clearMocks
- **Fast Feedback**: Bail on first failure in CI environments
- **Caching**: Jest cache enabled for faster subsequent runs

### Test Coverage Requirements

- **Minimum Coverage**: 80% across branches, functions, lines, and statements
- **Coverage Reports**: Available in text, LCOV, and HTML formats
- **Coverage Location**: `./coverage/` directory with detailed HTML reports

### Testing Documentation

- **[Testing Guide](./docs/TESTING_GUIDE.md)**: Comprehensive patterns and best practices
- **[Quick Reference](./docs/TESTING_QUICK_REFERENCE.md)**: Common commands and templates
- **[Test Maintenance](./docs/TEST_MAINTENANCE.md)**: Debugging and maintenance procedures

## 📊 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build production application |
| `npm run start` | Start production server |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run db:generate` | Generate migration files from schema changes (environment auto-detected) |
| `npm run db:generate:local` | Generate migrations using .env.local |
| `npm run db:generate:prod` | Generate migrations using .env.prod |
| `npm run db:migrate` | Run database migrations (environment auto-detected) |
| `npm run db:migrate:local` | Run migrations using .env.local (local development) |
| `npm run db:migrate:prod` | Run migrations using .env.prod (production) |
| `npm run db:push` | Push schema changes directly (environment auto-detected) |
| `npm run db:push:local` | Push schema changes using .env.local |
| `npm run db:push:prod` | Push schema changes using .env.prod |
| `npm run db:studio` | Open Drizzle Studio (environment auto-detected) |
| `npm run db:studio:local` | Open Drizzle Studio using .env.local |
| `npm run db:studio:prod` | Open Drizzle Studio using .env.prod |
| `npm run db:seed` | Seed database with initial plant taxonomy data |
| `npm run deploy:production` | Deploy to production |
| `npm run backup:create` | Create database backup |

### Admin Features

The application includes a comprehensive admin dashboard for users with curator privileges:

- **Admin Dashboard**: Access via `/admin` route (curator privileges required)
- **Analytics & Insights**: Comprehensive dashboard statistics, user growth trends, and plant submission analytics
- **User Management**: View and manage user accounts and curator privileges
- **Plant Management**: Oversee plant taxonomy and approve user submissions
- **System Monitoring**: Email verification system monitoring, system health alerts, and curator activity tracking
- **Audit Logging**: Complete audit trail of all administrative actions with detailed tracking
- **Access Control**: Route-level protection with real-time privilege validation

**Admin Access**: Users with curator privileges can access the admin dashboard through the main navigation. The system includes proper authorization checks and graceful handling of privilege changes.

**Analytics Features**: The admin dashboard provides detailed insights including user statistics, plant submission trends, top plant families by usage, curator activity summaries, and system health monitoring with automated alerts.

**Audit Trail**: All administrative actions are logged with comprehensive details including action type, affected entities, performer information, timestamps, IP addresses, and success/failure status for complete accountability and security monitoring.

## 🔒 Security Features

- **Authentication**: Secure session-based auth with bcrypt password hashing
- **Email Verification**: Required email verification for new accounts with secure 6-digit codes
- **Role-Based Access**: Curator privileges for administrative functions with route protection
- **Data Isolation**: Row-level security ensures user data segregation
- **Security Headers**: Comprehensive security headers via Nginx
- **Input Validation**: Zod schema validation on all inputs
- **HTTPS**: SSL/TLS encryption in production
- **Rate Limiting**: API rate limiting to prevent abuse
- **Admin Security**: Protected admin routes with curator session validation

## 🌍 Browser Support

- **Mobile**: iOS Safari 14+, Android Chrome 90+
- **Desktop**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **PWA**: Full PWA support on all modern browsers

## 📈 Performance

- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s  
- **Time to Interactive**: < 3.5s
- **Bundle Size**: < 250KB gzipped
- **Lighthouse Score**: 95+ across all metrics

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./docs/CONTRIBUTING.md) for details on:

- Development setup
- Code style guidelines
- Testing requirements
- Pull request process

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/fancy-planties/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/fancy-planties/discussions)
- **Documentation**: [Project Wiki](https://github.com/your-repo/fancy-planties/wiki)

## 🙏 Acknowledgments

- Plant taxonomy data structure inspired by botanical standards
- PWA implementation following Google's best practices
- Mobile-first design principles from Material Design and iOS HIG
- Security practices based on OWASP recommendations

---

**Happy Plant Parenting! 🌱✨**
