# Implementation Plan

## Phase 1: Critical Test Infrastructure Fixes (Priority 1 - Fix Failing Tests First)

- [x] 1. Run Test Suite and Analyze Failures
  - Execute `npm test` to get current failure report
  - Categorize the 121 failing tests by error type
  - Identify the most common failure patterns
  - Create priority list based on number of affected tests
  - _Requirements: 1.1_

## Phase 1A: Immediate Infrastructure Fixes (Fix Blocking Issues)

- [x] 1.1 Fix "Request is not defined" Errors (Affects API route tests)
  - Add proper Next.js Request/Response mocking in jest.setup.js
  - Fix API route test files that import Next.js server components
  - Update test environment configuration for API routes
  - _Requirements: 1.5_

- [x] 1.2 Fix "localStorage.clear is not a function" Errors
  - Implement proper localStorage mock with all methods (clear, getItem, setItem, removeItem)
  - Fix sessionStorage mock with complete API
  - Update jest.setup.js with proper storage mocks
  - _Requirements: 1.4_

- [x] 1.3 Fix "window.getComputedStyle not implemented" Errors
  - Create comprehensive getComputedStyle mock that handles CSS variables
  - Add support for pseudo-elements (:focus-visible, ::after)
  - Handle RGB to hex color conversion in computed styles
  - Mock CSS custom properties (var(--color-mint-400) → #34d399)
  - _Requirements: 1.2_

- [x] 1.4 Fix "Cannot redefine property: vibrate" Errors
  - Implement proper navigator.vibrate mocking strategy
  - Use jest.spyOn instead of Object.defineProperty for browser APIs
  - Add proper cleanup in beforeEach/afterEach hooks
  - _Requirements: 1.2_

- [x] 1.5 Fix Test Suite File Issues
  - Fix src/__tests__/utils/test-utils.tsx (empty test suite error)
  - Add proper test cases or convert to utility-only file
  - Fix circular dependency issues in test imports
  - _Requirements: 1.1_

## Phase 2: Fix Specific Failing Component Tests (Priority 2 - Address Individual Test Failures)

- [ ] 2. Fix PlantCard Component Tests (10 failing tests)
  - Fix "Unable to find accessible element with role 'button'" - add role="button" to card
  - Fix "Unable to find text 'Living Room'" - check text rendering with location icon
  - Fix "Unable to find text 'Overdue'" - fix care status display logic
  - Fix "Unable to find text 'Due in 3 days'" - fix date formatting in care display
  - Fix "Unable to find text 'Excellent'" - fix care streak status display
  - Add proper loading state with role="status" attribute
  - Fix hover state testing for care action buttons
  - _Requirements: 3.1_

- [ ] 2.1 Fix SearchResults Component Tests (2 failing tests)
  - Fix "Unable to find text 'Loading...'" - SearchResults shows skeleton instead of text
  - Fix loading button disable state - button should be disabled during loading
  - Update test expectations to match actual component implementation
  - _Requirements: 3.2_

- [ ] 2.2 Fix CareDashboard Component Tests (12 failing tests)
  - Fix "Cannot read properties of undefined (reading 'overdueCount')" - mock dashboardData.statistics properly
  - Fix component crash by providing complete mock data structure
  - Add proper loading state handling when data is undefined
  - Fix error state text matching ("Try Again" vs "Try again")
  - Add data-testid="care-dashboard" for pull-to-refresh testing
  - Mock useDashboardData hook properly with all required fields
  - _Requirements: 3.3_

- [ ] 2.3 Fix AdvancedSearchInterface Component Tests (5 failing tests)
  - Fix "Unable to find text 'Suggestions'" - component doesn't show suggestions text
  - Fix "Unable to find text 'monstera deliciosa'" - suggestion rendering issue
  - Fix "Unable to find text 'Saved Searches'" - presets dropdown not implemented
  - Fix "Unable to find button with name /clear/i" - clear button needs proper aria-label
  - Fix loading state disable - search button should be disabled when loading
  - Fix initial filters not being called - onFiltersChange should be called on mount
  - _Requirements: 3.2_

- [ ] 2.4 Implement Image Upload and Display Testing
  - Test file selection with drag-and-drop simulation
  - Test image validation (size, format, dimensions)
  - Test upload progress indicators and cancellation
  - Test image preview functionality
  - Test PlantImageGallery navigation and accessibility
  - Test image optimization and lazy loading
  - _Requirements: 3.2.8, 3.2.9_

- [ ] 2.5 Implement Plant Editing Workflow Testing
  - Test plant edit form with existing data loading
  - Test field updates and validation during editing
  - Test save/cancel functionality with unsaved changes warning
  - Test plant detail modal view/edit toggle
  - Test bulk plant operations and confirmation dialogs
  - Test plant deletion workflow with cascade handling
  - _Requirements: 3.2.10_

## Phase 3: Fix Design System and Visual Tests (Priority 2 - CSS and Style Testing)

- [ ] 3. Fix Visual Regression Tests (12 failing tests)
  - Fix color format mismatches: expect RGB format (rgb(255, 255, 255)) instead of hex ("white")
  - Fix CSS variable resolution: expect var(--color-mint-400) instead of #34d399
  - Fix border color tests: expect rgb(220, 38, 38) instead of #dc2626
  - Fix responsive width tests: computed styles return empty string for unset properties
  - Update all color expectations to match getComputedStyle RGB format
  - _Requirements: 2.1_

- [ ] 3.1 Fix Mobile Touch Target Tests (8 failing tests)
  - Fix "expect(styles.touchAction).toBe('manipulation')" - property returns undefined
  - Fix touch target size calculations returning NaN - mock getBoundingClientRect properly
  - Fix responsive flexDirection tests - computed styles return empty string
  - Fix haptic feedback tests - navigator.vibrate mock not being called
  - Fix "Cannot redefine property: vibrate" - use proper mock cleanup
  - Add proper CSS property mocking for touch-action and flex properties
  - _Requirements: 2.2, 2.3_

- [ ] 3.2 Fix Accessibility Compliance Tests (4 failing tests)
  - Fix color contrast ratio calculation returning 2.85 instead of >3
  - Fix "Interactive element missing accessible name" - add proper aria-label to inputs
  - Fix "NotFoundError: node to be removed is not a child" - screen reader announcement cleanup
  - Fix reduced motion test expecting "animation: none" but getting duration override
  - Fix getComputedStyle pseudo-element support for ::after and :focus-visible
  - _Requirements: 2.5_

## Phase 4: Fix Service Layer Tests (Priority 3 - Business Logic)

- [ ] 4. Fix CareCalculator Service Tests (30 failing tests)
  - Fix "calculator.calculateNextDueDate is not a function" - implement missing method
  - Fix "calculator.parseScheduleString is not a function" - implement missing method  
  - Fix "calculator.calculateCareUrgency is not a function" - implement missing method
  - Fix "calculator.getDaysUntilDue is not a function" - implement missing method
  - Fix "calculator.getCareStatus is not a function" - implement missing method
  - Fix "calculator.calculateCareStreak is not a function" - implement missing method
  - Fix "calculator.getOptimalCareSchedule is not a function" - implement missing method
  - Create complete CareCalculator class with all required methods
  - _Requirements: 4.1_

- [ ] 4.1 Fix OfflineService Tests (8 failing tests)
  - Fix "localStorage.clear is not a function" - implement complete localStorage mock
  - Fix all OfflineService test methods that depend on localStorage
  - Add proper storage mock with getItem, setItem, removeItem, clear methods
  - Test offline data caching and retrieval functionality
  - Test pending care entry management
  - _Requirements: 4.2_

- [ ] 4.2 Fix API Route Tests (Test suite failed to run)
  - Fix "ReferenceError: Request is not defined" in plant-instances API tests
  - Fix "ReferenceError: Request is not defined" in advanced search API tests  
  - Add proper Next.js Request/Response mocking for API test environment
  - Fix test environment configuration for API routes vs component tests
  - _Requirements: 4.3_

## Phase 5: Run Tests and Verify Fixes (Priority 1 - Continuous Validation)

- [ ] 5. Execute Test Suite After Each Phase
  - Run `npm test` after completing Phase 1A infrastructure fixes
  - Verify that infrastructure errors are resolved before proceeding
  - Run tests after each component fix to ensure no regressions
  - Track progress: aim to reduce failing tests from 121 to 0
  - _Requirements: 1.1_

- [ ] 5.1 Fix Remaining Component Integration Tests
  - Fix Component Integration tests (11 failing) - CSS variable and color format issues
  - Fix Mobile Usability tests (5 failing) - touch-action and layout issues  
  - Fix Integration Plant Management test - Request is not defined error
  - Address any remaining test failures discovered during execution
  - _Requirements: 3.1, 3.2_

- [ ] 5.2 Validate Database Card Display Issues
  - Test guide statistics cards showing "0 Total Guides", "0 Public", "0 Private"
  - Test propagation statistics showing "1 Total Propagations", "0% Success Rate"
  - Test plant care statistics showing "186 Plants", "Care Streak 0", "Consistency 100%"
  - Ensure proper data formatting and fallback handling
  - _Requirements: 3.1.1, 3.1.2, 3.1.3_

## Phase 6: Final Test Suite Validation (Priority 1 - Ensure All Tests Pass)

- [ ] 6. Complete Test Suite Execution
  - Run full `npm test` suite to verify all 381 tests pass
  - Address any remaining test failures not covered in previous phases
  - Verify test execution completes without hanging or timeouts
  - Confirm no test environment errors or warnings
  - _Requirements: 7.5_

- [ ] 6.1 Test Coverage and Quality Validation
  - Check that test coverage meets minimum thresholds (80%+ for critical components)
  - Verify all database card display scenarios are properly tested
  - Ensure form validation and submission workflows are covered
  - Validate image upload and plant editing functionality testing
  - _Requirements: 7.1, 7.2_

- [ ] 6.2 Documentation and Standards
  - Document the test fixes and patterns used
  - Create guidelines for preventing similar test failures
  - Set up CI/CD integration to catch test failures early
  - Establish test maintenance procedures
  - _Requirements: 8.1, 8.2, 8.5_