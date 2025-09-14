# API Testing Utilities Guide

This guide covers the comprehensive API testing utilities implemented for the plant tracker application. These utilities provide consistent, reliable testing patterns for API endpoints, authentication, and database operations.

## Overview

The API testing utilities consist of three main helper classes:

- **ApiTestHelper**: Mock API responses and track API calls
- **AuthTestHelper**: Handle authentication testing scenarios
- **DatabaseTestHelper**: Mock database operations with proper cleanup

## Quick Start

```typescript
import {
  apiHelper,
  authHelper,
  dbHelper,
  mockApiResponse,
  createAuthHeaders,
  expectApiCall,
  resetApiMocks,
} from '@/test-utils/helpers/api-helpers';

describe('My API Tests', () => {
  beforeEach(() => {
    resetApiMocks(); // Clean state between tests
  });

  afterEach(() => {
    resetApiMocks(); // Ensure cleanup
  });

  it('should test API endpoint', async () => {
    // Mock API response
    mockApiResponse({
      'GET /api/plants': { data: [{ id: 1, name: 'Monstera' }] },
    });

    // Make request
    const response = await fetch('/api/plants');
    const data = await response.json();

    // Verify response
    expect(response.status).toBe(200);
    expect(data).toEqual([{ id: 1, name: 'Monstera' }]);

    // Verify API call was made
    expectApiCall('/api/plants', {}, 'GET');
  });
});
```

## ApiTestHelper

### Basic Usage

```typescript
import { ApiTestHelper } from '@/test-utils/helpers/api-helpers';

const apiHelper = ApiTestHelper.getInstance();

// Mock simple response
apiHelper.mockApiResponse({
  'GET /api/test': { data: 'test response' },
});

// Mock with status code
apiHelper.mockApiResponse({
  'POST /api/create': {
    status: 201,
    data: { id: 1, name: 'created' },
  },
});

// Mock with function
apiHelper.mockApiResponse({
  'GET /api/dynamic': (url, options) => ({
    data: `Response for ${url}`,
    method: options?.method || 'GET',
  }),
});
```

### Pattern Matching

```typescript
// Exact match
'GET /api/plants'

// Wildcard matching
'GET /api/plants/*'  // Matches /api/plants/123, /api/plants/search, etc.

// Method + URL pattern
'POST /api/plants'
'PUT /api/plants/*'
'DELETE /api/plants/*'
```

### Tracking API Calls

```typescript
// Get all API calls
const calls = apiHelper.getApiCalls();
console.log(calls); // [{ url, options, timestamp }, ...]

// Count specific calls
const count = apiHelper.getApiCallCount('/api/plants');
const postCount = apiHelper.getApiCallCount('/api/plants', 'POST');

// Verify specific call was made
apiHelper.expectApiCall('/api/plants', {
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'New Plant' }),
}, 'POST');
```

### Error Responses

```typescript
// Mock error response
apiHelper.mockErrorResponse(500, 'Internal server error');

// Mock validation error
apiHelper.mockApiResponse({
  'POST /api/plants': {
    status: 400,
    data: {
      success: false,
      error: 'Validation failed',
      details: [{ field: 'name', message: 'Name is required' }],
    },
  },
});
```

## AuthTestHelper

### Authentication Headers

```typescript
import { AuthTestHelper } from '@/test-utils/helpers/api-helpers';

const authHelper = AuthTestHelper.getInstance();

// Create auth headers with test user
const headers = authHelper.createAuthHeaders();
// Returns: { 'Content-Type': 'application/json', 'Cookie': '...', 'Authorization': '...' }

// Create with specific user/session
const testUser = { id: 1, email: 'test@example.com', ... };
const testSession = { id: 'session-123', userId: 1, ... };
const customHeaders = authHelper.createAuthHeaders(testUser, testSession);
```

### Authenticated API Testing

```typescript
// Mock authenticated endpoints
authHelper.mockAuthenticatedApi({
  'GET /api/protected': { data: 'protected data' },
  'POST /api/user/profile': { data: { id: 1, name: 'Updated' } },
});

// Test unauthenticated request (will return 401)
const unauthResponse = await fetch('/api/protected');
expect(unauthResponse.status).toBe(401);

// Test authenticated request
const authHeaders = authHelper.createAuthHeaders();
const authResponse = await fetch('/api/protected', { headers: authHeaders });
expect(authResponse.status).toBe(200);
```

### Mock Authentication Functions

```typescript
// Mock successful authentication
const { user, session } = authHelper.mockAuthFunctions();

// Mock unauthenticated state
authHelper.mockUnauthenticatedState();

// Verify authenticated API calls
authHelper.expectAuthenticatedApiCall('/api/protected', {}, 'GET');
```

## DatabaseTestHelper

### Basic Database Mocking

```typescript
import { DatabaseTestHelper } from '@/test-utils/helpers/api-helpers';

const dbHelper = DatabaseTestHelper.getInstance();

// Mock database operations
const mockDb = dbHelper.mockDatabaseOperations({
  returning: [{ id: 1, name: 'Test Plant' }],
  execute: [{ id: 1, name: 'Test Plant' }],
});

// Mock database has all Drizzle ORM methods
expect(mockDb.select).toBeDefined();
expect(mockDb.insert).toBeDefined();
expect(mockDb.update).toBeDefined();
expect(mockDb.delete).toBeDefined();
```

### Transaction Testing

```typescript
// Create mock transaction
const transaction = dbHelper.createMockTransaction();

// Transaction has rollback/commit methods
expect(transaction.rollback).toBeDefined();
expect(transaction.commit).toBeDefined();

// Mock database with transaction support
const mockDb = dbHelper.mockDatabaseOperations();
mockDb.transaction.mockImplementation((callback) => {
  const tx = dbHelper.createMockTransaction();
  return callback(tx);
});
```

### Database Test Setup

```typescript
// Setup test database with options
await dbHelper.setupTestDatabase({
  isolateTransactions: true,
  cleanupAfterEach: true,
  seedData: true,
});

// Add custom cleanup
dbHelper.addCleanupCallback(async () => {
  // Custom cleanup logic
});

// Verify database operations
dbHelper.expectDatabaseCall('select');
dbHelper.expectDatabaseCall('insert', 'plants', { name: 'Test Plant' });
```

## Legacy Compatibility Functions

For backward compatibility, all existing API helper functions are still available:

```typescript
import {
  mockApiResponse,
  mockApiError,
  mockApiSuccess,
  createAuthHeaders,
  mockAuthenticatedApi,
  expectApiCall,
  expectAuthenticatedApiCall,
  getApiCallCount,
  getAllApiCalls,
  resetApiMocks,
  databaseTestHelpers,
} from '@/test-utils/helpers/api-helpers';

// These work exactly as before
mockApiResponse({ 'GET /api/test': { data: 'test' } });
mockApiError('/api/error', 500, { error: 'Server error' });
mockApiSuccess({ '/api/success': { message: 'Success!' } });
```

## API Response Patterns

Pre-built response patterns for common scenarios:

```typescript
import { apiResponsePatterns } from '@/test-utils/helpers/api-helpers';

// Success response
const successResponse = apiResponsePatterns.success(
  { id: 1, name: 'Plant' },
  'Created successfully'
);
// Returns: { success: true, message: 'Created successfully', data: { id: 1, name: 'Plant' } }

// Error response
const errorResponse = apiResponsePatterns.error(
  'Something went wrong',
  'CUSTOM_ERROR',
  { field: 'value' }
);
// Returns: { success: false, error: 'Something went wrong', code: 'CUSTOM_ERROR', details: { field: 'value' } }

// Validation error
const validationResponse = apiResponsePatterns.validationError([
  { field: 'name', message: 'Name is required' },
]);

// Paginated response
const paginatedResponse = apiResponsePatterns.paginated(
  [{ id: 1 }, { id: 2 }], // items
  1, // page
  10, // limit
  20 // total
);
```

## Complete Testing Workflow Example

```typescript
import {
  apiHelper,
  authHelper,
  dbHelper,
  apiResponsePatterns,
  mockAuthenticatedApi,
  createAuthHeaders,
  resetApiMocks,
} from '@/test-utils/helpers/api-helpers';

describe('Plant Management API', () => {
  beforeEach(() => {
    resetApiMocks();
  });

  afterEach(() => {
    resetApiMocks();
  });

  describe('Plant CRUD Operations', () => {
    it('should handle complete plant lifecycle', async () => {
      // Setup database mock
      const mockDb = dbHelper.mockDatabaseOperations({
        returning: [{ id: 1, name: 'Monstera', userId: 1 }],
      });

      // Setup authenticated API
      const testUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isCurator: false,
        isEmailVerified: true,
        hashedPassword: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuthenticatedApi({
        'GET /api/plants': {
          data: apiResponsePatterns.success([{ id: 1, name: 'Monstera' }]),
        },
        'POST /api/plants': {
          status: 201,
          data: apiResponsePatterns.success({ id: 1, name: 'Monstera' }),
        },
        'PUT /api/plants/1': {
          data: apiResponsePatterns.success({ id: 1, name: 'Updated Monstera' }),
        },
        'DELETE /api/plants/1': {
          status: 204,
          data: apiResponsePatterns.success(null, 'Deleted successfully'),
        },
      }, testUser);

      const authHeaders = createAuthHeaders(testUser);

      // Test GET
      const getResponse = await fetch('/api/plants', { headers: authHeaders });
      const getData = await getResponse.json();
      expect(getData.success).toBe(true);
      expect(getData.data).toEqual([{ id: 1, name: 'Monstera' }]);

      // Test POST
      const postResponse = await fetch('/api/plants', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: 'Monstera' }),
      });
      const postData = await postResponse.json();
      expect(postResponse.status).toBe(201);
      expect(postData.success).toBe(true);

      // Test PUT
      const putResponse = await fetch('/api/plants/1', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ name: 'Updated Monstera' }),
      });
      const putData = await putResponse.json();
      expect(putData.data.name).toBe('Updated Monstera');

      // Test DELETE
      const deleteResponse = await fetch('/api/plants/1', {
        method: 'DELETE',
        headers: authHeaders,
      });
      expect(deleteResponse.status).toBe(204);

      // Verify all calls were made
      expect(apiHelper.getApiCallCount('/api/plants')).toBe(2); // GET + POST
      expect(apiHelper.getApiCallCount('/api/plants/1')).toBe(2); // PUT + DELETE

      // Verify database operations would be called
      expect(mockDb.select).toBeDefined();
      expect(mockDb.insert).toBeDefined();
      expect(mockDb.update).toBeDefined();
      expect(mockDb.delete).toBeDefined();
    });

    it('should handle validation errors', async () => {
      mockAuthenticatedApi({
        'POST /api/plants': {
          status: 400,
          data: apiResponsePatterns.validationError([
            { field: 'name', message: 'Name is required' },
          ]),
        },
      });

      const authHeaders = createAuthHeaders();
      const response = await fetch('/api/plants', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: '' }),
      });

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details).toHaveLength(1);
    });

    it('should handle authentication errors', async () => {
      mockAuthenticatedApi({
        'GET /api/plants': { data: 'protected' },
      });

      // Request without auth headers should fail
      const response = await fetch('/api/plants');
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('Authentication required');
    });
  });
});
```

## Best Practices

### Test Organization

1. **Always reset mocks**: Use `resetApiMocks()` in `beforeEach` and `afterEach`
2. **Use descriptive patterns**: Make API patterns clear and specific
3. **Test both success and error cases**: Cover happy path and edge cases
4. **Verify API calls**: Use `expectApiCall` to ensure correct requests are made

### Performance

1. **Singleton pattern**: All helpers use singleton pattern for efficiency
2. **Shared state**: API call history is shared between helpers
3. **Proper cleanup**: Reset functions clear all state and restore original fetch

### Error Handling

1. **Consistent error responses**: Use `apiResponsePatterns.error()` for consistency
2. **Proper status codes**: Always set appropriate HTTP status codes
3. **Detailed error information**: Include error codes and details for debugging

### Authentication Testing

1. **Test both authenticated and unauthenticated states**: Cover all access scenarios
2. **Use realistic test data**: Create users and sessions that match your schema
3. **Verify authorization**: Test that protected endpoints require proper auth

### Database Integration

1. **Mock database operations**: Use `DatabaseTestHelper` for consistent mocking
2. **Test transactions**: Mock rollback and commit scenarios
3. **Verify database calls**: Ensure the right database operations are called

## Troubleshooting

### Common Issues

1. **API calls not tracked**: Ensure you're using the same helper instance
2. **Authentication failures**: Check that auth headers are properly set
3. **Pattern matching issues**: Use wildcards (*) for flexible matching
4. **State pollution**: Always call `resetApiMocks()` between tests

### Debugging

```typescript
// Debug API calls
console.log('All API calls:', apiHelper.getApiCalls());
console.log('Call count:', apiHelper.getApiCallCount('/api/test'));

// Debug authentication state
console.log('Current user:', authHelper.getCurrentUser());
console.log('Current session:', authHelper.getCurrentSession());

// Debug database state
console.log('Transactions:', dbHelper.getTransactions());
```

This comprehensive API testing utility system provides everything needed for robust, maintainable API testing with full TypeScript support and modern testing patterns.