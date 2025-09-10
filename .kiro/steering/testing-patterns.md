---
inclusion: fileMatch
fileMatchPattern: "**/*.{test,spec}.{ts,tsx}"
---

# Testing Standards and Mock Patterns

## Critical Jest Environment Rules

### Browser API Mocking

**NEVER** use `delete` on browser APIs - Jest makes them non-configurable.

```typescript
// ❌ WRONG - Will throw TypeError
beforeEach(() => {
  delete (navigator as any).vibrate;  // Cannot delete property
  delete (window as any).location;    // Cannot delete property
});

// ✅ CORRECT - Use Object.defineProperty
beforeEach(() => {
  Object.defineProperty(navigator, 'vibrate', {
    value: undefined,
    configurable: true,
    writable: true
  });
  
  Object.defineProperty(window, 'location', {
    value: { href: 'http://localhost' },
    configurable: true,
    writable: true
  });
});
```

### Service Worker Testing

```typescript
// ✅ Proper ServiceWorker mock setup
describe('ServiceWorker', () => {
  let mockRegistration: Partial<ServiceWorkerRegistration>;
  
  beforeEach(() => {
    // Clean slate for each test
    jest.clearAllMocks();
    
    mockRegistration = {
      active: { state: 'activated' } as ServiceWorker,
      scope: '/',
      update: jest.fn(),
      unregister: jest.fn()
    };
    
    // Mock navigator.serviceWorker
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: jest.fn().mockResolvedValue(mockRegistration),
        ready: Promise.resolve(mockRegistration),
        controller: null
      },
      configurable: true
    });
  });
  
  afterEach(() => {
    // Clean up after each test
    jest.restoreAllMocks();
  });
});
```

### Test Isolation Best Practices

```typescript
describe('Component Tests', () => {
  // Reset all state before each test
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();  // Clear module cache
    
    // Reset global objects if needed
    delete (global as any).fetch;
    delete (global as any).localStorage;
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
    // Clean up any test-specific state
  });
});
```

## Mock Patterns by API Type

### Navigator APIs

```typescript
// ✅ Vibration API
Object.defineProperty(navigator, 'vibrate', {
  value: jest.fn(),
  configurable: true
});

// ✅ Geolocation API
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(),
    clearWatch: jest.fn()
  },
  configurable: true
});

// ✅ Network Information API
Object.defineProperty(navigator, 'connection', {
  value: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 100
  },
  configurable: true
});
```

### Storage APIs

```typescript
// ✅ LocalStorage mock
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  configurable: true
});

// ✅ SessionStorage mock  
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,  // Can reuse same mock
  configurable: true
});
```

### Network APIs

```typescript
// ✅ Fetch API mock
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

beforeEach(() => {
  (global.fetch as jest.MockedFunction<typeof fetch>).mockClear();
});

// ✅ WebSocket mock
global.WebSocket = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.OPEN
}));
```

## Error Testing Patterns

### Async Error Handling

```typescript
// ✅ Test async errors properly
test('should handle async errors', async () => {
  const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
  
  await expect(mockFn()).rejects.toThrow('Test error');
  expect(mockFn).toHaveBeenCalled();
});

// ✅ Test error boundaries
test('should catch and handle errors', async () => {
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  
  try {
    await riskyOperation();
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error:'),
      error
    );
  }
  
  consoleSpy.mockRestore();
});
```

### Network Error Simulation

```typescript
// ✅ Simulate network failures
beforeEach(() => {
  (global.fetch as jest.Mock).mockImplementation(() =>
    Promise.reject(new Error('Network error'))
  );
});

// ✅ Simulate timeout errors
beforeEach(() => {
  (global.fetch as jest.Mock).mockImplementation(() =>
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 100)
    )
  );
});
```

## Component Testing Patterns

### React Hook Testing

```typescript
import { renderHook, act } from '@testing-library/react';

// ✅ Test custom hooks properly
test('should handle state changes', () => {
  const { result } = renderHook(() => useCustomHook());
  
  expect(result.current.value).toBe(initialValue);
  
  act(() => {
    result.current.setValue(newValue);
  });
  
  expect(result.current.value).toBe(newValue);
});
```

### Event Handling Tests

```typescript
import { fireEvent, screen } from '@testing-library/react';

// ✅ Test user interactions
test('should handle click events', () => {
  const mockHandler = jest.fn();
  render(<Button onClick={mockHandler}>Click me</Button>);
  
  fireEvent.click(screen.getByRole('button'));
  expect(mockHandler).toHaveBeenCalledTimes(1);
});
```

## Common Testing Anti-Patterns

### Global State Pollution

```typescript
// ❌ WRONG - Global state persists between tests
let globalCounter = 0;

test('first test', () => {
  globalCounter++;
  expect(globalCounter).toBe(1);
});

test('second test', () => {
  // This will fail - globalCounter is now 1, not 0
  expect(globalCounter).toBe(0);  // FAILS
});

// ✅ CORRECT - Reset state in beforeEach
describe('Tests', () => {
  let counter: number;
  
  beforeEach(() => {
    counter = 0;  // Fresh state for each test
  });
  
  test('first test', () => {
    counter++;
    expect(counter).toBe(1);
  });
  
  test('second test', () => {
    expect(counter).toBe(0);  // PASSES
  });
});
```

### Improper Mock Cleanup

```typescript
// ❌ WRONG - Mocks persist across tests
test('first test', () => {
  jest.spyOn(console, 'log').mockImplementation();
  // Mock not cleaned up
});

test('second test', () => {
  console.log('test');  // Still mocked from previous test
});

// ✅ CORRECT - Always clean up mocks
afterEach(() => {
  jest.restoreAllMocks();  // Restore all mocks
});
```

## Test File Organization

### Test Structure

```typescript
describe('ComponentName', () => {
  // Setup and teardown
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset component state
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
    // Clean up resources
  });
  
  // Group related tests
  describe('when user is authenticated', () => {
    test('should render user content', () => {
      // Test implementation
    });
  });
  
  describe('when user is not authenticated', () => {
    test('should render login prompt', () => {
      // Test implementation
    });
  });
  
  // Error cases
  describe('error handling', () => {
    test('should handle network errors gracefully', () => {
      // Error test implementation
    });
  });
});
```

## Required Test Setup Checklist

Before writing tests:

1. ✅ **Mock setup in beforeEach** - Fresh state for each test
2. ✅ **Mock cleanup in afterEach** - Use `jest.restoreAllMocks()`
3. ✅ **Browser API mocking** - Use `Object.defineProperty`, not `delete`
4. ✅ **Error boundary testing** - Test both success and failure cases
5. ✅ **Async handling** - Properly await async operations
6. ✅ **State isolation** - No shared state between tests

## Jest Command Line Usage

### Running Specific Tests

```bash
# ✅ CORRECT - Use --testPathPatterns (with 's')
npm test -- --testPathPatterns=email-service.test.ts --run
npm test -- --testPathPatterns="auth.*test" --run

# ❌ WRONG - Old deprecated syntax
npm test -- --testPathPattern=email-service.test.ts --run  # Will show deprecation warning
```

### Common Jest CLI Options

```bash
# Run specific test file
npm test -- --testPathPatterns=filename.test.ts

# Run tests matching pattern
npm test -- --testPathPatterns="auth|email"

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run tests in specific directory
npm test -- --testPathPatterns="src/lib"

# Run single test by name
npm test -- --testNamePattern="should handle errors"
```

### Jest Configuration Notes

- `--testPathPattern` was deprecated in favor of `--testPathPatterns`
- Always use the plural form to avoid deprecation warnings
- Use quotes around patterns with special characters
- The `--run` flag prevents watch mode in CI environments

This ensures reliable, maintainable test suites.
