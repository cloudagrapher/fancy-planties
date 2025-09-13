# Requirements Document

## Introduction

This feature introduces a comprehensive admin dashboard for plant tracker application administrators and curators. The dashboard provides tools for user management, plant taxonomy verification, and curator administration. Only users with curator privileges can access the admin dashboard, and they can manage the verification process for user-submitted plants while maintaining data quality and taxonomic accuracy.

## Requirements

### Requirement 1

**User Story:** As a curator, I want to access a secure admin dashboard, so that I can manage the application's data and users without affecting regular user functionality.

#### Acceptance Criteria

1. WHEN a curator logs in THEN the system SHALL display an "Admin Dashboard" link in the navigation
2. WHEN a non-curator user attempts to access admin routes THEN the system SHALL redirect them to the main dashboard with an error message
3. WHEN a curator accesses the admin dashboard THEN the system SHALL display a clean interface with navigation to all admin functions
4. IF a user's curator status is revoked THEN the system SHALL immediately remove admin access on their next request

### Requirement 2

**User Story:** As a curator, I want to manage user accounts and curator privileges, so that I can maintain proper access control and add new curators when needed.

#### Acceptance Criteria

1. WHEN a curator views the user management section THEN the system SHALL display a paginated table of all users with their basic information
2. WHEN a curator searches for users THEN the system SHALL filter results by name, email, or curator status
3. WHEN a curator promotes a user to curator THEN the system SHALL update their isCurator status and log the action
4. WHEN a curator demotes another curator THEN the system SHALL update their isCurator status and log the action
5. IF a curator attempts to demote themselves THEN the system SHALL prevent the action and display a warning message
6. WHEN viewing user details THEN the system SHALL show user statistics including plant count, propagation count, and join date

### Requirement 3

**User Story:** As a curator, I want to manage verified plants in a table format, so that I can edit plant information, maintain taxonomic accuracy, and ensure data quality.

#### Acceptance Criteria

1. WHEN a curator accesses the verified plants section THEN the system SHALL display a sortable, filterable table of all verified plants
2. WHEN a curator clicks edit on a plant THEN the system SHALL open an inline or modal editor with all plant fields
3. WHEN a curator saves plant edits THEN the system SHALL validate taxonomy uniqueness and update the plant record
4. WHEN a curator searches plants THEN the system SHALL filter by family, genus, species, cultivar, or common name
5. WHEN a curator sorts the table THEN the system SHALL order plants by the selected column (name, family, genus, creation date)
6. IF a curator attempts to create a duplicate taxonomy combination THEN the system SHALL prevent the action and show an error

### Requirement 4

**User Story:** As a curator, I want to review and approve user-submitted plants, so that I can maintain taxonomic accuracy and expand the verified plant database.

#### Acceptance Criteria

1. WHEN a curator accesses the plant approval section THEN the system SHALL display all unverified plants with submission details
2. WHEN a curator reviews a plant submission THEN the system SHALL show the plant details, submitter information, and creation date
3. WHEN a curator approves a plant THEN the system SHALL set isVerified to true and update the plant record
4. WHEN a curator rejects a plant THEN the system SHALL provide options to delete or request modifications
5. WHEN a curator edits a plant before approval THEN the system SHALL allow modifications to ensure accuracy
6. IF there are pending plant approvals THEN the system SHALL display a notification badge with the count

### Requirement 5

**User Story:** As a curator, I want to view dashboard analytics and system statistics, so that I can monitor application usage and identify trends.

#### Acceptance Criteria

1. WHEN a curator accesses the dashboard home THEN the system SHALL display key metrics including total users, plants, and recent activity
2. WHEN viewing analytics THEN the system SHALL show user growth, plant submission trends, and curator activity
3. WHEN a curator checks recent activity THEN the system SHALL display the latest user registrations, plant submissions, and approvals
4. WHEN viewing system health THEN the system SHALL show database statistics and any system alerts
5. IF there are critical issues THEN the system SHALL highlight them prominently on the dashboard

### Requirement 6

**User Story:** As a curator, I want to manage plant taxonomy hierarchies, so that I can maintain consistent categorization and handle complex botanical relationships.

#### Acceptance Criteria

1. WHEN a curator views taxonomy management THEN the system SHALL display plants organized by family, genus, and species
2. WHEN a curator merges duplicate entries THEN the system SHALL update all related plant instances and propagations
3. WHEN a curator creates new taxonomy entries THEN the system SHALL validate against existing records
4. WHEN viewing plant relationships THEN the system SHALL show how many instances and propagations use each plant
5. IF a plant has active instances THEN the system SHALL warn before allowing deletion or major modifications

### Requirement 7

**User Story:** As a curator, I want to audit user actions and system changes, so that I can maintain accountability and track important modifications.

#### Acceptance Criteria

1. WHEN a curator performs admin actions THEN the system SHALL log the action with timestamp and curator information
2. WHEN viewing audit logs THEN the system SHALL display filterable records of all admin activities
3. WHEN a plant is approved or rejected THEN the system SHALL record the decision and reasoning
4. WHEN user privileges change THEN the system SHALL log the change with the responsible curator
5. IF suspicious activity is detected THEN the system SHALL flag it for curator review

### Requirement 8

**User Story:** As a curator, I want to bulk manage plants and users, so that I can efficiently handle large datasets and perform maintenance tasks.

#### Acceptance Criteria

1. WHEN a curator selects multiple plants THEN the system SHALL provide bulk actions for approval, rejection, or editing
2. WHEN performing bulk operations THEN the system SHALL show progress and handle errors gracefully
3. WHEN bulk approving plants THEN the system SHALL validate each plant individually before approval
4. WHEN exporting data THEN the system SHALL generate CSV or JSON files with selected plant or user data
5. IF bulk operations fail partially THEN the system SHALL report which items succeeded and which failed