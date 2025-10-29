# Implementation Plan

- [x] 1. Database and Schema Updates
  - Update propagation status enum in database schema
  - Create and run database migration script
  - Update TypeScript schema types
  - _Requirements: 6, 7_

- [x] 1.1 Create database migration for propagation status
  - Create new migration file `drizzle/0005_update_propagation_status.sql`
  - Write SQL to update existing 'established' records to 'ready'
  - Update status check constraint to new enum values
  - Test migration on development database
  - _Requirements: 6, 7_

- [x] 1.2 Update schema.ts with new propagation status enum
  - Modify propagations table status field enum in `src/lib/db/schema.ts`
  - Change enum from `['started', 'rooting', 'planted', 'established']` to `['started', 'rooting', 'ready', 'planted']`
  - Update TypeScript types for Propagation
  - _Requirements: 6, 7_

- [x] 2. Update Propagation API and Validation
  - Modify API route validation schemas
  - Update query functions
  - Enhance error handling
  - _Requirements: 5, 6, 7_

- [x] 2.1 Update propagation API validation schema
  - Modify Zod schema in `src/app/api/propagations/route.ts`
  - Change status enum to `['started', 'rooting', 'ready', 'planted']`
  - Add enhanced error logging for debugging creation issues
  - Include received data in error responses for troubleshooting
  - _Requirements: 5, 6, 7_

- [x] 2.2 Update propagation query functions
  - Modify `src/lib/db/queries/propagations.ts` if it contains status-specific queries
  - Update any status filtering logic to use new enum values
  - Ensure getByStatus function accepts 'ready' instead of 'established'
  - _Requirements: 6, 7_

- [x] 3. Update Propagation Frontend Components
  - Update status configuration
  - Fix button visibility
  - Update form and display components
  - Run build to ensure it compiles without errors
  - Create task summary
  - _Requirements: 6, 7, 8_

- [x] 3.1 Update PropagationDashboard status configuration
  - Modify statusConfig in `src/components/propagations/PropagationDashboard.tsx`
  - Change 'established' to 'ready' with appropriate label and icon
  - Update status filter buttons to show 'Ready' instead of 'Established'
  - Update statistics calculations to use new status values
  - _Requirements: 6, 7_

- [x] 3.2 Improve Add Propagation button visibility
  - Enhance button styling in `src/components/propagations/PropagationDashboard.tsx`
  - Increase button size (px-6 py-3)
  - Use emerald-600 background with shadow-md
  - Add font-semibold for better visibility
  - Ensure button is always visible in header regardless of content state
  - _Requirements: 8_

- [x] 3.3 Update PropagationForm status options
  - Modify status dropdown in `src/components/propagations/PropagationForm.tsx`
  - Update status options to: Started, Rooting, Ready, Planted
  - Remove 'Established' option
  - Create subtask summary in .kiro/summaries
  - _Requirements: 6, 7_

- [ ] 3.4 Update PropagationCard status display
  - Modify status badge rendering in `src/components/propagations/PropagationCard.tsx`
  - Update status color coding for 'ready' status
  - Ensure status labels display correctly
  - Create subtask summary in .kiro/summaries
  - _Requirements: 6, 7_

- [x] 4. Update Care Guide Form
  - Remove watering method field
  - Integrate S3 image upload
  - Improve description field visibility
  - Create task summary in .kiro/summaries
  - _Requirements: 1, 2, 4.1_

- [x] 4.1 Remove method field from watering section
  - Remove method input from watering card in `src/components/handbook/CareGuideForm.tsx`
  - Update CareGuideFormData interface to remove method from watering object
  - Remove method field from form state initialization
  - _Requirements: 1_

- [x] 4.2 Make description field more prominent
  - Reposition description field in Basic Info tab of `src/components/handbook/CareGuideForm.tsx`
  - Increase textarea rows to 4-5 for better visibility
  - Add clearer label indicating this is the general description
  - Ensure field is prominently placed after Guide Information section
  - _Requirements: 2_

- [x] 4.3 Replace ImageUpload with S3ImageUpload component
  - Import S3ImageUpload in `src/components/handbook/CareGuideForm.tsx`
  - Replace ImageUpload component with S3ImageUpload
  - Pass required props: userId, entityType='care_guide', entityId
  - Generate temporary entityId for new guides (use timestamp or UUID)
  - Update form state to track s3ImageKeys instead of File objects
  - _Requirements: 4.1_

- [x] 4.4 Update care guide form submission for S3 images
  - Modify handleSubmit in `src/components/handbook/CareGuideForm.tsx`
  - Remove Base64 conversion logic for images
  - Include s3ImageKeys array in form submission
  - Update API call to send s3ImageKeys instead of Base64 images
  - _Requirements: 4.1_

- [x] 5. Update Care Guide API for S3 Images
  - Modify API to accept s3ImageKeys
  - Update validation schema
  - _Requirements: 4.1_

- [x] 5.1 Update care guide API validation schema
  - Modify CareGuideCreateSchema in `src/app/api/care-guides/route.ts`
  - Change images field from array of strings (Base64) to accept s3ImageKeys
  - Add s3ImageKeys field validation
  - Update database insert to use s3ImageKeys field
  - _Requirements: 4.1_

- [x] 5.2 Update care guide API response handling
  - Ensure GET endpoint returns s3ImageKeys in response
  - Update POST endpoint to return created guide with s3ImageKeys
  - _Requirements: 4.1_

- [x] 6. Create Care Guide Detail Component
  - Build new detail view component
  - Implement image gallery with S3Image
  - Add edit functionality
  - _Requirements: 3, 4_

- [x] 6.1 Create CareGuideDetail component file
  - Create new file `src/components/handbook/CareGuideDetail.tsx`
  - Define CareGuideDetailProps interface
  - Create modal/full-page layout structure
  - Add header with title, edit button, and close button
  - _Requirements: 3_

- [x] 6.2 Implement care guide content display
  - Display taxonomy information and common name
  - Show general description prominently
  - Render all care categories (watering, fertilizing, lighting, etc.)
  - Display general tips section
  - Format content with appropriate styling and icons
  - _Requirements: 3_

- [x] 6.3 Implement S3 image gallery in detail view
  - Import S3Image component
  - Create grid layout for images
  - Map through s3ImageKeys array
  - Render S3Image component for each key
  - Handle empty image arrays gracefully
  - Add loading states for image fetching
  - _Requirements: 4_

- [x] 6.4 Add edit functionality to detail view
  - Add edit button in header
  - Implement onEdit callback to open CareGuideForm in edit mode
  - Pass current guide data to form for editing
  - Handle form submission to update existing guide
  - _Requirements: 3_

- [x] 7. Update HandbookDashboard for Clickable Cards
  - Add click handlers to care guide cards
  - Integrate detail view modal
  - Display images on cards
  - _Requirements: 3, 4_

- [x] 7.1 Add state management for selected guide
  - Add selectedGuide state in `src/components/handbook/HandbookDashboard.tsx`
  - Add showDetail state for modal visibility
  - Create handler functions for opening and closing detail view
  - _Requirements: 3_

- [x] 7.2 Make CareGuideCard clickable
  - Add onClick handler to CareGuideCard component
  - Update card styling to indicate clickability (cursor-pointer, hover effects)
  - Pass setSelectedGuide function to card onClick
  - _Requirements: 3_

- [x] 7.3 Integrate CareGuideDetail modal
  - Import CareGuideDetail component
  - Conditionally render detail modal when selectedGuide is set
  - Pass guide data, userId, and handler functions
  - Implement close handler to clear selectedGuide
  - _Requirements: 3_

- [x] 7.4 Display thumbnail images on care guide cards
  - Update CareGuideCard component to show first image from s3ImageKeys
  - Use S3Image component for thumbnail display
  - Add aspect-video container for consistent sizing
  - Handle cards with no images (hide image section)
  - _Requirements: 4_

- [x] 8. Update Care Guide API to Remove Watering Method
  - Update API validation schema
  - Update database operations
  - _Requirements: 1_

- [x] 8.1 Remove method field from API validation
  - Modify watering object schema in `src/app/api/care-guides/route.ts`
  - Remove method field from CareGuideCreateSchema watering object
  - Update any PUT/PATCH endpoints if they exist
  - _Requirements: 1_

- [x] 9. Testing and Validation
  - Test all modified functionality
  - Verify database migrations
  - Test image upload and display
  - Create task summary in .kiro/summaries
  - _Requirements: All_

- [x] 9.1 Test propagation status changes
  - Verify database migration completed successfully
  - Test creating propagations with new status values
  - Test filtering propagations by 'ready' status
  - Verify statistics calculations work correctly
  - Test status updates through the UI
  - _Requirements: 5, 6, 7_

- [x] 9.2 Test care guide form changes
  - Verify watering method field is removed
  - Test description field is prominent and functional
  - Test S3 image upload functionality
  - Verify form submission with S3 images
  - Test form validation
  - _Requirements: 1, 2, 4.1_

- [x] 9.3 Test care guide detail view
  - Test clicking on care guide cards opens detail view
  - Verify all care guide content displays correctly
  - Test S3 image gallery displays images
  - Test edit functionality opens form with existing data
  - Test close functionality returns to list
  - _Requirements: 3, 4_

- [x] 9.4 Test propagation button visibility
  - Verify Add Propagation button is visible on empty state
  - Verify button remains visible with existing propagations
  - Test button styling and hover effects
  - Test button click opens form
  - _Requirements: 8_

- [x] 9.5 Test propagation creation flow
  - Test creating new propagations with all status options
  - Verify error messages display correctly on validation failures
  - Test successful creation updates the dashboard
  - Verify React Query cache invalidation works
  - _Requirements: 5_

- [x] 10. Documentation and Cleanup
  - Update API documentation
  - Add code comments
  - Clean up unused code
  - Create task summary in .kiro/summaries
  - _Requirements: All_

- [x] 10.1 Update API documentation
  - Document propagation status enum changes in `docs/API.md`
  - Document care guide s3ImageKeys field
  - Document watering method field removal
  - Add examples of new API request/response formats
  - _Requirements: All_

- [x] 10.2 Add inline code comments
  - Add comments explaining S3 image integration
  - Document status enum changes
  - Add comments for complex logic in detail view
  - _Requirements: All_
