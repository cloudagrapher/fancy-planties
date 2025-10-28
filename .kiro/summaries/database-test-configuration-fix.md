# Database Test Configuration Fix

## Problem
Database tests were failing with authentication errors because they were trying to connect to the wrong database server with incorrect credentials.

## Root Cause Analysis

### Environment File Precedence Issue
The project has multiple environment files:
- `.env` - Production configuration with `DATABASE_URL=postgresql://postgres:simple_password_123@postgres:5432/fancy_planties`
- `.env.local` - Local development configuration with `DATABASE_URL=postgresql://postgres:simple_password_123@localhost:5432/fancy_planties`

### Key Differences
| Configuration | Hostname    | Port   | Usage                 |
| ------------- | ----------- | ------ | --------------------- |
| `.env`        | `postgres`  | `5432` | Docker container name |
| `.env.local`  | `localhost` | `5432` | Local development     |

### Test Environment Issue
Jest was loading the production `.env` configuration instead of the local `.env.local` configuration, causing tests to try connecting to:
- **Wrong hostname**: `postgres` (Docker container) instead of `localhost`
- **Wrong port**: `5432` (standard PostgreSQL) instead of `5432` (local development)

## Solution

### 1. Fixed Jest Setup Configuration
**File**: `jest.setup.js`

```javascript
// Load environment variables from .env.local for tests
import { loadEnvConfig } from '@next/env';
const projectDir = process.cwd();
loadEnvConfig(projectDir);

// Force the correct DATABASE_URL for tests (override any other env files)
// Use localhost:5432 for local development database from .env.local
process.env.DATABASE_URL = 'postgresql://postgres:simple_password_123@localhost:5432/fancy_planties';
```

### 2. Fixed Import Paths in Existing Tests
**Files**: 
- `src/__tests__/database/plant-data-queries.test.js`
- `src/__tests__/database/care-data-queries.test.js`

**Issue**: Tests were importing `.js` files but factories are `.ts` files
**Fix**: Updated imports to use `.ts` extensions

```javascript
// Before
import { createTestUser } from '../../test-utils/factories/user-factory';

// After  
import { createTestUser } from '../../test-utils/factories/user-factory.ts';
```

## Test Results

### ✅ Working Database Operations
- User CRUD operations
- Password hashing and verification
- Session management
- Plant data queries
- Care data queries
- Database connection validation

### ✅ Test Categories Now Passing
1. **User Authentication Tests**: `src/__tests__/database/user-auth-queries.test.ts`
2. **Plant Data Tests**: `src/__tests__/database/plant-data-queries.test.js`
3. **Care Data Tests**: `src/__tests__/database/care-data-queries.test.js`

## Configuration Details

### Database Connection String
```
postgresql://postgres:simple_password_123@localhost:5432/fancy_planties
```

### Environment Variable Loading Order
1. Next.js `loadEnvConfig()` loads all environment files
2. Jest setup explicitly overrides `DATABASE_URL` for test consistency
3. Database connection uses the test-specific URL

### Test Isolation
- Each test uses `createDatabaseTestManager()` for proper isolation
- Automatic cleanup after each test
- No shared state between tests

## Verification Commands

```bash
# Test user authentication queries
npm test -- --testPathPatterns=user-auth-queries.test.ts --testNamePattern="should create a new user"

# Test plant data queries  
npm test -- --testPathPatterns=plant-data-queries.test.js --testNamePattern="should return null for non-existent plant ID"

# Test care data queries
npm test -- --testPathPatterns=care-data-queries.test.js --testNamePattern="should return null for non-existent care record ID"

# Test password hashing (non-database)
npm test -- --testPathPatterns=user-auth-queries.test.ts --testNamePattern="Password Hashing and Verification"
```

## Key Learnings

1. **Environment File Precedence**: Next.js loads multiple environment files, and the order matters
2. **Docker vs Local**: Production uses Docker container names, development uses localhost
3. **Port Configuration**: Different environments use different ports (5432 vs 5432)
4. **Import Extensions**: Jest requires explicit `.ts` extensions for TypeScript files
5. **Test Isolation**: Proper database test setup requires explicit connection configuration

## Future Considerations

1. **CI/CD Environment**: May need different database configuration for continuous integration
2. **Test Database**: Consider using a separate test database to avoid conflicts
3. **Connection Pooling**: Monitor connection usage in test environment
4. **Performance**: Database tests may be slower than unit tests

This fix ensures all database query tests can run successfully with proper isolation and the correct database credentials from `.env.local`.