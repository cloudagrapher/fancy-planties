# Design Document

## Overview

This design outlines a comprehensive approach to fix all 121 failing tests and establish robust testing practices. The solution addresses test infrastructure issues, component testing problems, service layer validation, and specific database-driven card display issues. The design prioritizes fixing critical infrastructure first, then component-specific issues, and finally implementing enhanced test coverage.

## Architecture

### Testing Infrastructure Layer
```
┌─────────────────────────────────────────────────────────────┐
│                    Test Infrastructure                       │
├─────────────────────────────────────────────────────────────┤
│ • Jest Configuration & Setup                                │
│ • Browser API Mocking (localStorage, navigator, etc.)      │
│ • Next.js API Mocking (Request, Response)                  │
│ • JSDOM Environment Configuration                           │
│ • CSS-in-JS Testing Support                                │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Component Testing Layer                   │
├─────────────────────────────────────────────────────────────┤
│ • React Testing Library Utilities                          │
│ • Component Mocking Strategies                             │
│ • Accessibility Testing Tools                              │
│ • Visual Regression Testing                                │
│ • Responsive Design Testing                                │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Service Testing Layer                     │
├─────────────────────────────────────────────────────────────┤
│ • Database Query Mocking                                   │
│ • API Route Testing                                        │
│ • Business Logic Validation                                │
│ • Error Handling Testing                                   │
│ • Integration Testing                                      │
└─────────────────────────────────────────────────────────────┘
```

### Test Categories and Priority

1. **Critical Infrastructure** (Priority 1)
   - Jest setup and configuration
   - Browser API mocking
   - Next.js compatibility

2. **Component Tests** (Priority 2)
   - PlantCard, SearchResults, CareDashboard
   - All form components (7 forms total)
   - Form validation and accessibility
   - Modal and navigation components

3. **Service Layer Tests** (Priority 3)
   - CareCalculator implementation
   - Database statistics services
   - API route handlers

4. **Integration Tests** (Priority 4)
   - End-to-end workflows
   - Component integration
   - Data flow validation

## Components and Interfaces

### Test Infrastructure Components

#### Jest Configuration Enhancement
```typescript
// jest.config.js enhancements
interface JestConfig {
  testEnvironment: 'jsdom';
  setupFilesAfterEnv: string[];
  moduleNameMapping: Record<string, string>;
  transform: Record<string, string>;
  collectCoverageFrom: string[];
  coverageThreshold: {
    global: {
      branches: number;
      functions: number;
      lines: number;
      statements: number;
    };
  };
}
```

#### Browser API Mocking Service
```typescript
interface BrowserAPIMocks {
  setupLocalStorage(): void;
  setupNavigator(): void;
  setupMatchMedia(): void;
  setupIntersectionObserver(): void;
  setupResizeObserver(): void;
  setupGetComputedStyle(): void;
  cleanup(): void;
}
```

#### Component Testing Utilities
```typescript
interface ComponentTestUtils {
  renderWithProviders(component: ReactElement, options?: RenderOptions): RenderResult;
  createMockUser(): UserEvent;
  mockNextRouter(overrides?: Partial<NextRouter>): void;
  waitForLoadingToFinish(): Promise<void>;
  expectAccessibleName(element: HTMLElement, name: string): void;
}
```

#### Form Testing Utilities
```typescript
interface FormTestUtils {
  fillForm(formData: Record<string, string>): Promise<void>;
  submitForm(): Promise<void>;
  expectValidationError(fieldName: string, errorMessage: string): void;
  expectFormSubmission(expectedData: Record<string, any>): void;
  testFormAccessibility(formElement: HTMLElement): void;
  testKeyboardNavigation(formElement: HTMLElement): Promise<void>;
}

interface FormTestSuite {
  testValidation(): void;
  testSubmission(): void;
  testErrorHandling(): void;
  testAccessibility(): void;
  testLoadingStates(): void;
  testKeyboardNavigation(): void;
}
```

#### Image Upload Testing Utilities
```typescript
interface ImageUploadTestUtils {
  createMockFile(name: string, size: number, type: string): File;
  simulateFileSelection(files: File[]): Promise<void>;
  simulateDragAndDrop(files: File[]): Promise<void>;
  expectUploadProgress(percentage: number): void;
  expectImagePreview(src: string): void;
  expectUploadError(errorMessage: string): void;
}

interface ImageGalleryTestUtils {
  expectImageCount(count: number): void;
  expectImageSrc(index: number, src: string): void;
  simulateImageClick(index: number): Promise<void>;
  expectImageAccessibility(index: number): void;
  testKeyboardNavigation(): Promise<void>;
}
```

#### Plant Editing Testing Utilities
```typescript
interface PlantEditTestUtils {
  loadPlantForEditing(plantId: number): Promise<void>;
  expectFieldValue(fieldName: string, value: string): void;
  updateField(fieldName: string, newValue: string): Promise<void>;
  saveChanges(): Promise<void>;
  cancelChanges(): Promise<void>;
  expectUnsavedChangesWarning(): void;
}
```

### Database Statistics Testing

#### Statistics Service Interface
```typescript
interface StatisticsService {
  getGuideStatistics(userId: number): Promise<GuideStats>;
  getPropagationStatistics(userId: number): Promise<PropagationStats>;
  getPlantCareStatistics(userId: number): Promise<PlantCareStats>;
}

interface GuideStats {
  totalGuides: number;
  publicGuides: number;
  privateGuides: number;
  mostCommonLevel: string | null;
}

interface PropagationStats {
  totalPropagations: number;
  successRate: number;
  avgDaysToEstablish: number;
  activePropagations: number;
}

interface PlantCareStats {
  totalPlants: number;
  careStreak: number;
  weeklyEvents: number;
  consistencyPercentage: number;
  consistencyRating: 'Poor' | 'Good' | 'Excellent';
}
```

#### Card Component Testing Interface
```typescript
interface CardTestSuite {
  testZeroStates(): void;
  testLoadingStates(): void;
  testErrorStates(): void;
  testDataFormatting(): void;
  testAccessibility(): void;
  testResponsiveLayout(): void;
}
```

## Data Models

### Test Data Factories

#### Form Test Data
```typescript
interface FormTestData {
  signIn: {
    validEmail: string;
    validPassword: string;
    invalidEmail: string;
    weakPassword: string;
  };
  signUp: {
    validUser: {
      email: string;
      password: string;
      confirmPassword: string;
      name: string;
    };
    invalidUser: {
      email: string;
      password: string;
      confirmPassword: string;
    };
  };
  plantTaxonomy: {
    validPlant: {
      family: string;
      genus: string;
      species: string;
      commonName: string;
    };
    invalidPlant: {
      family: string;
      genus: string;
    };
  };
  plantInstance: {
    validInstance: {
      nickname: string;
      location: string;
      acquiredDate: string;
      careSchedule: object;
    };
  };
  careGuide: {
    validGuide: {
      title: string;
      content: string;
      isPublic: boolean;
      difficulty: string;
    };
  };
  quickCare: {
    validCare: {
      plantId: number;
      careType: string;
      careDate: string;
      notes: string;
    };
  };
  propagation: {
    validPropagation: {
      parentPlantId: number;
      method: string;
      startDate: string;
      notes: string;
    };
  };
  imageUpload: {
    validImage: File;
    invalidImage: File;
    largeImage: File;
    unsupportedFormat: File;
  };
  plantEdit: {
    existingPlant: {
      id: number;
      nickname: string;
      location: string;
      notes: string;
      images: string[];
    };
    updatedPlant: {
      nickname: string;
      location: string;
      notes: string;
    };
  };
}
```

#### Plant Test Data
```typescript
interface PlantTestData {
  id: number;
  nickname: string;
  scientificName: string;
  location: string;
  status: 'healthy' | 'needs_attention' | 'critical';
  lastCareDate: Date | null;
  nextCareDate: Date | null;
  careStreak: number;
  images: string[];
}

const createMockPlant = (overrides?: Partial<PlantTestData>): PlantTestData => ({
  id: 1,
  nickname: 'My Monstera',
  scientificName: 'Monstera deliciosa',
  location: 'Living Room',
  status: 'healthy',
  lastCareDate: new Date('2024-01-01'),
  nextCareDate: new Date('2024-01-08'),
  careStreak: 5,
  images: [],
  ...overrides
});
```

#### Care Dashboard Test Data
```typescript
interface CareDashboardTestData {
  statistics: {
    overdueCount: number;
    dueTodayCount: number;
    dueSoonCount: number;
    totalPlants: number;
  };
  overdue: PlantTestData[];
  dueToday: PlantTestData[];
  dueSoon: PlantTestData[];
  recentlyCared: PlantTestData[];
}
```

### Mock Data Generators

#### Statistics Mock Generator
```typescript
class StatisticsMockGenerator {
  static generateGuideStats(overrides?: Partial<GuideStats>): GuideStats {
    return {
      totalGuides: 0,
      publicGuides: 0,
      privateGuides: 0,
      mostCommonLevel: null,
      ...overrides
    };
  }

  static generatePropagationStats(overrides?: Partial<PropagationStats>): PropagationStats {
    return {
      totalPropagations: 1,
      successRate: 0,
      avgDaysToEstablish: 0,
      activePropagations: 1,
      ...overrides
    };
  }

  static generatePlantCareStats(overrides?: Partial<PlantCareStats>): PlantCareStats {
    return {
      totalPlants: 186,
      careStreak: 0,
      weeklyEvents: 0,
      consistencyPercentage: 100,
      consistencyRating: 'Excellent',
      ...overrides
    };
  }
}
```

## Error Handling

### Test Error Categories

#### Infrastructure Errors
```typescript
enum TestInfrastructureError {
  JSDOM_NOT_CONFIGURED = 'jsdom_not_configured',
  BROWSER_API_NOT_MOCKED = 'browser_api_not_mocked',
  NEXTJS_API_NOT_AVAILABLE = 'nextjs_api_not_available',
  CSS_COMPUTED_STYLE_ERROR = 'css_computed_style_error'
}
```

#### Component Test Errors
```typescript
enum ComponentTestError {
  ELEMENT_NOT_FOUND = 'element_not_found',
  ROLE_NOT_ACCESSIBLE = 'role_not_accessible',
  ASYNC_OPERATION_TIMEOUT = 'async_operation_timeout',
  MOCK_NOT_CALLED = 'mock_not_called'
}
```

### Error Recovery Strategies

#### Graceful Fallbacks
```typescript
interface TestErrorHandler {
  handleMissingElement(selector: string): HTMLElement | null;
  handleAsyncTimeout(operation: string): Promise<void>;
  handleMockFailure(mockName: string): void;
  retryWithBackoff<T>(operation: () => Promise<T>, maxRetries: number): Promise<T>;
}
```

## Testing Strategy

### Phase 1: Infrastructure Fixes
1. **Jest Setup Enhancement**
   - Fix jsdom configuration
   - Add proper browser API mocks
   - Configure CSS-in-JS support
   - Set up Next.js compatibility

2. **Mock Implementation**
   - localStorage/sessionStorage mocks
   - navigator API mocks
   - matchMedia mock
   - getComputedStyle mock with CSS variable support

### Phase 2: Component Test Fixes
1. **PlantCard Component**
   - Add proper role attributes
   - Fix accessibility testing
   - Implement proper event handling tests
   - Add loading and error state tests

2. **SearchResults Component**
   - Fix loading state rendering
   - Implement proper suggestion testing
   - Add filter integration tests
   - Fix async operation handling

3. **CareDashboard Component**
   - Fix data structure handling
   - Implement proper statistics display tests
   - Add error boundary testing
   - Fix pull-to-refresh functionality

4. **Form Components (7 Forms)**
   - **SignInForm & SignUpForm**: Authentication validation, error handling, accessibility
   - **PlantTaxonomyForm & PlantInstanceForm**: Plant data validation, taxonomy selection, care setup
   - **CareGuideForm**: Content validation, publishing workflow, rich text handling
   - **QuickCareForm**: Care logging, date validation, notes handling
   - **PropagationForm**: Propagation tracking, method selection, progress updates
   - **Universal Form Testing**: Validation patterns, error display, loading states, keyboard navigation

5. **Image Upload and Management**
   - **PlantImageUpload**: File selection, drag-and-drop, validation, preview
   - **PlantImageGallery**: Display, navigation, optimization, accessibility
   - **Image Processing**: Resize, compression, format conversion, error handling
   - **Upload Progress**: Progress indicators, cancellation, retry functionality

6. **Plant Editing Workflows**
   - **Plant Edit Form**: Load existing data, field updates, validation
   - **Plant Detail Modal**: View/edit toggle, inline editing, save/cancel
   - **Bulk Plant Operations**: Multi-select, batch updates, confirmation dialogs
   - **Plant Deletion**: Confirmation workflows, cascade handling, undo functionality

### Phase 3: Service Layer Implementation
1. **CareCalculator Service**
   - Implement all missing methods
   - Add comprehensive business logic tests
   - Handle edge cases and error conditions
   - Add date calculation validation

2. **Statistics Services**
   - Implement guide statistics calculation
   - Add propagation success rate calculation
   - Implement care streak and consistency logic
   - Add proper error handling for database failures

### Phase 4: Integration and Coverage
1. **End-to-End Workflows**
   - Plant management integration
   - Search and filter integration
   - Care tracking workflows
   - Authentication flows

2. **Coverage Enhancement**
   - Achieve 80%+ coverage for critical components
   - Add regression tests for fixed bugs
   - Implement performance testing
   - Add accessibility compliance testing

## Implementation Approach

### Test-Driven Development Process
1. **Red Phase**: Write failing tests that capture the expected behavior
2. **Green Phase**: Implement minimal code to make tests pass
3. **Refactor Phase**: Improve code quality while maintaining test coverage

### Continuous Integration Integration
1. **Pre-commit Hooks**: Run tests and linting before commits
2. **Pull Request Validation**: All tests must pass before merge
3. **Coverage Reporting**: Track coverage trends over time
4. **Performance Monitoring**: Track test execution time

### Documentation and Standards
1. **Test Writing Guidelines**: Consistent patterns and naming
2. **Mock Strategy Documentation**: When and how to mock dependencies
3. **Accessibility Testing Standards**: WCAG compliance validation
4. **Performance Testing Benchmarks**: Acceptable thresholds and metrics

This comprehensive design ensures that all failing tests are systematically addressed while establishing robust testing practices for future development.