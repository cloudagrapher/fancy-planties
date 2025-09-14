# Testing Guide

## Overview

This guide provides comprehensive documentation for testing patterns, best practices, and maintenance procedures for the plant tracker application. Our testing strategy prioritizes reliability, maintainability, and focused coverage of core user workflows.

## Testing Philosophy

### Core Principles

1. **Focus on User Value**: Test what users actually do, not implementation details
2. **Integration Over Unit**: Prefer testing complete workflows over isolated functions
3. **Reliability First**: Tests should be stable and not flaky
4. **Maintainable Patterns**: Use consistent patterns that are easy to understand and modify

### Testing Hierarchy

```
1. Integration Tests (60% of effort)
   - Complete user workflows
   - End-to-end functionality
   - Critical business logic
   - Email verification flows

2. Component Tests (30% of effort)
   - User interactions
   - Form validation
   - Error handling
   - Email verification UI

3. Utility Tests (10% of effort)
   - Helper functions
   - Edge cases
   - Performance scenarios
   - Email service reliability

### Performance Testing

Performance tests ensure the application meets speed and efficiency requirements:

- **Response Time Tests**: API endpoint performance under load
- **Memory Usage Tests**: Component rendering and cleanup efficiency
- **Database Query Performance**: Query optimization and indexing validation
- **Bundle Size Monitoring**: JavaScript bundle size regression detection
- **Rendering Performance**: Component mount/unmount timing
```

## Test Organization

### Directory Structure

```
src/
├── __tests__/
│   ├── integration/           # Core workflow tests
│   │   ├── auth-flows.test.js
│   │   ├── plant-management.test.js
│   │   ├── care-tracking.test.js
│   │   ├── data-import.test.js
│   │   └── email-service-integration.test.ts
│   ├── api/                   # API endpoint tests
│   │   ├── auth-core.test.js
│   │   ├── plant-management.test.js
│   │   └── care-tracking.test.js
│   ├── database/              # Database query tests
│   │   ├── user-auth-queries.test.js
│   │   ├── plant-data-queries.test.js
│   │   └── care-data-queries.test.js
│   └── components/            # Component behavior tests
│       ├── forms/
│       ├── navigation/
│       └── shared/
└── test-utils/                # Centralized test utilities
    ├── setup/                 # Test environment setup
    ├── factories/             # Test data factories
    ├── helpers/               # Testing helper functions
    ├── mocks/                 # Mock implementations
    └── performance/           # Performance testing utilities
```

### Naming Conventions

#### Test Files
- **Integration tests**: `{feature}-{workflow}.test.js`
  - Examples: `auth-flows.test.js`, `plant-management.test.js`
- **API tests**: `{endpoint-group}.test.js`
  - Examples: `auth-core.test.js`, `care-tracking.test.js`
- **Component tests**: `{ComponentName}.test.tsx`
  - Examples: `PlantInstanceForm.test.tsx`, `BottomNavigation.test.tsx`
- **Database tests**: `{data-type}-queries.test.js`
  - Examples: `plant-data-queries.test.js`, `user-auth-queries.test.js`

#### Test Descriptions
```javascript
// ✅ Good: Describes user behavior
describe('Plant Management Workflow', () => {
  it('should create a new plant instance with care history', async () => {
    // Test implementation
  });
});

// ❌ Avoid: Implementation-focused descriptions
describe('PlantService', () => {
  it('should call database insert method', async () => {
    // Too focused on implementation
  });
});
```

#### Test Groups
```javascript
// ✅ Organize by user scenarios
describe('User Authentication', () => {
  describe('when signing up', () => {
    it('should create account and redirect to dashboard');
    it('should show validation errors for invalid data');
  });
  
  describe('when signing in', () => {
    it('should authenticate and establish session');
    it('should reject invalid credentials');
  });
});
```

## Testing Patterns

### Integration Test Pattern

Integration tests focus on complete user workflows and should test the entire stack.

```javascript
// Example: Complete plant creation workflow
describe('Plant Management Integration', () => {
  let testUser;
  let testContext;

  beforeEach(async () => {
    testContext = await createTestContext();
    testUser = await createAuthenticatedUser();
  });

  afterEach(async () => {
    await cleanupTestContext(testContext);
  });

  it('should create, edit, and delete plant instance', async () => {
    // 1. Create plant instance
    const plantData = createTestPlant();
    const response = await testContext.apiClient
      .post('/api/plant-instances')
      .send(plantData)
      .expect(201);

    const plantInstance = response.body.data;
    expect(plantInstance.commonName).toBe(plantData.commonName);

    // 2. Edit plant instance
    const updatedData = { ...plantData, nickname: 'Updated Nickname' };
    await testContext.apiClient
      .put(`/api/plant-instances/${plantInstance.id}`)
      .send(updatedData)
      .expect(200);

    // 3. Verify changes persisted
    const getResponse = await testContext.apiClient
      .get(`/api/plant-instances/${plantInstance.id}`)
      .expect(200);

    expect(getResponse.body.data.nickname).toBe('Updated Nickname');

    // 4. Delete plant instance
    await testContext.apiClient
      .delete(`/api/plant-instances/${plantInstance.id}`)
      .expect(200);

    // 5. Verify deletion
    await testContext.apiClient
      .get(`/api/plant-instances/${plantInstance.id}`)
      .expect(404);
  });
});
```

### Component Test Pattern

Component tests focus on user interactions and behavior, not implementation details.

#### Client Component Testing

```javascript
// Example: Form component testing
import { renderWithProviders, userEvent, screen } from '@/test-utils';
import { PlantInstanceForm } from '@/components/plants/PlantInstanceForm';

describe('PlantInstanceForm', () => {
  const mockOnSubmit = jest.fn();
  const defaultProps = {
    onSubmit: mockOnSubmit,
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should submit valid plant data', async () => {
    renderWithProviders(<PlantInstanceForm {...defaultProps} />);

    // Fill out form
    await userEvent.type(screen.getByLabelText(/common name/i), 'Monstera Deliciosa');
    await userEvent.type(screen.getByLabelText(/nickname/i), 'My Monstera');
    await userEvent.selectOptions(screen.getByLabelText(/location/i), 'Living Room');

    // Submit form
    await userEvent.click(screen.getByRole('button', { name: /save plant/i }));

    // Verify submission
    expect(mockOnSubmit).toHaveBeenCalledWith({
      commonName: 'Monstera Deliciosa',
      nickname: 'My Monstera',
      location: 'Living Room',
    });
  });

  it('should show validation errors for invalid data', async () => {
    renderWithProviders(<PlantInstanceForm {...defaultProps} />);

    // Submit empty form
    await userEvent.click(screen.getByRole('button', { name: /save plant/i }));

    // Check for validation messages
    expect(screen.getByText(/common name is required/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});
```

#### Server Component Testing

Server components (async functions that use server-only features) should not be tested directly in the jsdom environment. Instead, test their behavior through integration tests or API endpoints.

```javascript
// ❌ Don't test server components directly
describe('AuthGuard Server Component', () => {
  it('should render children when authenticated', async () => {
    // This won't work - server components can't be rendered in jsdom
    renderWithProviders(<AuthGuard><div>Content</div></AuthGuard>);
  });
});

// ✅ Test server component behavior through integration tests
describe('Authentication Integration', () => {
  it('should protect routes and redirect when not authenticated', async () => {
    // Test through API calls or page navigation
    const response = await testContext.apiClient
      .get('/protected-route')
      .expect(302); // Redirect response
    
    expect(response.headers.location).toBe('/auth/signin');
  });
});

// ✅ Test server component logic through unit tests of underlying functions
describe('Auth Server Functions', () => {
  it('should validate user session', async () => {
    const mockSession = createTestSession();
    const result = await requireAuthSession(mockSession);
    expect(result.user).toBeDefined();
  });
});
```

#### Mock Patterns for Server Components

When testing components that interact with server components, use proper mocking:

```javascript
// Mock server-only functions
jest.mock('@/lib/auth/server', () => ({
  requireAuthSession: jest.fn(),
}));

// Import the mocked function (no TypeScript assertion needed)
import { requireAuthSession } from '@/lib/auth/server';
const mockRequireAuthSession = requireAuthSession;

describe('Component using server functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle authentication success', async () => {
    mockRequireAuthSession.mockResolvedValue({
      user: { id: 1, email: 'test@example.com' },
      session: { id: 'session-123' },
    });
    
    // Test component behavior
  });
});
```

### API Test Pattern

API tests verify endpoint behavior, authentication, and data validation.

```javascript
// Example: API endpoint testing
import { createTestContext, createAuthenticatedUser } from '@/test-utils';

describe('Plant Instances API', () => {
  let testContext;
  let testUser;

  beforeEach(async () => {
    testContext = await createTestContext();
    testUser = await createAuthenticatedUser();
  });

  afterEach(async () => {
    await cleanupTestContext(testContext);
  });

  describe('POST /api/plant-instances', () => {
    it('should create plant instance with valid data', async () => {
      const plantData = createTestPlant();

      const response = await testContext.apiClient
        .post('/api/plant-instances')
        .set('Authorization', `Bearer ${testUser.sessionToken}`)
        .send(plantData)
        .expect(201);

      // Use explicit field assertions for better test reliability
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: expect.any(Number),
          nickname: plantData.nickname,
          location: plantData.location,
          plantId: plantData.plantId,
          fertilizerSchedule: plantData.fertilizerSchedule,
          userId: testUser.id,
          isActive: true,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          plant: expect.objectContaining({
            id: expect.any(Number),
            family: plantData.plant.family,
            genus: plantData.plant.genus,
            species: plantData.plant.species,
            commonName: plantData.plant.commonName,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          }),
        }),
      });
    });

    it('should reject invalid data with validation errors', async () => {
      const invalidData = { commonName: '' }; // Missing required fields

      const response = await testContext.apiClient
        .post('/api/plant-instances')
        .set('Authorization', `Bearer ${testUser.sessionToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          path: ['commonName'],
          message: expect.stringContaining('required'),
        })
      );
    });

    it('should require authentication', async () => {
      const plantData = createTestPlant();

      await testContext.apiClient
        .post('/api/plant-instances')
        .send(plantData)
        .expect(401);
    });
  });
});
```

### Email Service Test Pattern

Email service tests verify email delivery, verification codes, and error handling.

```javascript
// Example: Email service integration testing
import { createEmailService, EmailServiceError } from '@/lib/services/email';
import { getEmailErrorMessage } from '@/lib/utils/email-errors';

describe('Email Service Integration', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: 'test-api-key',
      FROM_EMAIL: 'test@example.com',
      FROM_NAME: 'Test App',
      NODE_ENV: 'test',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should create email service with valid configuration', () => {
    expect(() => createEmailService()).not.toThrow();
  });

  it('should handle missing API key gracefully', () => {
    delete process.env.RESEND_API_KEY;
    expect(() => createEmailService()).toThrow('RESEND_API_KEY environment variable is required');
  });

  it('should provide user-friendly error messages', () => {
    const quotaError = new EmailServiceError('Quota exceeded', 'QUOTA_EXCEEDED');
    const message = getEmailErrorMessage(quotaError);
    
    expect(message).toContain('temporarily unavailable');
    expect(message).not.toContain('Quota exceeded'); // Hide technical details
  });
});
```

### Email Verification API Test Pattern

```javascript
// Example: Email verification endpoint testing
describe('Email Verification API', () => {
  let testContext, testUser;

  beforeEach(async () => {
    testContext = await createTestContext();
    testUser = await createUnverifiedUser(); // User without email verification
  });

  afterEach(async () => {
    await cleanupTestContext(testContext);
  });

  describe('POST /api/auth/verify-email', () => {
    it('should verify email with valid code', async () => {
      // Generate verification code
      const verificationCode = await generateTestVerificationCode(testUser.email);

      const response = await testContext.apiClient
        .post('/api/auth/verify-email')
        .send({ 
          email: testUser.email,
          code: verificationCode 
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify user is now verified
      const updatedUser = await getUserByEmail(testUser.email);
      expect(updatedUser.isEmailVerified).toBe(true);
    });

    it('should reject invalid verification codes', async () => {
      const response = await testContext.apiClient
        .post('/api/auth/verify-email')
        .send({ 
          email: testUser.email,
          code: '000000' // Invalid code
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid or expired verification code');
    });

    it('should enforce rate limiting on verification attempts', async () => {
      // Make multiple failed attempts
      for (let i = 0; i < 6; i++) {
        await testContext.apiClient
          .post('/api/auth/verify-email')
          .send({ email: testUser.email, code: '000000' })
          .expect(i < 5 ? 400 : 429); // Rate limited after 5 attempts
      }
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    it('should resend verification code with cooldown', async () => {
      // First request should succeed
      await testContext.apiClient
        .post('/api/auth/resend-verification')
        .send({ email: testUser.email })
        .expect(200);

      // Immediate second request should be rate limited
      await testContext.apiClient
        .post('/api/auth/resend-verification')
        .send({ email: testUser.email })
        .expect(429);
    });
  });
});
```

### Database Test Pattern

Database tests verify query logic and data integrity.

```javascript
// Example: Database query testing
import { createTestContext, createTestUser, createTestPlant } from '@/test-utils';
import { getUserPlants, createPlantInstance } from '@/lib/db/queries/plant-instances';

describe('Plant Instance Queries', () => {
  let testContext;
  let testUser;

  beforeEach(async () => {
    testContext = await createTestContext();
    testUser = await createTestUser();
  });

  afterEach(async () => {
    await cleanupTestContext(testContext);
  });

  describe('getUserPlants', () => {
    it('should return only user-owned plants', async () => {
      // Create plants for test user
      const userPlant1 = await createPlantInstance({ userId: testUser.id });
      const userPlant2 = await createPlantInstance({ userId: testUser.id });

      // Create plant for different user
      const otherUser = await createTestUser();
      await createPlantInstance({ userId: otherUser.id });

      const result = await getUserPlants(testUser.id);

      expect(result).toHaveLength(2);
      expect(result.map(p => p.id)).toContain(userPlant1.id);
      expect(result.map(p => p.id)).toContain(userPlant2.id);
      expect(result.every(p => p.userId === testUser.id)).toBe(true);
    });

    it('should return empty array for user with no plants', async () => {
      const result = await getUserPlants(testUser.id);
      expect(result).toEqual([]);
    });
  });
});
```

## Test Utilities Usage

### Test Data Factories

Use factories to create consistent, realistic test data:

```javascript
import { createTestUser, createTestPlant, createTestCareRecord } from '@/test-utils/factories';

// Create basic test data
const user = createTestUser();
const plant = createTestPlant({ userId: user.id });

// Create with overrides
const plant = createTestPlant({
  commonName: 'Custom Plant Name',
  location: 'Bedroom',
});

// Create related data
const careRecord = createTestCareRecord({
  plantInstanceId: plant.id,
  careType: 'watering',
});
```

### Render Helpers

Use render helpers for consistent component testing:

```javascript
import { renderWithProviders, renderWithAuth } from '@/test-utils/helpers';

// Basic rendering with providers
const { getByText } = renderWithProviders(<MyComponent />);

// Rendering with authenticated user
const user = createTestUser();
const { getByText } = renderWithAuth(<MyComponent />, { user });

// Rendering with custom providers
const { getByText } = renderWithProviders(<MyComponent />, {
  initialRoute: '/dashboard',
  mockApis: { plants: mockPlantsApi },
});
```

### API Helpers

Use API helpers for consistent endpoint testing:

```javascript
import { createApiClient, mockApiResponse } from '@/test-utils/helpers';

// Create authenticated API client
const apiClient = createApiClient(testUser);

// Mock API responses
mockApiResponse('/api/plants', { data: [plant1, plant2] });

// Test API calls
const response = await apiClient.get('/api/plants');
expect(response.data).toHaveLength(2);
```

## Best Practices

### Test Independence

Each test should be completely independent and not rely on other tests:

```javascript
// ✅ Good: Each test sets up its own data
describe('Plant Management', () => {
  it('should create plant', async () => {
    const user = await createTestUser();
    const plantData = createTestPlant();
    // Test implementation
  });

  it('should update plant', async () => {
    const user = await createTestUser();
    const plant = await createTestPlant({ userId: user.id });
    // Test implementation
  });
});

// ❌ Avoid: Tests depending on each other
describe('Plant Management', () => {
  let sharedPlant;

  it('should create plant', async () => {
    sharedPlant = await createPlant(); // Other tests depend on this
  });

  it('should update plant', async () => {
    await updatePlant(sharedPlant.id); // Depends on previous test
  });
});
```

### Meaningful Assertions

Write assertions that clearly express the expected behavior:

```javascript
// ✅ Good: Clear, specific assertions
expect(response.status).toBe(201);
expect(response.body.data).toMatchObject({
  commonName: 'Monstera Deliciosa',
  userId: testUser.id,
});
expect(response.body.data.id).toBeDefined();

// ✅ Best: Explicit field assertions for complex objects
expect(responseData).toEqual({
  success: true,
  data: expect.objectContaining({
    id: expectedInstance.id,
    nickname: expectedInstance.nickname,
    location: expectedInstance.location,
    plantId: expectedInstance.plantId,
    fertilizerSchedule: expectedInstance.fertilizerSchedule,
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
    plant: expect.objectContaining({
      id: expectedInstance.plant.id,
      family: expectedInstance.plant.family,
      genus: expectedInstance.plant.genus,
      species: expectedInstance.plant.species,
      commonName: expectedInstance.plant.commonName,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    }),
  }),
});

// ❌ Avoid: Vague or overly broad assertions
expect(response).toBeTruthy();
expect(response.body).toMatchSnapshot(); // Brittle
expect(response.body.data).toMatchObject({
  ...expectedInstance, // Can hide missing or extra fields
  createdAt: expect.any(String),
});
```

### Error Testing

Always test error conditions and edge cases:

```javascript
describe('Plant Creation', () => {
  it('should create plant with valid data', async () => {
    // Happy path test
  });

  it('should reject empty common name', async () => {
    // Error condition test
  });

  it('should handle database connection errors', async () => {
    // Infrastructure error test
  });

  it('should require authentication', async () => {
    // Authorization test
  });
});
```

### Zod Validation Error Testing

When testing Zod validation errors, use the proper ZodError constructor for accurate mocking:

```javascript
// ✅ Good: Use actual ZodError constructor
import { ZodError } from 'zod';

it('should return validation errors for invalid data', async () => {
  const validationError = new ZodError([
    { path: ['plantId'], message: 'Plant ID must be a number', code: 'invalid_type' },
    { path: ['nickname'], message: 'Nickname is required', code: 'invalid_type' },
  ]);

  mockValidationSchema.parse.mockImplementation(() => {
    throw validationError;
  });

  // Test implementation
});

// ❌ Avoid: Manual error object creation
it('should return validation errors for invalid data', async () => {
  const validationError = new Error('Validation failed');
  validationError.name = 'ZodError';
  validationError.issues = [
    { path: ['plantId'], message: 'Plant ID must be a number' },
  ];

  // This doesn't accurately reflect real ZodError behavior
});
```

### Object Assertion Patterns

When testing complex API responses or object structures, use explicit field assertions rather than object spread patterns:

```javascript
// ✅ Best Practice: Explicit field assertions
expect(responseData).toEqual({
  success: true,
  data: expect.objectContaining({
    // Explicitly list each expected field
    id: expectedData.id,
    nickname: expectedData.nickname,
    location: expectedData.location,
    plantId: expectedData.plantId,
    fertilizerSchedule: expectedData.fertilizerSchedule,
    lastFertilized: expectedData.lastFertilized,
    notes: expectedData.notes,
    isActive: expectedData.isActive,
    // Dynamic fields that change
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
    // Nested objects with explicit fields
    plant: expect.objectContaining({
      id: expectedData.plant.id,
      family: expectedData.plant.family,
      genus: expectedData.plant.genus,
      species: expectedData.plant.species,
      commonName: expectedData.plant.commonName,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    }),
  }),
});

// ❌ Avoid: Object spread in assertions
expect(responseData).toEqual({
  success: true,
  data: expect.objectContaining({
    ...expectedData, // Hides missing fields and extra properties
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
    plant: expect.objectContaining({
      ...expectedData.plant, // Can mask validation issues
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    }),
  }),
});
```

**Benefits of Explicit Field Assertions:**
- **Clarity**: Each expected field is clearly visible in the test
- **Precision**: Catches missing fields that spread assertions might miss
- **Maintainability**: Easy to see what the API contract expects
- **Debugging**: Failed assertions show exactly which field is problematic
- **Documentation**: Tests serve as clear API documentation

### Async Testing

Handle async operations properly:

```javascript
// ✅ Good: Proper async/await usage
it('should create plant instance', async () => {
  const response = await apiClient.post('/api/plants', plantData);
  expect(response.status).toBe(201);
});

// ✅ Good: Testing async state changes
it('should show loading state during submission', async () => {
  renderWithProviders(<PlantForm />);
  
  const submitButton = screen.getByRole('button', { name: /save/i });
  userEvent.click(submitButton);
  
  expect(screen.getByText(/saving/i)).toBeInTheDocument();
  
  await waitFor(() => {
    expect(screen.queryByText(/saving/i)).not.toBeInTheDocument();
  });
});

// ❌ Avoid: Missing await or improper async handling
it('should create plant instance', () => {
  apiClient.post('/api/plants', plantData).then(response => {
    expect(response.status).toBe(201); // May not execute
  });
});
```

### Mock Management

Use mocks judiciously and clean them up properly:

```javascript
describe('Plant Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should handle API errors gracefully', async () => {
    // Mock specific behavior for this test
    const mockFetch = jest.spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('Network error'));

    const result = await plantService.getPlants();

    expect(result.error).toBe('Failed to fetch plants');
    expect(mockFetch).toHaveBeenCalledWith('/api/plants');
  });
});
```

## Performance Considerations

### Test Data Size

Keep test data realistic but minimal:

```javascript
// ✅ Good: Realistic but minimal data
const createTestPlantList = (count = 5) => {
  return Array.from({ length: count }, (_, i) => createTestPlant({
    commonName: `Test Plant ${i + 1}`,
  }));
};

// ❌ Avoid: Excessive test data
const createMassivePlantList = () => {
  return Array.from({ length: 10000 }, createTestPlant); // Too much
};
```

### Database Cleanup

Ensure proper cleanup to prevent test pollution:

```javascript
describe('Database Tests', () => {
  let testContext;

  beforeEach(async () => {
    testContext = await createTestContext();
  });

  afterEach(async () => {
    await cleanupTestContext(testContext);
  });

  // Tests here will have clean database state
});
```

### Parallel Execution

Write tests that can run in parallel safely:

```javascript
// ✅ Good: Each test uses unique data
it('should create user with unique email', async () => {
  const uniqueEmail = `test-${Date.now()}@example.com`;
  const user = await createUser({ email: uniqueEmail });
  // Test implementation
});

// ❌ Avoid: Tests that conflict with each other
it('should create admin user', async () => {
  const user = await createUser({ email: 'admin@example.com' }); // Conflicts
});
```

## Performance Testing

### Performance Test Pattern

Performance tests measure application speed, memory usage, and efficiency to ensure optimal user experience.

```javascript
// Example: API response time testing
describe('API Performance', () => {
  it('should respond to plant queries within acceptable time', async () => {
    const startTime = performance.now();
    
    const response = await testContext.apiClient
      .get('/api/plants')
      .expect(200);
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    expect(responseTime).toBeLessThan(500); // 500ms threshold
    expect(response.body.data).toBeDefined();
  });

  it('should handle concurrent requests efficiently', async () => {
    const concurrentRequests = 10;
    const startTime = performance.now();
    
    const promises = Array.from({ length: concurrentRequests }, () =>
      testContext.apiClient.get('/api/plants')
    );
    
    const responses = await Promise.all(promises);
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    expect(responses).toHaveLength(concurrentRequests);
    expect(totalTime).toBeLessThan(2000); // 2s for 10 concurrent requests
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
  });
});
```

### Memory Usage Testing

```javascript
// Example: Component memory leak detection
describe('Component Memory Usage', () => {
  it('should not leak memory on mount/unmount cycles', async () => {
    const { unmount } = renderWithProviders(<PlantList plants={largePlantList} />);
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Mount and unmount component multiple times
    for (let i = 0; i < 100; i++) {
      const { unmount: currentUnmount } = renderWithProviders(
        <PlantList plants={largePlantList} />
      );
      currentUnmount();
    }
    
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be minimal (less than 10MB)
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
  });
});
```

### Database Query Performance

```javascript
// Example: Database query optimization testing
describe('Database Query Performance', () => {
  beforeEach(async () => {
    // Create large dataset for performance testing
    await createLargeTestDataset();
  });

  it('should execute complex plant queries efficiently', async () => {
    const startTime = performance.now();
    
    const result = await getUserPlantsWithCareHistory(testUser.id, {
      limit: 50,
      includeImages: true,
      includeCareHistory: true
    });
    
    const endTime = performance.now();
    const queryTime = endTime - startTime;
    
    expect(queryTime).toBeLessThan(100); // 100ms threshold
    expect(result).toHaveLength(50);
    expect(result[0].careHistory).toBeDefined();
  });

  it('should use proper indexing for search queries', async () => {
    const startTime = performance.now();
    
    const result = await searchPlants('monstera', {
      userId: testUser.id,
      limit: 20
    });
    
    const endTime = performance.now();
    const searchTime = endTime - startTime;
    
    expect(searchTime).toBeLessThan(50); // 50ms for indexed search
    expect(result.length).toBeGreaterThan(0);
  });
});
```

### Bundle Size Monitoring

```javascript
// Example: Bundle size regression testing
describe('Bundle Size Performance', () => {
  it('should maintain acceptable bundle sizes', async () => {
    const bundleStats = await getBundleStats();
    
    expect(bundleStats.mainBundle.size).toBeLessThan(250 * 1024); // 250KB
    expect(bundleStats.vendorBundle.size).toBeLessThan(500 * 1024); // 500KB
    expect(bundleStats.totalSize).toBeLessThan(1024 * 1024); // 1MB total
  });

  it('should properly code-split dynamic imports', async () => {
    const chunkStats = await getChunkStats();
    
    // Admin dashboard should be in separate chunk
    expect(chunkStats.chunks.some(chunk => 
      chunk.name.includes('admin') && chunk.size < 100 * 1024
    )).toBe(true);
    
    // Plant management should be in separate chunk
    expect(chunkStats.chunks.some(chunk => 
      chunk.name.includes('plants') && chunk.size < 150 * 1024
    )).toBe(true);
  });
});
```

### Running Performance Tests

```bash
# Run all performance tests
npm run test:performance

# Run specific performance test patterns
npm run test:performance -- --testPathPatterns="performance|benchmark"

# Run with detailed timing output
npm run test:performance -- --verbose --maxWorkers=1

# Generate performance report
npm run test:performance -- --json --outputFile=performance-results.json
```

### Performance Test Configuration

Performance tests should be configured with appropriate timeouts and resource limits:

```javascript
// jest.performance.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.(performance|benchmark).test.js'],
  testTimeout: 30000, // 30 seconds for performance tests
  maxWorkers: 1, // Run performance tests sequentially
  setupFilesAfterEnv: ['<rootDir>/test-utils/performance-setup.js'],
  collectCoverage: false, // Disable coverage for performance tests
};
```

### Performance Benchmarking

```javascript
// Example: Benchmark comparison testing
describe('Performance Benchmarks', () => {
  const benchmarkResults = [];

  afterAll(() => {
    // Log benchmark results for tracking
    console.table(benchmarkResults);
  });

  it('should benchmark plant list rendering', async () => {
    const plantCounts = [10, 50, 100, 500];
    
    for (const count of plantCounts) {
      const plants = createTestPlantList(count);
      const startTime = performance.now();
      
      const { unmount } = renderWithProviders(<PlantList plants={plants} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      benchmarkResults.push({
        plantCount: count,
        renderTime: `${renderTime.toFixed(2)}ms`,
        memoryUsage: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`
      });
      
      unmount();
      
      // Ensure render time scales reasonably
      expect(renderTime).toBeLessThan(count * 2); // 2ms per plant max
    }
  });
});
```

This testing guide provides the foundation for writing reliable, maintainable tests that focus on user value and system behavior rather than implementation details, including comprehensive performance testing to ensure optimal application performance.