# Testing Quick Reference

## Common Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test PlantForm.test.tsx

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage

# Run specific test by name
npm test -- --testNamePattern="should submit form"

# Debug tests
npm test -- --verbose --runInBand

# Clear Jest cache
npm test -- --clearCache

# Email verification specific tests
npm test -- --testPathPatterns="email.*unit|email.*integration" --verbose

# Run email service tests only
npm test -- --testPathPatterns="email-service" --verbose
```

## Test File Templates

### Integration Test
```javascript
describe('Feature Integration', () => {
  let testContext, testUser;

  beforeEach(async () => {
    testContext = await createTestContext();
    testUser = await createAuthenticatedUser();
  });

  afterEach(async () => {
    await cleanupTestContext(testContext);
  });

  it('should complete user workflow', async () => {
    // Test implementation
  });
});
```

### Client Component Test
```javascript
import { renderWithProviders, userEvent, screen } from '@/test-utils';

describe('ComponentName', () => {
  const defaultProps = { onAction: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('should render correctly', () => {
    renderWithProviders(<ComponentName {...defaultProps} />);
    expect(screen.getByText(/expected/i)).toBeInTheDocument();
  });
});
```

### Server Component Mock Test
```javascript
// Mock server functions
jest.mock('@/lib/auth/server', () => ({
  requireAuthSession: jest.fn(),
}));

import { requireAuthSession } from '@/lib/auth/server';
const mockRequireAuthSession = requireAuthSession;

describe('Server Component Logic', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should handle server function calls', async () => {
    mockRequireAuthSession.mockResolvedValue({ user: testUser });
    // Test logic that depends on server functions
  });
});
```

### API Test
```javascript
describe('API Endpoint', () => {
  let testContext, testUser;

  beforeEach(async () => {
    testContext = await createTestContext();
    testUser = await createAuthenticatedUser();
  });

  it('should handle valid requests', async () => {
    const response = await testContext.apiClient
      .post('/api/endpoint')
      .set('Authorization', `Bearer ${testUser.sessionToken}`)
      .send(validData)
      .expect(200);
  });
});
```

## Common Imports

```javascript
// Test utilities
import { 
  createTestContext, 
  cleanupTestContext,
  createAuthenticatedUser 
} from '@/test-utils/setup';

import { 
  createTestUser, 
  createTestPlant, 
  createTestCareRecord 
} from '@/test-utils/factories';

import { 
  renderWithProviders, 
  renderWithAuth 
} from '@/test-utils/helpers';

// Testing Library
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

// Jest
import { jest } from '@jest/globals';
```

## Debugging Checklist

1. **Test failing?**
   - Run single test: `npm test -- TestFile.test.tsx`
   - Add `screen.debug()` to see DOM
   - Check console for errors

2. **Mock not working?**
   - Verify mock is in `beforeEach` or test setup
   - Check import paths match exactly
   - Use `jest.clearAllMocks()` in `beforeEach`

3. **Async issues?**
   - Use `await` with user interactions
   - Use `waitFor()` for async state changes
   - Check for unresolved promises

4. **Component not rendering?**
   - Use `renderWithProviders()` helper
   - Check for missing providers (auth, query client)
   - Verify component props match interface

## Best Practices Checklist

- [ ] Each test is independent
- [ ] Use descriptive test names
- [ ] Test user behavior, not implementation
- [ ] Clean up mocks in `beforeEach`
- [ ] Use realistic test data
- [ ] Test both success and error cases
- [ ] Avoid testing implementation details
- [ ] Use proper async/await patterns

## Common Patterns

### Form Testing
```javascript
const user = userEvent.setup();
await user.type(screen.getByLabelText(/name/i), 'Test Name');
await user.click(screen.getByRole('button', { name: /submit/i }));
expect(mockOnSubmit).toHaveBeenCalledWith(expectedData);
```

### API Mocking
```javascript
jest.mock('@/lib/api/plants', () => ({
  getPlants: jest.fn().mockResolvedValue(mockPlants),
}));
```

### Error Testing
```javascript
it('should handle errors', async () => {
  mockApiCall.mockRejectedValueOnce(new Error('API Error'));
  // Test error handling
});
```

### Zod Validation Error Testing
```javascript
import { ZodError } from 'zod';

it('should handle validation errors', async () => {
  const validationError = new ZodError([
    { path: ['field'], message: 'Field is required', code: 'invalid_type' },
  ]);
  
  mockValidation.mockImplementation(() => {
    throw validationError;
  });
  
  // Test validation error handling
});
```

### Authentication Testing
```javascript
const { getByText } = renderWithAuth(<Component />, { user: testUser });
```

### Email Verification Testing
```javascript
// Test email service configuration
expect(() => createEmailService()).not.toThrow();

// Test verification code validation
const response = await apiClient
  .post('/api/auth/verify-email')
  .send({ email: 'test@example.com', code: '123456' });

// Test rate limiting
await expect(multipleRequests()).rejects.toThrow('Rate limited');
```

This quick reference provides the most commonly needed information for day-to-day testing work.