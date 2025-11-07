# Security TODO List

This document tracks security improvements and action items identified in the security audit.

**Last Updated:** November 7, 2025
**Status Legend:** 🔴 Not Started | 🟡 In Progress | 🟢 Complete

**Progress:** 2/17 items completed (11.8%)

---

## CRITICAL PRIORITY (Address Immediately)

### 1. Remove Hardcoded Credentials 🟢
**Severity:** HIGH
**Issue:** Test files and scripts contain hardcoded database credentials and passwords
**Status:** COMPLETED ✅

**Files Fixed:**
- [x] `jest.setup.js:26` - Removed hardcoded DATABASE_URL, now requires TEST_DATABASE_URL
- [x] `scripts/seed-test-user.js:29` - Removed hardcoded password, now uses TEST_USER_PASSWORD env var
- [x] `scripts/seed-dev-data.js:28` - Removed hardcoded password, now uses TEST_USER_PASSWORD env var
- [x] `package.json:49` - Updated db:seed script to use env vars

**Action Items Completed:**
- [x] Updated `jest.setup.js` to require `TEST_DATABASE_URL` environment variable
- [x] Added environment checks to seed scripts (prevent production use)
- [x] Added warnings to seed scripts about test-only usage
- [x] Updated package.json scripts to use environment variables
- [x] Created .env.test.example with safe defaults
- [x] Created .env.local.example with documentation
- [ ] Document test credential setup in README or CONTRIBUTING.md (TODO: Add to docs)

**Implementation Notes:**
```javascript
// jest.setup.js - Proposed fix
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ||
  (() => { throw new Error('TEST_DATABASE_URL environment variable is required'); })();

// seed scripts - Add environment check
if (process.env.NODE_ENV === 'production') {
  console.error('❌ Cannot run seed scripts in production');
  process.exit(1);
}
```

---

### 2. Enforce Secure Cookies in Production 🟢
**Severity:** HIGH
**Issue:** `DISABLE_SECURE_COOKIES` environment variable could be misused in production
**Status:** COMPLETED ✅

**Files Fixed:**
- [x] `src/lib/auth/lucia.ts` - Added production validation and runtime checks
- [x] `.env.example` - Removed DISABLE_SECURE_COOKIES, added explanation
- [x] `.env.local.example` - Removed DISABLE_SECURE_COOKIES, added explanation
- [x] All `docker-compose.*.yml` files - Added deprecation notes

**Action Items Completed:**
- [x] Added startup validation to prevent insecure cookies in production
- [x] Removed DISABLE_SECURE_COOKIES from environment files
- [x] Added runtime check in lucia.ts initialization that throws error in production
- [x] Documented that secure cookies are auto-determined by NODE_ENV
- [x] Added DATABASE_URL validation for production (bonus fix)
- [ ] Add automated test to verify secure cookies in production build (TODO: Add to test suite)

**Security Guarantees:**
- Secure cookies ALWAYS enabled in production (NODE_ENV=production)
- Cannot be disabled via environment variable
- Runtime validation prevents misconfiguration
- Clear error messages guide developers to correct configuration

---

### 3. Implement Database Audit Logging 🔴
**Severity:** MEDIUM (Critical for compliance)
**Issue:** Admin actions logged to console only, not persisted to database

**Files to Fix:**
- [ ] `src/lib/auth/admin-auth.ts:271-303` - Implement actual DB logging
- [ ] Create audit log queries in `src/lib/db/queries/audit-logs.ts`
- [ ] Add audit log viewer in admin dashboard

**Action Items:**
- [ ] Implement database insertion in `logAdminAction()`
- [ ] Create `src/lib/db/queries/audit-logs.ts` with logging functions
- [ ] Add authentication event logging (login, logout, failed attempts)
- [ ] Create admin audit log viewer component
- [ ] Add audit log API endpoint (`/api/admin/audit`)
- [ ] Test audit logging for all admin operations
- [ ] Add log retention policy (e.g., 90 days)

**Events to Log:**
- [ ] User login (success/failure)
- [ ] User logout
- [ ] Password changes
- [ ] Email verification
- [ ] Admin privilege changes
- [ ] User creation/deletion
- [ ] Plant approval/rejection
- [ ] Bulk operations
- [ ] System configuration changes

**Implementation Notes:**
```typescript
// src/lib/db/queries/audit-logs.ts
export async function logAuditEvent(params: {
  action: string;
  entityType: 'user' | 'plant' | 'plant_instance' | 'propagation' | 'system';
  entityId?: number;
  performedBy: number;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}): Promise<void> {
  await db.insert(auditLogs).values({
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    performedBy: params.performedBy,
    timestamp: new Date(),
    details: params.details ? JSON.stringify(params.details) : null,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    success: params.success,
    errorMessage: params.errorMessage,
  });
}
```

---

### 4. Update npm Dependencies 🔴
**Severity:** MEDIUM
**Issue:** 4 moderate severity vulnerabilities in drizzle-kit/esbuild

**Vulnerabilities:**
- `drizzle-kit` - Transitive vulnerability through esbuild
- `esbuild` - GHSA-67mh-4wv8-2f99 (CVSS 5.3)

**Action Items:**
- [ ] Run `npm audit` to verify current vulnerabilities
- [ ] Run `npm audit fix` to attempt automatic fixes
- [ ] Update `drizzle-kit` to latest stable version
- [ ] Test database migrations after drizzle-kit update
- [ ] Run `npm audit --production` to check production dependencies
- [ ] Set up automated dependency scanning (Dependabot or Snyk)
- [ ] Add npm audit to CI/CD pipeline

**Commands:**
```bash
# Check vulnerabilities
npm audit

# Attempt automatic fixes
npm audit fix

# Update specific package
npm update drizzle-kit

# Check production only
npm audit --production

# Verify no breaking changes
npm test
```

---

### 5. Add Session Expiration and Idle Timeout 🔴
**Severity:** MEDIUM
**Issue:** Sessions set to never expire, no idle timeout

**Files to Fix:**
- [ ] `src/lib/auth/lucia.ts` - Update session configuration
- [ ] `src/lib/auth/server.ts` - Add idle timeout logic
- [ ] `src/lib/db/schema.ts` - Add lastActivityAt field to sessions table
- [ ] Create migration for session table update

**Action Items:**
- [ ] Change session cookie `expires: false` to `expires: true`
- [ ] Set session maxAge (e.g., 30 days)
- [ ] Add `lastActivityAt` column to sessions table
- [ ] Implement idle timeout check (e.g., 30 minutes)
- [ ] Update `validateRequest()` to check idle timeout
- [ ] Add "remember me" option for longer sessions (optional)
- [ ] Create database migration for session schema changes
- [ ] Test session expiration and idle timeout

**Implementation Notes:**
```typescript
// src/lib/auth/lucia.ts
export const lucia = new Lucia(adapter, {
  sessionCookie: {
    expires: true,
    attributes: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    },
  },
  // ...
});

// src/lib/auth/server.ts
const SESSION_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export const validateRequest = cache(async () => {
  const sessionId = (await cookies()).get(lucia.sessionCookieName)?.value ?? null;

  if (!sessionId) {
    return { user: null, session: null };
  }

  const result = await lucia.validateSession(sessionId);

  if (result.session) {
    // Check idle timeout
    const session = await db.select()
      .from(sessions)
      .where(eq(sessions.id, result.session.id))
      .limit(1);

    if (session[0]) {
      const idleTime = Date.now() - session[0].lastActivityAt.getTime();

      if (idleTime > SESSION_IDLE_TIMEOUT) {
        await lucia.invalidateSession(result.session.id);
        return { user: null, session: null };
      }

      // Update last activity
      await db.update(sessions)
        .set({ lastActivityAt: new Date() })
        .where(eq(sessions.id, result.session.id));
    }
  }

  // ... rest of existing code
});
```

**Database Migration:**
```sql
-- Add lastActivityAt column to sessions table
ALTER TABLE sessions ADD COLUMN last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
CREATE INDEX sessions_last_activity_idx ON sessions(last_activity_at);
```

---

## HIGH PRIORITY (Address Within 1 Week)

### 6. Improve Content Security Policy 🔴
**Severity:** MEDIUM
**Issue:** CSP allows 'unsafe-inline' and 'unsafe-eval'

**Action Items:**
- [ ] Implement CSP nonces for inline scripts
- [ ] Remove 'unsafe-inline' from script-src
- [ ] Remove 'unsafe-eval' from script-src
- [ ] Test Next.js compatibility with strict CSP
- [ ] Update Tailwind configuration for extracted CSS
- [ ] Document CSP implementation in security docs

---

### 7. Enhance Rate Limiting 🔴
**Severity:** MEDIUM
**Issue:** Rate limiting uses IP address only, no per-user tracking

**Action Items:**
- [ ] Add per-user rate limiting for authenticated requests
- [ ] Combine IP + User ID for better tracking
- [ ] Implement progressive rate limiting (stricter for unauthenticated)
- [ ] Validate proxy headers for IP address
- [ ] Add different limits for different endpoints
- [ ] Test rate limiting with authenticated and unauthenticated requests

---

### 8. Add HTTPS Enforcement 🔴
**Severity:** LOW
**Issue:** No automatic redirect from HTTP to HTTPS

**Action Items:**
- [ ] Add HTTPS redirect in middleware for production
- [ ] Configure nginx reverse proxy for HTTPS redirect
- [ ] Test HTTPS redirect in production environment
- [ ] Verify HSTS header is working
- [ ] Document HTTPS configuration

---

## MEDIUM PRIORITY (Address Within 1 Month)

### 9. Improve Email Verification Security 🔴
**Severity:** LOW

**Action Items:**
- [ ] Invalidate verification codes after successful use
- [ ] Invalidate codes after 3 failed attempts
- [ ] Generate new codes on resend (don't reuse)
- [ ] Add rate limiting to code generation
- [ ] Test verification code lifecycle

---

### 10. Remove Fallback Database Credentials 🔴
**Severity:** LOW

**Action Items:**
- [ ] Remove fallback credentials from `src/lib/auth/lucia.ts`
- [ ] Remove fallback credentials from `src/lib/db/index.ts`
- [ ] Remove fallback credentials from `src/lib/db/script-connection.ts`
- [ ] Fail fast if DATABASE_URL missing in production
- [ ] Keep fallbacks only for local development
- [ ] Add environment variable validation at startup

---

### 11. Strengthen Password Policy 🔴
**Severity:** INFORMATIONAL

**Action Items:**
- [ ] Add special character requirement to password validation
- [ ] Integrate Have I Been Pwned API for password checks
- [ ] Implement password strength meter in UI
- [ ] Consider passphrase support (longer passwords)
- [ ] Update password validation schema
- [ ] Add user-facing password guidelines

---

### 12. Add CSRF Protection to All Mutation Routes 🔴
**Severity:** INFORMATIONAL

**Action Items:**
- [ ] Audit all POST/PUT/DELETE/PATCH routes
- [ ] Apply CSRF middleware to all mutation routes
- [ ] Create automated test for CSRF protection
- [ ] Document CSRF protection implementation
- [ ] Add CSRF token to all forms

---

## LOW PRIORITY (Address as Time Permits)

### 13. Implement Subresource Integrity (SRI) 🔴
**Action Items:**
- [ ] Add SRI hashes for external scripts
- [ ] Add SRI for CloudFront resources
- [ ] Implement automated SRI hash generation
- [ ] Test SRI with CDN resources

---

### 14. GDPR Compliance Improvements 🔴
**Action Items:**
- [ ] Implement data export API
- [ ] Add privacy policy
- [ ] Add cookie consent mechanism
- [ ] Document data retention policies
- [ ] Implement automatic data deletion after inactivity

---

### 15. Create Security Documentation 🔴
**Action Items:**
- [ ] Create security.txt file
- [ ] Document security procedures
- [ ] Create incident response plan
- [ ] Define security roles and responsibilities
- [ ] Document breach notification process

---

### 16. Set Up Security Monitoring 🔴
**Action Items:**
- [ ] Monitor failed login attempts
- [ ] Alert on rate limit violations
- [ ] Monitor admin actions
- [ ] Detect session anomalies
- [ ] Set up weekly dependency vulnerability scans

---

## CI/CD Security Integration

### 17. Automated Security Testing 🔴
**Action Items:**
- [ ] Add SAST (Semgrep or CodeQL) to GitHub Actions
- [ ] Enable GitHub secret scanning
- [ ] Set up Dependabot for dependency updates
- [ ] Add npm audit to CI pipeline
- [ ] Implement Docker image scanning (Trivy)
- [ ] Add security linting to pre-commit hooks

---

## Completed Items 🟢

### ✅ Item #1: Remove Hardcoded Credentials (Completed: November 7, 2025)
- Removed all hardcoded database credentials from test files
- Added production environment checks to seed scripts
- Created .env.test.example and .env.local.example
- Updated package.json to use environment variables
- Added comprehensive warnings about test-only usage

**Changes Made:**
- `jest.setup.js`: Now requires TEST_DATABASE_URL, fails gracefully with helpful error
- `scripts/seed-test-user.js`: Added production checks, uses TEST_USER_PASSWORD env var
- `scripts/seed-dev-data.js`: Added production checks, uses TEST_USER_PASSWORD env var
- `package.json`: Removed hardcoded credentials from db:seed script
- `.env.test.example`: Created with test configuration template
- `.env.local.example`: Created with development configuration template

---

### ✅ Item #2: Enforce Secure Cookies in Production (Completed: November 7, 2025)
- Deprecated DISABLE_SECURE_COOKIES environment variable
- Added production validation that prevents insecure cookie configuration
- Secure cookies are now automatically determined by NODE_ENV only
- Added DATABASE_URL validation for production environments

**Changes Made:**
- `src/lib/auth/lucia.ts`: Added startup validation, runtime checks, and clear error messages
- `.env.example`: Removed DISABLE_SECURE_COOKIES, added explanation of auto-determination
- `.env.local.example`: Removed DISABLE_SECURE_COOKIES, added security notes
- All `docker-compose.*.yml` files: Removed DISABLE_SECURE_COOKIES, added deprecation notes
- Production builds now fail fast if DISABLE_SECURE_COOKIES=true is set
- Development environments get warning if DISABLE_SECURE_COOKIES is set

**Security Guarantees:**
- Secure cookies ALWAYS enabled in production (NODE_ENV=production)
- Cannot be disabled via environment variable
- Runtime validation prevents misconfiguration
- Clear error messages guide developers to correct configuration

---

## Notes

- Review this list weekly and update progress
- Prioritize based on risk and impact
- Test all security changes thoroughly
- Document all security implementations
- Update SECURITY_AUDIT_REPORT.md as items are completed

---

**Next Review Date:** November 14, 2025
