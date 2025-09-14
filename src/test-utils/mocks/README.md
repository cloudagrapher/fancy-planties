# Component Mock System

This directory contains a comprehensive component mocking system designed to provide lightweight, consistent mocks that don't cause import issues during testing.

## Overview

The component mock system provides:

- **Lightweight mocks** that render predictable DOM structures
- **Call tracking** for testing component interactions
- **Selective mocking** for specific test needs
- **Type safety** with full TypeScript support
- **Consistent behavior** across all test environments

## Core Functions

### `createMockComponent(displayName, defaultProps)`

Creates a simple mock component that renders children and props.

```typescript
import { createMockComponent } from '@/test-utils/mocks/component-mocks';

const MockButton = createMockComponent('Button', {
  type: 'button',
  className: 'btn',
});

// Usage in tests
render(<MockButton onClick={handleClick}>Click me</MockButton>);
expect(screen.getByTestId('mock-button')).toBeInTheDocument();
```

### `createTrackingMockComponent(displayName, options)`

Creates a mock component that tracks its calls and props for testing interactions.

```typescript
import { createTrackingMockComponent } from '@/test-utils/mocks/component-mocks';

const MockForm = createTrackingMockComponent('Form', {
  renderContent: (props, children) => {
    return React.createElement('form', {
      onSubmit: props.onSubmit,
      'data-testid': 'mock-form',
    }, children);
  },
});

// Usage in tests
render(<MockForm onSubmit={handleSubmit}>Form content</MockForm>);

// Check call tracking
expect(MockForm.getCallCount()).toBe(1);
expect(MockForm.getLastCall()?.props.onSubmit).toBe(handleSubmit);
```

### `mockComponent(modulePath, componentName, mockImplementation)`

Mocks a specific component from a module using Jest's module mocking.

```typescript
import { mockComponent, createMockComponent } from '@/test-utils/mocks/component-mocks';

// Mock a specific component
mockComponent(
  '@/components/shared/LoadingSpinner',
  'LoadingSpinner',
  createMockComponent('LoadingSpinner', { 'aria-label': 'Loading' })
);
```

### `mockComponents(modulePath, componentMocks)`

Mocks multiple components from a single module.

```typescript
import { mockComponents } from '@/test-utils/mocks/component-mocks';

mockComponents('@/components/auth', {
  SignInForm: { defaultProps: { 'data-testid': 'signin-form' } },
  SignUpForm: { defaultProps: { 'data-testid': 'signup-form' } },
  LogoutButton: { defaultProps: { 'data-testid': 'logout-button' } },
});
```

## Predefined Mock Collections

The system includes predefined mocks for all major component categories:

### Shared Components (`sharedComponentMocks`)

- `LoadingSpinner` - Loading indicators with proper ARIA attributes
- `Modal` - Modal dialogs with conditional rendering
- `ErrorDisplay` - Error messages with alert roles
- `AsyncButton` - Buttons with loading states
- `ImageUpload` - File upload components
- `OptimizedImage` - Image components with optimization attributes

### Authentication Components (`authComponentMocks`)

- `SignInForm` - Login forms with email/password fields
- `SignUpForm` - Registration forms
- `LogoutButton` - Sign out buttons
- `AuthGuard` - Route protection components
- `AdminGuard` - Admin-only access components

### Plant Components (`plantComponentMocks`)

- `PlantCard` - Plant display cards
- `PlantInstanceForm` - Plant creation/editing forms
- `PlantsGrid` - Plant grid layouts
- `PlantSelector` - Plant selection components
- `PlantTaxonomySelector` - Taxonomy selection

### Care Components (`careComponentMocks`)

- `QuickCareForm` - Care logging forms
- `CareHistoryTimeline` - Care history displays
- `CareTaskCard` - Care task items
- `QuickCareActions` - Quick care buttons

### Navigation Components (`navigationComponentMocks`)

- `BottomNavigation` - Bottom navigation bars
- `AdminNavigation` - Admin navigation menus

### Import Components (`importComponentMocks`)

- `CSVImportModal` - CSV import dialogs
- `DataImport` - Data import components
- `FileUpload` - File upload interfaces

### Admin Components (`adminComponentMocks`)

- `PlantApprovalQueue` - Plant approval interfaces
- `UserManagementClient` - User management tables
- `AdminDashboardClient` - Admin dashboard components

## Selective Mocking

Use selective mocking to mock only specific component categories:

```typescript
import { selectiveMocks } from '@/test-utils/mocks/component-mocks';

// Mock only loading and error components
selectiveMocks.loadingAndError();

// Mock only form components
selectiveMocks.forms();

// Mock only display components (no interactive elements)
selectiveMocks.display();

// Mock only navigation components
selectiveMocks.navigation();

// Mock only authentication components
selectiveMocks.auth();

// Mock only admin components
selectiveMocks.admin();
```

## Applying All Mocks

For comprehensive testing, apply all common mocks:

```typescript
import { applyCommonMocks, applyAdminMocks } from '@/test-utils/mocks/component-mocks';

// Apply all common component mocks
applyCommonMocks();

// Apply admin-specific mocks (includes common mocks)
applyAdminMocks();
```

## Mock Factory

Create custom mocks on demand using the MockFactory:

```typescript
import { MockFactory } from '@/test-utils/mocks/component-mocks';

// Create a single custom mock
const CustomMock = MockFactory.create('CustomComponent', {
  defaultProps: { 'data-custom': 'true' },
  renderContent: (props, children) => {
    return React.createElement('div', {
      'data-testid': 'custom-component',
      'data-value': props.value,
    }, children);
  },
});

// Create multiple mocks at once
const mocks = MockFactory.createBatch({
  ComponentA: { defaultProps: { type: 'A' } },
  ComponentB: { defaultProps: { type: 'B' } },
});

// Retrieve a previously created mock
const existingMock = MockFactory.get('CustomComponent');

// Clear all factory-created mocks
MockFactory.clear();
```

## Testing Patterns

### Basic Component Rendering

```typescript
import { render, screen } from '@testing-library/react';
import { sharedComponentMocks } from '@/test-utils/mocks/component-mocks';

test('renders loading spinner', () => {
  const { LoadingSpinner } = sharedComponentMocks;
  
  render(<LoadingSpinner />);
  
  expect(screen.getByTestId('mock-loadingspinner')).toBeInTheDocument();
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});
```

### Testing Component Interactions

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { authComponentMocks } from '@/test-utils/mocks/component-mocks';

test('tracks form submissions', () => {
  const { SignInForm } = authComponentMocks;
  const handleSubmit = jest.fn();
  
  render(<SignInForm onSubmit={handleSubmit} />);
  
  fireEvent.submit(screen.getByTestId('signin-form'));
  
  expect(SignInForm.getCallCount()).toBe(1);
  expect(SignInForm.getLastCall()?.props.onSubmit).toBe(handleSubmit);
});
```

### Testing Conditional Rendering

```typescript
import { render, screen } from '@testing-library/react';
import { sharedComponentMocks } from '@/test-utils/mocks/component-mocks';

test('modal shows/hides based on isOpen prop', () => {
  const { Modal } = sharedComponentMocks;
  
  const { rerender } = render(
    <Modal isOpen={false}>Hidden content</Modal>
  );
  
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  
  rerender(<Modal isOpen={true}>Visible content</Modal>);
  
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByText('Visible content')).toBeInTheDocument();
});
```

### Testing with Props

```typescript
import { render, screen } from '@testing-library/react';
import { plantComponentMocks } from '@/test-utils/mocks/component-mocks';

test('plant card displays plant information', () => {
  const { PlantCard } = plantComponentMocks;
  const plant = {
    id: 1,
    nickname: 'My Fiddle Leaf Fig',
    location: 'Living Room',
  };
  
  render(<PlantCard plant={plant} showCareStatus={true} />);
  
  const card = screen.getByTestId('plant-card');
  expect(card).toHaveAttribute('data-plant-id', '1');
  expect(screen.getByText('My Fiddle Leaf Fig')).toBeInTheDocument();
  expect(screen.getByText('Living Room')).toBeInTheDocument();
  expect(screen.getByTestId('care-status')).toBeInTheDocument();
});
```

## Cleanup and Reset

Always reset mocks between tests to prevent state leakage:

```typescript
import { resetComponentMocks } from '@/test-utils/mocks/component-mocks';

describe('Component Tests', () => {
  beforeEach(() => {
    resetComponentMocks();
  });
  
  // Your tests here
});
```

## Best Practices

### 1. Use Appropriate Mock Types

- Use `createMockComponent` for simple display components
- Use `createTrackingMockComponent` for interactive components that need call tracking
- Use selective mocking to avoid over-mocking

### 2. Test Data Attributes

Mock components include `data-testid` and other data attributes for easy testing:

```typescript
// Mock components automatically include test IDs
expect(screen.getByTestId('mock-loadingspinner')).toBeInTheDocument();

// And component-specific data attributes
expect(screen.getByTestId('plant-card')).toHaveAttribute('data-plant-id', '1');
```

### 3. Verify Mock Behavior

Test that mocks behave as expected:

```typescript
test('async button shows loading state', () => {
  const { AsyncButton } = sharedComponentMocks;
  
  const { rerender } = render(
    <AsyncButton loading={false}>Save</AsyncButton>
  );
  
  expect(screen.getByText('Save')).toBeInTheDocument();
  
  rerender(<AsyncButton loading={true}>Save</AsyncButton>);
  
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});
```

### 4. Mock Only What You Need

Use selective mocking to avoid unnecessary complexity:

```typescript
// Instead of mocking everything
applyCommonMocks();

// Mock only what your test needs
selectiveMocks.forms();
```

### 5. Clean Up After Tests

Always reset mock state to prevent test interference:

```typescript
afterEach(() => {
  resetComponentMocks();
});
```

## TypeScript Support

All mocks are fully typed with TypeScript interfaces:

```typescript
interface TrackingMockComponent extends React.FC<any> {
  getCalls: () => MockComponentCall[];
  getLastCall: () => MockComponentCall | undefined;
  getCallCount: () => number;
  clearCalls: () => void;
}

interface MockComponentCall {
  props: Record<string, any>;
  children?: React.ReactNode;
  timestamp: Date;
}
```

This ensures type safety and proper IDE support when working with mocks.

## Integration with Testing Libraries

The component mock system works seamlessly with:

- **Jest** - Module mocking and test isolation
- **React Testing Library** - Component rendering and interaction testing
- **TypeScript** - Full type safety and IDE support
- **Next.js** - Compatible with Next.js component patterns

## Troubleshooting

### Mock Not Applied

If a mock isn't being applied, ensure you're calling the mock function before importing the component:

```typescript
// ❌ Wrong order
import MyComponent from '@/components/MyComponent';
mockComponent('@/components/MyComponent', 'MyComponent', mockImpl);

// ✅ Correct order
mockComponent('@/components/MyComponent', 'MyComponent', mockImpl);
import MyComponent from '@/components/MyComponent';
```

### State Leakage Between Tests

If mock state is leaking between tests, ensure you're calling `resetComponentMocks()`:

```typescript
beforeEach(() => {
  resetComponentMocks();
});
```

### TypeScript Errors

If you encounter TypeScript errors, ensure you're importing from the TypeScript version:

```typescript
// ✅ Import from TypeScript version
import { createMockComponent } from '@/test-utils/mocks/component-mocks';

// ❌ Don't import from JavaScript version
import { createMockComponent } from '@/test-utils/mocks/component-mocks.js';
```

This component mock system provides a robust foundation for testing React components without the complexity and import issues of traditional mocking approaches.