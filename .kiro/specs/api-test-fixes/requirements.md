# Requirements Document

## Introduction

The plant management API tests are failing due to inconsistencies between test expectations and actual API implementations. The failures reveal several critical issues: validation error response formats don't match test expectations, date serialization inconsistencies between API responses and test assertions, authentication flow edge cases, and FormData processing issues. This feature will fix these API implementation issues to ensure tests pass and the API behaves consistently.

## Requirements

### Requirement 1

**User Story:** As a developer, I want consistent validation error responses from API endpoints, so that client applications can reliably handle and display validation errors.

#### Acceptance Criteria

1. WHEN validation fails in API endpoints THEN the response SHALL return ZodError.issues in the details field
2. WHEN ZodError occurs THEN the API SHALL return status 400 with consistent error structure
3. WHEN validation passes THEN the API SHALL process requests normally without error structure changes
4. IF multiple validation errors exist THEN all errors SHALL be included in the issues array
5. WHEN client receives validation errors THEN the error format SHALL be predictable and parseable

### Requirement 2

**User Story:** As a developer, I want consistent date handling in API responses, so that client applications receive predictable date formats.

#### Acceptance Criteria

1. WHEN API returns plant instance data THEN dates SHALL be consistently formatted as ISO strings
2. WHEN creating plant instances THEN date fields SHALL be properly parsed and stored
3. WHEN updating plant instances THEN date fields SHALL maintain consistent format in responses
4. IF date fields are null THEN they SHALL remain null in responses
5. WHEN serializing enhanced plant data THEN all date fields SHALL use consistent formatting

### Requirement 3

**User Story:** As a developer, I want proper authentication error handling in API endpoints, so that unauthorized requests are handled consistently.

#### Acceptance Criteria

1. WHEN user is not authenticated THEN API SHALL return 401 status with appropriate error message
2. WHEN user lacks required permissions THEN API SHALL return 403 status with clear error message
3. WHEN authentication check fails THEN subsequent validation SHALL not be performed
4. IF authentication is required THEN it SHALL be checked before request body processing
5. WHEN authentication succeeds THEN request processing SHALL continue normally

### Requirement 4

**User Story:** As a developer, I want reliable FormData processing in API endpoints, so that file uploads and form submissions work correctly.

#### Acceptance Criteria

1. WHEN FormData is submitted THEN API SHALL correctly parse form fields and files
2. WHEN files are uploaded THEN they SHALL be converted to base64 format properly
3. WHEN existing images are included THEN they SHALL be preserved in the images array
4. IF FormData processing fails THEN API SHALL return clear error messages
5. WHEN FormData is valid THEN it SHALL be processed the same as JSON requests

### Requirement 5

**User Story:** As a developer, I want consistent response structures across all plant management API endpoints, so that client applications can handle responses uniformly.

#### Acceptance Criteria

1. WHEN API operations succeed THEN responses SHALL include success: true and data fields
2. WHEN API operations fail THEN responses SHALL include appropriate error messages and status codes
3. WHEN returning plant instances THEN enhanced data SHALL include plant taxonomy information
4. IF metadata is included THEN it SHALL follow consistent structure across endpoints
5. WHEN pagination is used THEN response format SHALL be consistent with other paginated endpoints

### Requirement 6

**User Story:** As a developer, I want proper error handling for edge cases in plant management APIs, so that the system gracefully handles unexpected scenarios.

#### Acceptance Criteria

1. WHEN invalid plant instance IDs are provided THEN API SHALL return 400 with clear error message
2. WHEN plant instances don't exist THEN API SHALL return 404 with appropriate message
3. WHEN users try to access others' plant instances THEN API SHALL return 403 with clear message
4. IF database operations fail THEN API SHALL return 500 with generic error message
5. WHEN request body is malformed THEN API SHALL return 400 with specific error details

### Requirement 7

**User Story:** As a developer, I want fertilizer schedule calculation to work correctly, so that plant care reminders are accurate.

#### Acceptance Criteria

1. WHEN fertilizer schedule is provided THEN due date SHALL be calculated correctly
2. WHEN schedule format is "X weeks" THEN due date SHALL be X*7 days from creation
3. WHEN schedule format is "X days" THEN due date SHALL be X days from creation
4. IF schedule format is invalid THEN no due date SHALL be set
5. WHEN due date is calculated THEN it SHALL be included in the created plant instance

### Requirement 8

**User Story:** As a developer, I want proper test data serialization, so that test assertions match actual API behavior.

#### Acceptance Criteria

1. WHEN test factories create data THEN date fields SHALL match API response format
2. WHEN tests expect enhanced plant instances THEN factory data SHALL include plant relationships
3. WHEN tests check response structure THEN assertions SHALL match actual API response format
4. IF tests use mock data THEN it SHALL accurately represent real API responses
5. WHEN comparing test data THEN date serialization SHALL be consistent between expected and actual values