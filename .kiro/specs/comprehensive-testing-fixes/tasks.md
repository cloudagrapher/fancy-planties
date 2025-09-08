# Implementation Plan

- [x] 1. Diagnose and fix database integration test failures
  - Analyze the "getaddrinfo ENOTFOUND postgres" and "clearImmediate is not defined" errors
  - Determine if database connection issues indicate real configuration problems
  - Fix actual database connection setup if needed, or implement proper test mocking
  - Add clearImmediate polyfill and fix Node.js compatibility issues in Jest
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Investigate and fix PlantsGrid component issues
  - Analyze why plant cards aren't rendering (empty state vs missing data vs broken hooks)
  - Fix the missing getRefreshIndicatorStyle function in the actual component code
  - Investigate if usePlantInstances hook has real data fetching issues
  - Fix API parameter format issues if they indicate real backend problems
  - Update tests to match corrected component behavior
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Fix Jest environment and mock setup issues
  - Add missing Node.js polyfills (clearImmediate, etc.) to Jest setup
  - Fix navigator API mocking that's causing test instability
  - Investigate if mock failures indicate real browser API usage issues
  - Ensure proper test cleanup to prevent state pollution
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2_

- [x] 4. Create robust test infrastructure
  - Build database test utilities that work without live PostgreSQL
  - Create realistic test data that matches actual application data structures
  - Implement component test helpers that properly mock dependencies
  - Add test utilities that catch real integration issues
  - _Requirements: 8.1, 8.2, 8.3, 4.3, 4.4_

- [x] 5. Validate fixes and ensure test reliability
  - Run tests to verify both code fixes and test improvements work
  - Ensure tests are actually testing real functionality, not just mocks
  - Validate that fixed tests would catch real regressions
  - Document any real bugs found and fixed during the process
  - _Requirements: 7.1, 7.2, 7.3, 7.4_
