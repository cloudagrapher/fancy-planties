# Design Document

## Overview

This design addresses systematic test failures across the plant tracker application by implementing a comprehensive testing infrastructure overhaul. The solution focuses on four key areas: database test mocking, component dependency management, browser API mocking consistency, and test environment isolation. The design ensures all tests can run reliably in CI/CD environments without external dependencies while maintaining realistic test scenarios.

## Architecture

### Test Infrastructure Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Execution Layer                     │
├─────────────────────────────────────────────────────────────┤
│  Jest Configuration │ Test Environment │ Coverage Reporting │
├─────────────────────────────────────────────────────────────┤
│                   Mock Management Layer                     │
├─────────────────────────────────────────────────────────────┤
│ Database Mocks │ Browser API Mocks │ Component Mocks      │
├─────────────────────────────────────────────────────────────┤
│                   Test Data Layer                          │
├─────────────────────────────────────────────────────────────┤
│ Plant Fixtures │ User Fixtures │ API Response Fixtures    │
├─────────────────────────────────────────────────────────────┤
│                 Test Utilities Layer                       │
├─────────────────────────────────────────────────────────────┤
│ Render Helpers │ Mock Factories │ Assertion Helpers       │
└─────────────────────────────────────────────────────────────┘
```

### Database Testing Strategy

Instead of requiring live PostgreSQL connections, implement a multi-tier mocking approach:

1. **In-Memory Database**: Use SQLite in-memory for integration tests that need real SQL operations
2. **Query Mocking**: Mock Drizzle ORM queries for unit tests
3. **Connection Mocking**: Mock database connection for tests that only need to verify query construction

### Component Testing Strategy

Implement comprehensive dependency injection for component tests:

1. **Hook Mocking**: Mock all custom hooks with realistic return values
2. **API Mocking**: Provide consistent fetch mocks with proper response formatting
3. **Browser API Mocking**: Mock all browser APIs used by components
4. **State Management**: Mock React Query and other state management libraries

## Components and Interfaces

### Database Mock System

```typescript
interface DatabaseMockConfig {
  useInMemory: boolean;
  mockQueries: boolean;
  seedData?: TestDataSeed;
}

interface TestDataSeed {
  users: TestUser[];
  plants: TestPlant[];
  plantInstances: TestPlantInstance[];
  propagations: TestPropagation[];
}

class DatabaseTestManager {
  setup(config: DatabaseMockConfig): Promise<void>;
  teardown(): Promise<void>;
  seedTestData(data: TestDataSeed): Promise<void>;
  clearTestData(): Promise<void>;
}
```

### Component Test Utilities

```typescript
interface ComponentTestConfig {
  mockUser?: TestUser;
  mockPlants?: TestPlant[];
  mockApiResponses?: Record<string, any>;
  mockHooks?: Record<string, any>;
}

interface TestRenderOptions extends RenderOptions {
  config?: ComponentTestConfig;
  wrapper?: ComponentType<any>;
}

function renderWithTestConfig(
  component: ReactElement,
  options?: TestRenderOptions
): RenderResult;
```

### Mock Factory System

```typescript
interface MockFactory<T> {
  create(overrides?: Partial<T>): T;
  createMany(count: number, overrides?: Partial<T>): T[];
  reset(): void;
}

class TestDataFactory {
  users: MockFactory<TestUser>;
  plants: MockFactory<TestPlant>;
  plantInstances: MockFactory<TestPlantInstance>;
  propagations: MockFactory<TestPropagation>;
  apiResponses: MockFactory<ApiResponse>;
}
```

### Browser API Mock Manager

```typescript
interface BrowserAPIMocks {
  navigator: MockNavigator;
  performance: MockPerformance;
  localStorage: MockStorage;
  sessionStorage: MockStorage;
  fetch: MockFetch;
}

class BrowserMockManager {
  setup(): BrowserAPIMocks;
  reset(): void;
  teardown(): void;
}
```

## Data Models

### Test Data Structures

```typescript
interface TestUser {
  id: number;
  email: string;
  username: string;
  createdAt: Date;
  isActive: boolean;
}

interface TestPlant {
  id: number;
  scientificName: string;
  commonName: string;
  family: string;
  genus: string;
  species: string;
}

interface TestPlantInstance {
  id: number;
  userId: number;
  plantId: number;
  nickname: string;
  location: string;
  acquiredDate: Date;
  isActive: boolean;
  lastWatered?: Date;
  lastFertilized?: Date;
}

interface TestPropagation {
  id: number;
  userId: number;
  plantInstanceId?: number;
  method: string;
  status: string;
  startDate: Date;
  notes?: string;
}
```

### Mock Response Schemas

```typescript
interface MockApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
  headers?: Record<string, string>;
}

interface MockFetchConfig {
  url: string | RegExp;
  method?: string;
  response: MockApiResponse;
  delay?: number;
}
```

## Error Handling

### Database Connection Errors

```typescript
class DatabaseMockError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly originalError?: Error
  ) {
    super(`Database mock error in ${operation}: ${message}`);
  }
}
```

### Component Rendering Errors

```typescript
class ComponentTestError extends Error {
  constructor(
    message: string,
    public readonly component: string,
    public readonly missingDependency?: string
  ) {
    super(`Component test error in ${component}: ${message}`);
  }
}
```

### Mock Configuration Errors

```typescript
class MockConfigurationError extends Error {
  constructor(
    message: string,
    public readonly mockType: string,
    public readonly suggestion?: string
  ) {
    super(`Mock configuration error for ${mockType}: ${message}`);
  }
}
```

## Testing Strategy

### Test Categories and Approaches

1. **Unit Tests**: Mock all external dependencies, focus on component logic
2. **Integration Tests**: Use in-memory database, mock browser APIs
3. **E2E Tests**: Mock external services, use real component interactions
4. **Performance Tests**: Mock performance APIs with predictable values
5. **Accessibility Tests**: Mock DOM APIs with ARIA support

### Test Environment Configuration

```typescript
interface TestEnvironmentConfig {
  database: {
    type: 'mock' | 'memory' | 'real';
    connectionString?: string;
    seedData?: boolean;
  };
  browser: {
    mockNavigator: boolean;
    mockPerformance: boolean;
    mockStorage: boolean;
  };
  network: {
    mockFetch: boolean;
    defaultResponses: MockFetchConfig[];
  };
  cleanup: {
    resetMocks: boolean;
    clearStorage: boolean;
    resetDOM: boolean;
  };
}
```

### Specific Fix Strategies

#### Database Test Fixes

1. **Replace live PostgreSQL**: Implement SQLite in-memory for integration tests
2. **Mock Drizzle queries**: Create query result mocks for unit tests
3. **Fix clearImmediate errors**: Polyfill Node.js APIs in Jest environment
4. **Timeout handling**: Implement proper async/await patterns with timeouts

#### Component Test Fixes

1. **PlantsGrid rendering**: Mock usePlantInstances hook with test data
2. **Pull-to-refresh functionality**: Mock getRefreshIndicatorStyle function
3. **API call verification**: Fix fetch mock assertions to match actual call format
4. **DOM element presence**: Ensure test data renders expected elements

#### Mock Consistency Fixes

1. **Navigator API**: Implement configurable navigator mock with proper cleanup
2. **Performance API**: Mock performance.now() and related methods consistently
3. **Storage APIs**: Implement proper localStorage/sessionStorage mocks
4. **Service Worker**: Mock registration and lifecycle methods

## Implementation Phases

### Phase 1: Core Infrastructure
- Set up database mocking system
- Implement test data factories
- Create browser API mock manager
- Update Jest configuration

### Phase 2: Component Test Fixes
- Fix PlantsGrid component tests
- Resolve pull-to-refresh functionality issues
- Update API call mocking and assertions
- Ensure proper DOM element rendering

### Phase 3: Integration Test Fixes
- Replace database connections with mocks
- Fix timeout and async handling issues
- Implement proper test data seeding
- Resolve clearImmediate errors

### Phase 4: Test Environment Optimization
- Implement test isolation and cleanup
- Optimize test execution speed
- Add comprehensive error reporting
- Validate CI/CD compatibility

### Phase 5: Quality Assurance
- Run full test suite validation
- Performance benchmarking
- Documentation updates
- Developer experience improvements

## Success Metrics

1. **Test Success Rate**: 100% of tests pass consistently
2. **Execution Time**: Full test suite completes in under 60 seconds
3. **Isolation**: No test state pollution between runs
4. **CI Compatibility**: Tests pass in CI environment without modifications
5. **Developer Experience**: Clear error messages and fast feedback loops