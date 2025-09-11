# Implementation Plan

- [x] 1. Set up email service integration and environment configuration
  - ✅ Install Resend package and configure environment variables
  - ✅ Set up domain `fancy-planties.cloudagrapher.com` in Resend dashboard with DNS records
  - ✅ Configure FROM_EMAIL as `send.mail.fancy-planties.cloudagrapher.com`
  - ✅ Create email service interface and Resend implementation with retry logic
  - ✅ Add professional HTML email template for verification codes with branding
  - ✅ Implement comprehensive error handling with specific error codes
  - ✅ Add exponential backoff retry mechanism for failed email sends
  - ✅ Include development mode logging for testing and debugging
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 2. Update database schema for email verification
  - ✅ Create migration for emailVerificationCodes table with proper indexes
  - ✅ Add isEmailVerified column to users table with index
  - ✅ Implement Drizzle schema definitions for new tables and columns
  - ✅ Enhanced migration system to automatically apply Drizzle migration files
  - ✅ Added comprehensive migration utilities with status tracking and health checks
  - _Requirements: 3.1, 3.2, 6.1, 6.2_
- [x] 3. Implement verification code generation and validation service
  - Create EmailVerificationCodeService with secure code generation
  - Implement code validation logic with expiration and attempt tracking
  - Add cleanup methods for expired codes and user deletion
  - Write unit tests for code generation, validation, and cleanup logic
  - _Requirements: 3.1, 3.2, 3.3, 6.1, 6.3_

- [x] 4. Create email verification API endpoints
- [x] 4.1 Update signup API to generate and send verification codes
  - Modify POST /api/auth/signup to create unverified users
  - Integrate email service to send verification codes after signup
  - Add error handling for email service failures with user-friendly messages
  - _Requirements: 1.1, 1.4, 7.4_

- [x] 4.2 Implement email verification endpoint
  - Create POST /api/auth/verify-email with code validation
  - Update user verification status and delete used codes
  - Add rate limiting for verification attempts
  - _Requirements: 1.4, 1.5, 3.4, 3.5_

- [x] 4.3 Create resend verification code endpoint
  - Implement POST /api/auth/resend-verification with cooldown logic
  - Invalidate existing codes and generate new ones
  - Add rate limiting for resend requests
  - _Requirements: 2.1, 2.2, 2.4, 7.5_

- [x] 5. Update authentication middleware to enforce email verification
  - Modify auth middleware to check email verification status
  - Redirect unverified users to verification page for protected routes
  - Update API route protection to return 403 for unverified users
  - _Requirements: 4.1, 4.2_

- [x] 6. Create email verification frontend components
- [x] 6.1 Build VerificationCodeInput component
  - Create 6-digit input component with auto-formatting and focus management
  - Add paste support and backspace handling
  - Implement input validation and error display
  - Write component tests for input behavior
  - _Requirements: 5.1, 5.2_

- [x] 6.2 Create EmailVerificationPage component
  - Build verification page with code input and submission logic
  - Add resend functionality with cooldown timer display
  - Implement error message display for different failure scenarios
  - Add success state and automatic redirect to dashboard
  - _Requirements: 5.1, 5.3, 5.4_

- [x] 7. Implement rate limiting and security measures
  - Add rate limiting middleware for verification and resend endpoints
  - Implement attempt tracking and code invalidation after max attempts
  - Add security logging for failed verification attempts
  - Create cleanup job for expired codes and rate limit data
  - _Requirements: 2.4, 3.3, 3.5, 6.4_

- [x] 8. Add email verification to signup flow
  - Update signup page to redirect to verification after successful registration
  - Modify login flow to redirect unverified users to verification page
  - Add verification status checks to dashboard and protected pages
  - _Requirements: 4.3, 4.4_

- [x] 9. Create comprehensive test suite
- [x] 9.1 Write integration tests for verification flow
  - Test complete signup and verification process
  - Test resend functionality with proper cooldown behavior
  - Test rate limiting enforcement across all endpoints
  - _Requirements: 1.1, 1.4, 2.1, 2.2_

- [x] 9.2 Add error scenario testing
  - Test email service failure handling and retry logic
  - Test expired code scenarios and cleanup processes
  - Test concurrent verification attempts and race conditions
  - _Requirements: 1.4, 3.1, 7.3, 7.4_

- [x] 10. Implement background cleanup and monitoring
  - Create scheduled job to clean up expired verification codes
  - Add monitoring for email service quota usage and failures
  - Implement startup cleanup for any orphaned verification data
  - _Requirements: 6.1, 6.3, 7.5_
