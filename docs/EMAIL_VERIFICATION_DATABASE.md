# Email Verification Database Setup

This document describes the database schema and setup process for email verification functionality in the Fancy Planties application.

## Database Schema

### New Table: `email_verification_codes`

```sql
CREATE TABLE email_verification_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  attempts_used INTEGER DEFAULT 0 NOT NULL
);
```

**Indexes:**
- `email_verification_codes_user_id_idx` - For efficient user lookups
- `email_verification_codes_expires_at_idx` - For cleanup operations
- `email_verification_codes_user_active_unique` - Ensures one active code per user

### Updated Table: `users`

**New Column:**
- `is_email_verified BOOLEAN DEFAULT FALSE NOT NULL` - Tracks email verification status

**New Index:**
- `users_email_verified_idx` - For filtering verified/unverified users

## Row-Level Security (RLS)

The email verification system includes comprehensive RLS policies:

### Email Verification Codes Policies

1. **Users can view their own verification codes**
   - Users can only see codes associated with their user ID

2. **Users can insert their own verification codes**
   - Users can only create codes for themselves

3. **Users can update their own verification codes**
   - Users can only modify their own codes (e.g., increment attempts)

4. **Users can delete their own verification codes**
   - Users can only delete their own codes

5. **System can manage verification codes for auth**
   - Special policy allowing system operations when user context is 0

## Setup Scripts

### Automated Setup

Run the comprehensive email verification setup:

```bash
npm run db:setup-email-verification
```

This script:
- ✅ Checks database connection
- ✅ Ensures migration tracking table exists
- ✅ Applies email verification migration if needed
- ✅ Adds `is_email_verified` column to users table if missing
- ✅ Enables RLS and creates policies
- ✅ Performs final verification

### Manual Verification

Verify the email verification schema is properly set up:

```bash
npm run db:verify-email-schema
```

### Database Health Check

Check overall database health including email verification:

```bash
npm run db:setup health
```

## Migration Files

### 0001_magical_proteus.sql

This migration file contains:
- Creation of `email_verification_codes` table
- Addition of `is_email_verified` column to `users` table
- All necessary indexes and constraints
- Foreign key relationships with cascade deletion

### RLS Policies (drizzle/rls-policies.sql)

Contains all Row-Level Security policies including:
- Email verification codes access control
- Helper functions for user context management
- System-level access for authentication operations

## Integration with Existing System

### User Context Functions

The email verification system uses existing RLS helper functions:

```sql
-- Get current user ID from session context
get_current_user_id() RETURNS INTEGER

-- Set current user ID for RLS
set_current_user_id(user_id INTEGER) RETURNS VOID
```

### Cascade Deletion

When a user is deleted, all associated email verification codes are automatically removed via `ON DELETE CASCADE`.

## Development Workflow

### New Environment Setup

1. Run standard database setup:
   ```bash
   npm run db:setup setup
   ```

2. Ensure email verification is configured:
   ```bash
   npm run db:setup-email-verification
   ```

### Existing Environment Update

If adding email verification to an existing database:

```bash
npm run db:setup-email-verification
```

This script is safe to run multiple times and will only apply missing components.

### Docker Environment

The Docker initialization script automatically includes email verification setup:

```bash
npm run db:init:docker
```

## Troubleshooting

### Common Issues

1. **Migration already applied error**
   - The setup script handles this automatically
   - Existing tables are detected and skipped

2. **RLS policy conflicts**
   - Policies are created with `IF NOT EXISTS` logic
   - Existing policies are skipped gracefully

3. **Missing server-only package**
   - Ensure `npm install server-only` is run
   - Use script-specific database connections for Node.js scripts

### Verification Commands

Check specific components:

```bash
# Check if email verification table exists
npm run db:verify-email-schema

# Check overall database health
npm run db:setup health

# Check migration status
npm run db:setup status
```

## Security Considerations

### Row-Level Security

- All email verification codes are protected by RLS
- Users can only access their own verification codes
- System operations use special user context (ID = 0)

### Data Protection

- Verification codes are stored as plain text (6-digit, short-lived)
- Automatic cleanup via expiration timestamps
- Cascade deletion prevents orphaned codes

### Access Control

- Foreign key constraints ensure data integrity
- Unique constraints prevent duplicate active codes
- Attempt tracking prevents brute force attacks

## Performance Optimizations

### Indexes

- User ID index for fast user-specific queries
- Expiration timestamp index for efficient cleanup
- Email verification status index on users table

### Cleanup Strategy

- Expired codes should be cleaned up via scheduled job
- Index on `expires_at` enables efficient bulk deletion
- Cascade deletion handles user removal automatically

## Next Steps

After database setup is complete:

1. **Configure Email Service**
   - Set up Resend API keys
   - Configure domain and DNS records

2. **Implement API Endpoints**
   - Email verification code generation
   - Code validation and user verification
   - Resend functionality with rate limiting

3. **Create Frontend Components**
   - Verification code input component
   - Email verification page
   - Integration with signup flow

4. **Update Authentication Middleware**
   - Enforce email verification for protected routes
   - Redirect unverified users appropriately

This database setup provides the foundation for a secure, scalable email verification system.