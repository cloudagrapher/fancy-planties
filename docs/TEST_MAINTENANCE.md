# Test Maintenance and Debugging Guide

## Overview

This guide provides comprehensive instructions for maintaining, debugging, and troubleshooting the test suite. It covers common issues, debugging techniques, and procedures for adding new tests while maintaining system reliability.

## Common Test Issues and Solutions

### Build and Configuration Issues

#### Issue: "Cannot resolve module" errors

**Symptoms:**
```
Module not found: Can't resolve '@/test-utils'
```

**Causes:**
- Missing module path mapping in Jest config
- Incorrect import paths
- Missing dependencies

**Solutions:**
```javascript
// 1. Check jest.config.js moduleNameMapper
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
}

// 2. Verify import paths are correct
import { createTestUser } from '@/test-utils/factories'; // ✅ Correct
import { createTestUser } from '../test-utils/factories'; // ❌ Avoid relative paths

// 3. Install missing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

#### Issue: "server-only" module errors in tests

**Symptoms:**
```
Error: This module cannot be imported from a Client Component module
```

**Causes:**
- Client components importing server-only modules
- Test environment not properly mocking server modules

**Solutions:**
```javascript
// 1. Mock server modules in test setup
// jest.setup.js
jest.mock('@/lib/db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

// 2. Use proper test boundaries
// Don't test server components directly in jsdom environment
// Instead, test through API endpoints or use separate server test environment
```

#### Issue: Next.js App Router compatibility

**Symptoms:**
```
Error: useRouter() should be used inside <Router>
```

**Solutions:**
```javascript
// Mock Next.js router in test setup
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/test-path',
  useSearchParams: () => new URLSearchParams(),
}));
```

### Database and Authentication Issues

#### Issue: Database connection errors in tests

**Symptoms:**
```
Error: Connection terminated unexpectedly
Error: Database is not available
```

**Causes:**
- Database not properly mocked in test environment
- Real database connections in test environment
- Improper test isolation

**Solutions:**
```javascript
// 1. Use database test manager for proper isolation
import { createTestContext } from '@/test-utils/setup';

describe('Database Tests', () => {
  let testContext;

  beforeEach(async () => {
    testContext = await createTestContext();
  });

  afterEach(async () => {
    await cleanupTestContext(testContext);
  });
});

// 2. Mock database operations for unit tests
jest.mock('@/lib/db/queries/plant-instances', () => ({
  getUserPlants: jest.fn(),
  createPlantInstance: jest.fn(),
}));
```

#### Issue: Authentication state pollution between tests

**Symptoms:**
- Tests passing individually but failing when run together
- Unexpected authentication states
- Session persistence between tests

**Solutions:**
```javascript
// 1. Clear authentication state in beforeEach
beforeEach(async () => {
  // Clear any existing auth state
  await clearAuthState();
  jest.clearAllMocks();
});

// 2. Use isolated test users
it('should authenticate user', async () => {
  const testUser = await createTestUser({
    email: `test-${Date.now()}@example.com`, // Unique email
  });
  // Test with isolated user
});

// 3. Proper cleanup in afterEach
afterEach(async () => {
  await cleanupTestUsers();
  await clearSessions();
});
```

### Component Testing Issues

#### Issue: Component not rendering in tests

**Symptoms:**
```
TestingLibraryElementError: Unable to find an element
```

**Causes:**
- Missing providers (auth, query client, etc.)
- Async rendering not properly awaited
- Component dependencies not mocked

**Solutions:**
```javascript
// 1. Use renderWithProviders helper
import { renderWithProviders } from '@/test-utils/helpers';

const { getByText } = renderWithProviders(<MyComponent />);

// 2. Wait for async rendering
import { waitFor } from '@testing-library/react';

await waitFor(() => {
  expect(getByText('Expected Text')).toBeInTheDocument();
});

// 3. Mock required dependencies
jest.mock('@/hooks/usePlantInstances', () => ({
  usePlantInstances: () => ({
    data: mockPlantData,
    isLoading: false,
    error: null,
  }),
}));
```

#### Issue: Form submission tests failing

**Symptoms:**
- Form submissions not triggering
- Validation errors not appearing
- Mock functions not being called

**Solutions:**
```javascript
// 1. Use proper user interactions
import { userEvent } from '@testing-library/user-event';

const user = userEvent.setup();

// Fill form fields
await user.type(screen.getByLabelText(/name/i), 'Test Name');
await user.click(screen.getByRole('button', { name: /submit/i }));

// 2. Wait for form submission
await waitFor(() => {
  expect(mockOnSubmit).toHaveBeenCalledWith(expectedData);
});

// 3. Check for validation errors
expect(screen.getByText(/required field/i)).toBeInTheDocument();
```

### API Testing Issues

#### Issue: API mocks not working

**Symptoms:**
- Real API calls being made in tests
- Unexpected network errors
- Tests failing due to external dependencies

**Solutions:**
```javascript
// 1. Proper API mocking setup
import { setupApiMocks } from '@/test-utils/mocks';

beforeEach(() => {
  setupApiMocks();
});

// 2. Mock specific endpoints
jest.mock('node-fetch', () => jest.fn());
const mockFetch = require('node-fetch');

mockFetch.mockResolvedValueOnce({
  ok: true,
  json: async () => ({ data: mockData }),
});

// 3. Use MSW for comprehensive API mocking
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/plants', (req, res, ctx) => {
    return res(ctx.json({ data: mockPlants }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Debugging Techniques

### Test Debugging Workflow

1. **Isolate the Problem**
   ```bash
   # Run single test file
   npm test -- PlantForm.test.tsx
   
   # Run specific test
   npm test -- --testNamePattern="should submit form"
   
   # Run with verbose output
   npm test -- --verbose
   ```

2. **Add Debug Information**
   ```javascript
   // Add console.log for debugging
   it('should submit form', async () => {
     console.log('Test starting...');
     
     const { getByText } = renderWithProviders(<PlantForm />);
     console.log('Component rendered');
     
     // Add screen.debug() to see current DOM
     screen.debug();
     
     // Test implementation
   });
   ```

3. **Use Jest Debug Mode**
   ```bash
   # Debug with Node inspector
   node --inspect-brk node_modules/.bin/jest --runInBand --no-cache PlantForm.test.tsx
   ```

### Common Debugging Commands

```bash
# Run tests with coverage to see what's not being tested
npm test -- --coverage

# Run tests in watch mode for rapid iteration
npm test -- --watch

# Run tests with detailed error output
npm test -- --verbose --no-coverage

# Clear Jest cache if seeing stale results
npm test -- --clearCache

# Run tests in band (no parallel execution) for debugging
npm test -- --runInBand
```

### Using Test Utilities for Debugging

```javascript
// Use test error reporter for detailed failure analysis
import { reportTestError } from '@/test-utils/debugging';

it('should handle complex scenario', async () => {
  try {
    // Test implementation
  } catch (error) {
    reportTestError(error, {
      testName: 'complex scenario',
      context: { userId: testUser.id, plantId: testPlant.id },
    });
    throw error;
  }
});

// Use performance monitor to identify slow tests
import { monitorTestPerformance } from '@/test-utils/performance';

describe('Performance Tests', () => {
  beforeEach(() => {
    monitorTestPerformance.start();
  });

  afterEach(() => {
    const metrics = monitorTestPerformance.end();
    if (metrics.duration > 5000) {
      console.warn(`Slow test detected: ${metrics.duration}ms`);
    }
  });
});
```

## Adding New Tests

### Before Adding Tests

1. **Identify Test Type**
   - Integration test for user workflows
   - Component test for UI behavior
   - API test for endpoint functionality
   - Database test for query logic

2. **Check Existing Coverage**
   ```bash
   npm test -- --coverage
   # Review coverage report to identify gaps
   ```

3. **Plan Test Structure**
   - What user behavior are you testing?
   - What are the success and failure scenarios?
   - What dependencies need to be mocked?

### Adding Integration Tests

```javascript
// Template for new integration test
describe('New Feature Integration', () => {
  let testContext;
  let testUser;

  beforeEach(async () => {
    testContext = await createTestContext();
    testUser = await createAuthenticatedUser();
  });

  afterEach(async () => {
    await cleanupTestContext(testContext);
  });

  it('should complete primary user workflow', async () => {
    // 1. Setup test data
    const testData = createTestData();

    // 2. Execute user actions
    const result = await performUserAction(testData);

    // 3. Verify expected outcomes
    expect(result).toMatchExpectedBehavior();

    // 4. Verify side effects
    const sideEffects = await checkSideEffects();
    expect(sideEffects).toBeCorrect();
  });

  it('should handle error conditions gracefully', async () => {
    // Test error scenarios
  });
});
```

### Adding Component Tests

```javascript
// Template for new component test
import { renderWithProviders, userEvent, screen } from '@/test-utils';
import { NewComponent } from '@/components/NewComponent';

describe('NewComponent', () => {
  const defaultProps = {
    onAction: jest.fn(),
    data: createTestData(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with required props', () => {
    renderWithProviders(<NewComponent {...defaultProps} />);
    
    expect(screen.getByText(/expected content/i)).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewComponent {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /action/i }));

    expect(defaultProps.onAction).toHaveBeenCalledWith(expectedData);
  });

  it('should handle error states', () => {
    const errorProps = { ...defaultProps, error: 'Test error' };
    renderWithProviders(<NewComponent {...errorProps} />);

    expect(screen.getByText(/test error/i)).toBeInTheDocument();
  });
});
```

### Adding API Tests

```javascript
// Template for new API test
describe('New API Endpoint', () => {
  let testContext;
  let testUser;

  beforeEach(async () => {
    testContext = await createTestContext();
    testUser = await createAuthenticatedUser();
  });

  afterEach(async () => {
    await cleanupTestContext(testContext);
  });

  describe('POST /api/new-endpoint', () => {
    it('should process valid requests', async () => {
      const requestData = createValidRequestData();

      const response = await testContext.apiClient
        .post('/api/new-endpoint')
        .set('Authorization', `Bearer ${testUser.sessionToken}`)
        .send(requestData)
        .expect(200);

      expect(response.body.data).toMatchObject(expectedResponse);
    });

    it('should validate request data', async () => {
      const invalidData = createInvalidRequestData();

      const response = await testContext.apiClient
        .post('/api/new-endpoint')
        .set('Authorization', `Bearer ${testUser.sessionToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should require authentication', async () => {
      const requestData = createValidRequestData();

      await testContext.apiClient
        .post('/api/new-endpoint')
        .send(requestData)
        .expect(401);
    });
  });
});
```

## Test Maintenance Procedures

### Regular Maintenance Tasks

#### Weekly Tasks
1. **Review Test Performance**
   ```bash
   npm test -- --verbose | grep "Time:"
   # Identify and optimize slow tests
   ```

2. **Check Coverage Trends**
   ```bash
   npm test -- --coverage
   # Ensure coverage isn't declining
   ```

3. **Update Test Data**
   - Review test factories for realistic data
   - Update mock responses to match API changes
   - Refresh test user data

#### Monthly Tasks
1. **Dependency Updates**
   ```bash
   npm audit
   npm update @testing-library/react @testing-library/jest-dom
   ```

2. **Test Suite Optimization**
   - Remove obsolete tests
   - Consolidate duplicate test logic
   - Update test utilities

3. **Documentation Review**
   - Update test patterns documentation
   - Review and update this maintenance guide
   - Document new testing patterns

### Handling Test Failures in CI/CD

#### Immediate Response
1. **Check if failure is environmental**
   ```bash
   # Re-run tests locally
   npm test
   
   # Check for flaky tests
   npm test -- --runInBand
   ```

2. **Identify root cause**
   - Review error messages and stack traces
   - Check recent code changes
   - Verify test environment setup

3. **Quick fixes for common issues**
   ```bash
   # Clear caches
   npm test -- --clearCache
   
   # Update snapshots if needed
   npm test -- --updateSnapshot
   
   # Check for timing issues
   npm test -- --runInBand --verbose
   ```

#### Long-term Solutions
1. **Improve test reliability**
   - Add proper wait conditions
   - Improve test isolation
   - Mock external dependencies

2. **Enhance error reporting**
   - Add more context to assertions
   - Implement better error messages
   - Use test debugging utilities

### Refactoring Tests

#### When to Refactor
- Tests are brittle and break frequently
- Test setup is overly complex
- Tests are slow or resource-intensive
- Test code is duplicated across files

#### Refactoring Process
1. **Identify patterns**
   ```javascript
   // Before: Duplicated setup
   describe('Component A', () => {
     beforeEach(() => {
       // Complex setup code
     });
   });

   describe('Component B', () => {
     beforeEach(() => {
       // Same complex setup code
     });
   });

   // After: Shared utility
   import { setupComponentTest } from '@/test-utils/helpers';

   describe('Component A', () => {
     beforeEach(() => setupComponentTest());
   });
   ```

2. **Extract common utilities**
   - Move repeated setup to test utilities
   - Create reusable assertion helpers
   - Standardize mock configurations

3. **Improve test structure**
   - Group related tests logically
   - Use consistent naming patterns
   - Simplify test data creation

## Performance Optimization

### Identifying Performance Issues

```bash
# Run tests with timing information
npm test -- --verbose

# Profile test execution
npm test -- --detectOpenHandles --forceExit

# Monitor memory usage
npm test -- --logHeapUsage
```

### Optimization Strategies

1. **Parallel Execution**
   ```javascript
   // jest.config.js
   module.exports = {
     maxWorkers: '50%', // Use half of available cores
     workerIdleMemoryLimit: '512MB',
   };
   ```

2. **Efficient Test Data**
   ```javascript
   // Use minimal realistic data
   const createMinimalTestUser = () => ({
     id: Math.floor(Math.random() * 10000),
     email: `test${Date.now()}@example.com`,
     username: `testuser${Date.now()}`,
   });
   ```

3. **Smart Mocking**
   ```javascript
   // Mock expensive operations
   jest.mock('@/lib/services/expensive-service', () => ({
     processLargeDataset: jest.fn().mockResolvedValue(mockResult),
   }));
   ```

4. **Test Isolation**
   ```javascript
   // Use transactions for database tests
   beforeEach(async () => {
     await db.transaction(async (tx) => {
       // Test operations within transaction
       // Automatic rollback after test
     });
   });
   ```

This maintenance guide ensures the test suite remains reliable, performant, and easy to work with as the application evolves.