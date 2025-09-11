# Implementation Plan

- [ ] 1. Fix validation error response format in API endpoints
  - Update error handling to use ZodError.issues instead of generic error messages
  - Ensure all API endpoints return consistent validation error structure
  - Fix plants API route validation error handling
  - _Requirements: 1.1, 1.2, 1.4_

- [ ] 2. Standardize date serialization in API responses
  - Update plant instance API responses to return ISO string dates
  - Fix enhanced plant instance data serialization
  - Ensure consistent date format across all plant management endpoints
  - _Requirements: 2.1, 2.2, 2.5_

- [ ] 3. Fix authentication flow order in plant instance creation
  - Move authentication check before request body parsing
  - Ensure 401 errors are returned before validation errors
  - Update validateVerifiedRequest error handling
  - _Requirements: 3.1, 3.3, 3.4_

- [ ] 4. Fix FormData processing in plant instance endpoints
  - Update FormData parsing to handle file uploads correctly
  - Fix image array processing for existing and new images
  - Ensure FormData validation works the same as JSON validation
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 5. Update test data factories to match API response format
  - Modify plant factory to return ISO string dates instead of Date objects
  - Update plant instance factory to match actual API response structure
  - Fix enhanced plant instance test data to include proper plant relationships
  - _Requirements: 8.1, 8.2, 8.4_

- [ ] 6. Fix fertilizer schedule calculation in plant instance creation
  - Ensure fertilizer due date is properly calculated and included in response
  - Fix date calculation logic for different schedule formats
  - Update test assertions to check for proper Date objects in calculation
  - _Requirements: 7.1, 7.2, 7.5_

- [ ] 7. Fix plant instance update endpoint validation error handling
  - Update PUT endpoint to return proper validation errors
  - Fix ZodError handling in update operations
  - Ensure validation errors return 400 status instead of 500
  - _Requirements: 1.1, 1.2, 6.1_

- [ ] 8. Update test assertions to match actual API response structure
  - Fix test expectations for date fields to expect strings not Date objects
  - Update enhanced plant instance assertions to match actual response format
  - Fix validation error test assertions to expect ZodError.issues format
  - _Requirements: 8.3, 8.5, 1.4_

- [ ] 9. Fix authorization error handling in integration tests
  - Update authentication mocks to return proper error responses
  - Fix test expectations for unauthorized access scenarios
  - Ensure consistent 401/403 status codes across all endpoints
  - _Requirements: 3.1, 3.2, 6.3_

- [ ] 10. Validate and test all fixes
  - Run plant management API tests to verify all fixes work
  - Ensure no regression in other test suites
  - Validate that API behavior matches test expectations
  - _Requirements: 5.1, 5.2, 5.3_