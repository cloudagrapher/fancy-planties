# Test Render Helpers

Enhanced render helpers for component testing with comprehensive provider support, authentication context, and user interaction utilities.

## Features

- **TypeScript Support**: Full type safety with comprehensive interfaces
- **Provider Integration**: Automatic setup of QueryClient, UserProvider, and other providers
- **Authentication Context**: Easy testing with authenticated, curator, and unverified users
- **Router Mocking**: Complete Next.js router mocking with navigation utilities
- **API Mocking**: Flexible API response mocking for testing different scenarios
- **User Interactions**: High-level utilities for common user interaction patterns
- **Assertion Helpers**: Enhanced assertion utilities for better test readability

## Basic Usage

### Simple Component Rendering

```typescript
import { renderWithProviders } from '@/test-utils/helpers';

test('renders component with providers', () => {
  const result = renderWithProviders(<MyComponent />);
  
  expect(screen.getByText('Hello World')).toBeInTheDocument();
  
  // Access enhanced utilities
  const { user, queryClient, router } = result;
});
```

### Authenticated User Testing

```typescript
import { renderWithAuthenticatedUser } from '@/test-utils/helpers';

test('renders component with authenticated user', () => {
  const result = renderWithAuthenticatedUser(<ProtectedComponent />, {
    userOverrides: { name: 'John Doe', email: 'john@example.com' }
  });
  
  expect(result.testUser.name).toBe('John Doe');
  expect(screen.getByText('Welcome, John Doe')).toBeInTheDocument();
});
```

### Curator/Admin Testing

```typescript
import { renderWithCuratorUser } from '@/test-utils/helpers';

test('renders admin component with curator user', () => {
  const result = renderWithCuratorUser(<AdminPanel />);
  
  expect(result.testUser.isCurator).toBe(true);
  expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
});
```

## Advanced Usage

### Custom Route Testing

```typescript
import { renderWithProviders } from '@/test-utils/helpers';

test('renders component with custom route', () => {
  const result = renderWithProviders(<NavigationComponent />, {
    route: '/dashboard/plants',
    routerMock: {
      query: { tab: 'active' }
    }
  });
  
  expect(result.router.pathname).toBe('/dashboard/plants');
  expect(result.router.query.tab).toBe('active');
});
```

### API Mocking

```typescript
import { renderWithProviders, mockApiResponses } from '@/test-utils/helpers';

test('handles API responses', async () => {
  mockApiResponses({
    '/api/plants': [
      { id: 1, name: 'Monstera', species: 'deliciosa' },
      { id: 2, name: 'Pothos', species: 'aureus' }
    ],
    '/api/user/profile': {
      ok: false,
      status: 401,
      data: { error: 'Unauthorized' }
    }
  });

  renderWithProviders(<PlantsList />);
  
  await waitFor(() => {
    expect(screen.getByText('Monstera')).toBeInTheDocument();
  });
});
```

### User Interactions

```typescript
import { renderWithProviders, userInteractions } from '@/test-utils/helpers';

test('handles form submission', async () => {
  const result = renderWithProviders(<LoginForm />);
  
  // Fill form using high-level utility
  await userInteractions.signIn(
    { email: 'user@example.com', password: 'password123' },
    result.user
  );
  
  // Or use individual utilities
  await userInteractions.fillForm(
    { email: 'user@example.com', password: 'password123' },
    result.user
  );
  await userInteractions.submitForm(result.user, 'sign in');
});
```

### Navigation Testing

```typescript
import { renderWithProviders, userInteractions, testUtils } from '@/test-utils/helpers';

test('handles navigation', async () => {
  const result = renderWithProviders(<NavigationMenu />);
  
  // Navigate programmatically
  userInteractions.navigate('/dashboard');
  
  // Assert navigation occurred
  testUtils.expectNavigation('/dashboard', 'push');
  
  // Wait for navigation to complete
  await userInteractions.waitForNavigation('/dashboard');
});
```

## Test Environment Setup

### Complete Environment Setup

```typescript
import { setupTestEnvironment } from '@/test-utils/helpers';

describe('Plant Management', () => {
  let testEnv: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    testEnv = setupTestEnvironment({
      route: '/dashboard',
      mockApis: {
        '/api/plants': { plants: [] },
        '/api/user/me': { user: { id: 1, name: 'Test User' } }
      }
    });
  });

  test('manages plants correctly', async () => {
    const result = renderWithProviders(<PlantManager />, {
      queryClient: testEnv.queryClient
    });
    
    // Test implementation
  });
});
```

### Custom Provider Testing

```typescript
import { createMultiProvider, renderWithProviders } from '@/test-utils/helpers';

test('works with custom providers', () => {
  const CustomProviders = createMultiProvider([
    { Provider: ThemeProvider, props: { theme: 'dark' } },
    { Provider: FeatureFlagProvider, props: { flags: { newUI: true } } }
  ]);

  const Wrapper = ({ children }) => (
    <CustomProviders>
      {children}
    </CustomProviders>
  );

  render(<MyComponent />, { wrapper: Wrapper });
});
```

## Assertion Utilities

### Enhanced Assertions

```typescript
import { testUtils } from '@/test-utils/helpers';

test('uses enhanced assertions', async () => {
  renderWithProviders(<MyForm />);
  
  // Text assertions
  testUtils.expectTextToBeInDocument('Welcome');
  testUtils.expectTextNotToBeInDocument('Error');
  
  // Form field assertions
  testUtils.expectFieldValue('email', 'user@example.com');
  
  // API call assertions
  testUtils.expectApiCall('/api/login', {
    method: 'POST',
    body: { email: 'user@example.com', password: 'password' }
  });
  
  // Loading state assertions
  await testUtils.expectLoadingComplete();
  
  // Error state assertions
  testUtils.expectErrorMessage(/invalid credentials/i);
  
  // Accessibility assertions
  const button = screen.getByRole('button');
  testUtils.expectAccessibility(button, {
    'aria-label': 'Submit form',
    'aria-disabled': false
  });
});
```

## File Upload Testing

```typescript
import { createTestFile, createTestImageFile } from '@/test-utils/helpers';

test('handles file uploads', async () => {
  const result = renderWithProviders(<FileUploadComponent />);
  
  // Create test files
  const textFile = createTestFile('document.txt', 'file content');
  const imageFile = createTestImageFile('photo.jpg', 200, 150);
  
  // Upload files
  await userInteractions.uploadFile('Upload document', textFile, result.user);
  await userInteractions.uploadFile('Upload photo', imageFile, result.user);
});
```

## Best Practices

### Test Organization

```typescript
describe('Component Name', () => {
  beforeEach(() => {
    resetTestState(); // Clean state between tests
  });

  describe('when authenticated', () => {
    test('shows user content', () => {
      renderWithAuthenticatedUser(<Component />);
      // Test authenticated behavior
    });
  });

  describe('when not authenticated', () => {
    test('shows login prompt', () => {
      renderWithProviders(<Component />);
      // Test unauthenticated behavior
    });
  });
});
```

### Error Handling

```typescript
test('handles errors gracefully', async () => {
  mockApiError('/api/data', 500, { error: 'Server error' });
  
  renderWithProviders(<DataComponent />);
  
  await waitFor(() => {
    testUtils.expectErrorMessage('Server error');
  });
});
```

### Performance Testing

```typescript
test('handles large datasets efficiently', async () => {
  const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`
  }));

  mockApiResponses({
    '/api/items': largeDataset
  });

  const result = renderWithProviders(<ItemsList />);
  
  await testUtils.expectLoadingComplete();
  
  // Verify virtual scrolling or pagination
  expect(screen.getAllByTestId('item-card')).toHaveLength(50); // Only visible items
});
```

## TypeScript Integration

All utilities are fully typed for better development experience:

```typescript
import type { 
  EnhancedRenderResult, 
  AuthenticatedRenderResult,
  ApiMockConfig,
  FormData 
} from '@/test-utils/helpers';

// Type-safe render results
const result: EnhancedRenderResult = renderWithProviders(<Component />);
const authResult: AuthenticatedRenderResult = renderWithAuthenticatedUser(<Component />);

// Type-safe API mocking
const apiConfig: ApiMockConfig = {
  '/api/endpoint': { data: 'response' }
};
```

This comprehensive render helper system provides everything needed for robust, maintainable component testing with full TypeScript support and modern testing patterns.