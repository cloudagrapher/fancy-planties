# Requirements Document

## Introduction

This specification addresses user-reported issues with the Care Guide and Propagation features in the plant tracking application. Users have identified several usability problems and missing features that need to be resolved to improve the user experience.

## Glossary

- **Care Guide System**: The feature that allows users to create and manage plant care instructions organized by taxonomy levels (family, genus, species, cultivar)
- **Propagation System**: The feature that tracks plant propagation progress through various stages
- **Watering Section**: A care category within care guides that provides watering instructions
- **General Description Box**: A text field for providing overview information about plant care
- **Propagation Status**: The current stage of a propagation (started, rooting, ready, planted)
- **Add Propagation Button**: The UI control that opens the form to create a new propagation entry

## Requirements

### Requirement 1: Remove Method Field from Watering Section

**User Story:** As a user creating a care guide, I want the watering section to be simplified without the method field, so that I can focus on essential watering information.

#### Acceptance Criteria

1. WHEN a user views the care guide creation form, THE Care Guide System SHALL NOT display a method input field within the watering section
2. WHEN a user views an existing care guide with watering information, THE Care Guide System SHALL display watering details without showing a method field
3. WHEN a user submits a care guide form, THE Care Guide System SHALL NOT include a method property in the watering data structure
4. WHEN the API receives care guide data, THE Care Guide System SHALL accept watering objects without requiring a method field

### Requirement 2: Add General Description Box to Care Guides

**User Story:** As a user creating a care guide, I want a general description field at the top of the form, so that I can provide an overview of the plant's care requirements before detailing specific categories.

#### Acceptance Criteria

1. WHEN a user opens the care guide creation form, THE Care Guide System SHALL display a general description input field prominently near the top of the form
2. WHEN a user enters text in the general description field, THE Care Guide System SHALL accept and store text up to 2000 characters
3. WHEN a user views an existing care guide, THE Care Guide System SHALL display the general description content if it exists
4. WHEN a user submits the care guide form, THE Care Guide System SHALL include the general description in the saved data

### Requirement 3: Enable Clicking on Care Guide Cards

**User Story:** As a user browsing my care guides, I want to click on guide cards to view their full details, so that I can read and edit the complete care information.

#### Acceptance Criteria

1. WHEN a user clicks anywhere on a care guide card, THE Care Guide System SHALL navigate to a detail view or open a modal displaying the full guide content
2. WHEN a care guide detail view is displayed, THE Care Guide System SHALL show all care categories, images, and metadata
3. WHEN a user views a care guide detail, THE Care Guide System SHALL provide an option to edit the guide
4. WHEN a user closes the care guide detail view, THE Care Guide System SHALL return to the care guide list

### Requirement 4: Display Pictures in Care Guides

**User Story:** As a user viewing care guides, I want to see the uploaded pictures, so that I can visually reference plant care examples and identification.

#### Acceptance Criteria

1. WHEN a care guide contains images, THE Care Guide System SHALL display thumbnail images on the care guide card
2. WHEN a user views a care guide detail, THE Care Guide System SHALL display all uploaded images in a gallery format
3. WHEN images are stored as S3 keys, THE Care Guide System SHALL retrieve and display them using pre-signed URLs
4. WHEN a care guide has no images, THE Care Guide System SHALL display a placeholder or hide the image section

### Requirement 4.1: Upload Care Guide Images to S3

**User Story:** As a user uploading images to a care guide, I want images to be stored in S3, so that the system uses efficient, scalable cloud storage instead of database storage.

#### Acceptance Criteria

1. WHEN a user uploads an image to a care guide, THE Care Guide System SHALL upload the image to S3 using the existing S3ImageService
2. WHEN an image upload succeeds, THE Care Guide System SHALL store the S3 object key in the s3ImageKeys array field
3. WHEN the care guide form is submitted, THE Care Guide System SHALL include the S3 image keys in the saved data
4. WHEN displaying care guide images, THE Care Guide System SHALL use the S3Image component to fetch and render images from S3

### Requirement 5: Fix Propagation Creation Functionality

**User Story:** As a user attempting to add a propagation, I want the creation process to work correctly, so that I can track my plant propagations.

#### Acceptance Criteria

1. WHEN a user submits the propagation form with valid data, THE Propagation System SHALL successfully create a new propagation record
2. WHEN the propagation creation succeeds, THE Propagation System SHALL display the new propagation in the dashboard
3. WHEN the propagation creation fails, THE Propagation System SHALL display a clear error message indicating the problem
4. WHEN the API receives propagation data, THE Propagation System SHALL validate all required fields before attempting to save

### Requirement 6: Replace "Established" Status with "Ready"

**User Story:** As a user tracking propagations, I want the status to be "ready" instead of "established", so that the terminology better reflects the propagation stage.

#### Acceptance Criteria

1. WHEN a user views propagation status options, THE Propagation System SHALL display "ready" as a status option instead of "established"
2. WHEN a user filters propagations by status, THE Propagation System SHALL include "ready" as a filter option
3. WHEN the database stores propagation status, THE Propagation System SHALL accept "ready" as a valid enum value
4. WHEN existing propagations have "established" status, THE Propagation System SHALL migrate them to "ready" status

### Requirement 7: Update Propagation Status Options

**User Story:** As a user managing propagations, I want the status options to be started, rooting, ready, and planted, so that I can accurately track propagation progress through these specific stages.

#### Acceptance Criteria

1. WHEN a user creates or edits a propagation, THE Propagation System SHALL provide exactly four status options: started, rooting, ready, and planted
2. WHEN the database schema defines propagation status, THE Propagation System SHALL enforce these four values as the only valid options
3. WHEN the API validates propagation data, THE Propagation System SHALL reject any status values not in the defined set
4. WHEN statistics are calculated, THE Propagation System SHALL group propagations by the four defined status values

### Requirement 8: Make Add Propagation Button Visible

**User Story:** As a user on the propagations page, I want to easily see the "Add Propagation" button, so that I can quickly start tracking a new propagation.

#### Acceptance Criteria

1. WHEN a user views the propagations dashboard, THE Propagation System SHALL display the "Add Propagation" button prominently in the header area
2. WHEN the page has no propagations, THE Propagation System SHALL display the "Add Propagation" button with high visibility
3. WHEN the page has existing propagations, THE Propagation System SHALL keep the "Add Propagation" button visible and accessible
4. WHEN a user clicks the "Add Propagation" button, THE Propagation System SHALL open the propagation creation form
