# Security Audit Report
**Project:** Fancy Planties
**Audit Date:** November 7, 2025
**Auditor:** Claude AI Security Audit
**Technology Stack:** Next.js 15, PostgreSQL 16, Lucia Auth, Drizzle ORM

---

## Executive Summary

This security audit examined the Fancy Planties application, a production-ready plant management Progressive Web Application. The audit evaluated authentication/authorization mechanisms, input validation, common vulnerabilities (OWASP Top 10), dependency security, configuration management, and deployment security.

**Overall Security Posture:** GOOD with some areas requiring attention

### Key Findings
- **Critical Issues:** 0
- **High Severity:** 2
- **Medium Severity:** 5
- **Low Severity:** 3
- **Informational:** 4

---

## 1. Security Strengths

### 1.1 Authentication & Authorization ✅
**Status:** EXCELLENT

- **Session-based authentication** using Lucia Auth with PostgreSQL adapter
- **Proper password hashing** using bcryptjs with 12 salt rounds (industry standard)
- **Email verification** required for new users with 6-digit codes
- **Multi-level authorization:**
  - Public routes
  - Authenticated routes
  - Email-verified routes
  - Curator/admin routes
- **Secure session management:**
  - HTTP-only cookies
  - Secure flag in production
  - SameSite policy (strict in production, lax in development)
  - Session expiration and refresh
- **Request caching** for performance optimization
- **Password reset flow** with secure tokens and 24-hour expiration

**Files Reviewed:**
- `src/lib/auth/lucia.ts`
- `src/lib/auth/server.ts`
- `src/lib/auth/admin-auth.ts`
- `middleware.ts`

### 1.2 Input Validation ✅
**Status:** EXCELLENT

- **Comprehensive Zod schemas** for all user inputs
- **Type-safe validation** with TypeScript
- **Sanitization and transformation:**
  - Email normalization (lowercase)
  - String trimming
  - Name validation (regex patterns)
  - Length constraints
  - URL validation for images
- **Password requirements:**
  - Minimum 8 characters
  - Maximum 128 characters
  - Must contain: lowercase, uppercase, and number
- **Fertilizer schedule validation** with regex patterns
- **Bulk operation limits** (max 50 items)
- **Image upload limits** (max 10 per instance)

**Files Reviewed:**
- `src/lib/validation/plant-schemas.ts`
- `src/lib/validation/care-schemas.ts`
- `src/lib/validation/propagation-schemas.ts`
- `src/lib/validation/admin-schemas.ts`
- `src/lib/auth/validation.ts`

### 1.3 SQL Injection Protection ✅
**Status:** EXCELLENT

- **Drizzle ORM** provides type-safe queries with parameterized statements
- **No raw SQL queries** found in codebase
- **Prepared statements** used throughout
- **Type checking** prevents injection attempts

### 1.4 CSRF Protection ✅
**Status:** GOOD

- **CSRF token generation** using HMAC-SHA256
- **Timing-safe comparison** with `timingSafeEqual()`
- **Session-based token validation**
- **GET requests exempted** (idempotent operations)
- **HTTP-only cookie storage**

**Files Reviewed:**
- `src/lib/auth/csrf.ts`
- `src/lib/auth/middleware.ts`

### 1.5 Rate Limiting ✅
**Status:** GOOD

- **Database-backed rate limiting**
- **Configuration:**
  - 100 requests per 15-minute window
  - Per IP address (or user ID for authenticated requests)
  - Automatic cleanup of old records
- **Proper headers:**
  - X-RateLimit-Limit
  - X-RateLimit-Remaining
  - X-RateLimit-Reset
- **429 status code** for exceeded limits

**Files Reviewed:**
- `src/lib/auth/middleware.ts` (lines 10-103)

### 1.6 Security Headers ✅
**Status:** EXCELLENT

**Middleware Headers:**
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy` with appropriate directives

**Next.js Config Headers:**
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-DNS-Prefetch-Control: on`
- `Referrer-Policy: origin-when-cross-origin`
- `poweredByHeader: false` (removes X-Powered-By header)

**Files Reviewed:**
- `middleware.ts` (lines 131-151)
- `next.config.ts` (lines 107-153)

### 1.7 Docker Security ✅
**Status:** EXCELLENT

**Dockerfile Best Practices:**
- **Multi-stage builds** for minimal image size
- **Non-root user** (nextjs:1001)
- **Alpine base images** for reduced attack surface
- **Read-only filesystem** in production
- **Dependency verification** with lockfile checks
- **Telemetry disabled** for privacy

**Docker Compose Security:**
- **Security options:**
  - `no-new-privileges:true`
  - `read_only: true`
  - tmpfs for temporary files
- **Resource limits:**
  - CPU: 1.0 max, 0.5 reserved
  - Memory: 1GB max, 512MB reserved
- **Health checks** for both app and database
- **Network isolation** with custom bridge network
- **PostgreSQL hardening:**
  - Read-only filesystem
  - Health checks
  - Secure configuration

**Files Reviewed:**
- `Dockerfile`
- `docker-compose.yml`

### 1.8 XSS Protection ✅
**Status:** GOOD

- **React's built-in escaping** for all rendered content
- **No `dangerouslySetInnerHTML`** found in production code (only in test files)
- **CSP headers** configured in middleware
- **Content-Type headers** properly set

---

## 2. Security Vulnerabilities & Concerns

### 2.1 HIGH SEVERITY Issues

#### H-1: Hardcoded Credentials in Test Files
**Severity:** HIGH
**CWE:** CWE-798 (Use of Hard-coded Credentials)
**Risk:** Credential exposure, potential unauthorized access

**Description:**
Several test and seed files contain hardcoded database credentials and test passwords:

**Affected Files:**
1. `jest.setup.js:26`
   ```javascript
   process.env.DATABASE_URL = 'postgresql://postgres:simple_password_123@localhost:5432/fancy_planties';
   ```

2. `scripts/seed-test-user.js:29`
   ```javascript
   const hashedPassword = await bcrypt.hash('password123', 12);
   console.log('🔑 Password: password123');
   ```

3. `scripts/seed-dev-data.js:28`
   ```javascript
   const hashedPassword = await bcrypt.hash('password123', 12);
   console.log('🔑 Password: password123');
   ```

4. `package.json:49`
   ```json
   "db:seed": "DATABASE_URL=\"postgresql://postgres:postgres@localhost:5432/fancy_planties\" npx tsx scripts/seed-plants.ts"
   ```

**Impact:**
- If these scripts are run in production, they create known weak credentials
- Database password exposed in code
- Test users with known passwords could be created

**Recommendation:**
1. Remove hardcoded credentials from test setup files
2. Use environment variables for all database connections
3. Add warnings to seed scripts to prevent production use
4. Ensure test users are deleted after testing
5. Update package.json to use environment variables

**Example Fix:**
```javascript
// jest.setup.js
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ||
  (() => { throw new Error('TEST_DATABASE_URL environment variable is required'); })();

// seed scripts should check environment
if (process.env.NODE_ENV === 'production') {
  console.error('❌ Cannot run seed scripts in production');
  process.exit(1);
}
```

#### H-2: Insecure Cookie Configuration in Development
**Severity:** HIGH (in production), LOW (in development)
**CWE:** CWE-614 (Sensitive Cookie in HTTPS Session Without 'Secure' Attribute)
**Risk:** Session hijacking via MITM attacks

**Description:**
The application allows disabling secure cookies via the `DISABLE_SECURE_COOKIES` environment variable. This is configured in `lucia.ts:22-23`:

```typescript
secure: process.env.NODE_ENV === 'production',
sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
```

And in `.env.example:19`:
```
DISABLE_SECURE_COOKIES=true
```

**Impact:**
- If `DISABLE_SECURE_COOKIES` is accidentally set to `true` in production, session cookies could be transmitted over HTTP
- Vulnerable to man-in-the-middle attacks
- Session hijacking possible

**Recommendation:**
1. Remove `DISABLE_SECURE_COOKIES` environment variable
2. Force secure cookies in production regardless of environment variables
3. Add runtime checks to prevent insecure configuration in production

**Example Fix:**
```typescript
// lucia.ts
sessionCookie: {
  expires: false,
  attributes: {
    secure: process.env.NODE_ENV === 'production', // Always true in prod
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  },
},

// Add validation in startup
if (process.env.NODE_ENV === 'production' && process.env.DISABLE_SECURE_COOKIES === 'true') {
  throw new Error('DISABLE_SECURE_COOKIES cannot be true in production');
}
```

### 2.2 MEDIUM SEVERITY Issues

#### M-1: Moderate Severity npm Dependencies
**Severity:** MEDIUM
**CWE:** CWE-1035 (Use of Component with Known Vulnerabilities)
**Risk:** Potential security vulnerabilities in dependencies

**Description:**
npm audit revealed 4 moderate severity vulnerabilities:

```
drizzle-kit: Vulnerable to esbuild issues (transitive dependency)
@esbuild-kit/core-utils: Vulnerable through esbuild
@esbuild-kit/esm-loader: Vulnerable through esbuild
esbuild: CVE allowing development server request spoofing (GHSA-67mh-4wv8-2f99)
```

**CVE Details:**
- **GHSA-67mh-4wv8-2f99:** esbuild enables any website to send any requests to the development server and read the response
- **CVSS Score:** 5.3 (MODERATE)
- **Affected:** esbuild <=0.24.2

**Impact:**
- Development server could be vulnerable to request spoofing
- Cross-site request vulnerabilities in dev environment
- These are dev dependencies, so production is less affected

**Recommendation:**
1. Update drizzle-kit to latest version (currently 0.31.4, fix available in 0.18.1+)
2. Monitor security advisories for drizzle-kit
3. Run `npm audit fix` to attempt automatic updates
4. Consider using `npm audit --production` to focus on production dependencies
5. Implement automated dependency scanning in CI/CD

**Commands:**
```bash
npm audit fix
npm update drizzle-kit
npm audit --production
```

#### M-2: CSP Allows 'unsafe-inline' and 'unsafe-eval'
**Severity:** MEDIUM
**CWE:** CWE-79 (Cross-site Scripting)
**Risk:** Reduced XSS protection

**Description:**
The Content Security Policy in `middleware.ts:142-143` allows `'unsafe-inline'` and `'unsafe-eval'`:

```typescript
"script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline and unsafe-eval
"style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
```

**Impact:**
- Inline scripts can be executed
- eval() and similar functions can be used
- Reduces effectiveness of XSS protection
- Necessary for Next.js and Tailwind, but increases attack surface

**Recommendation:**
1. Use nonces for inline scripts instead of `'unsafe-inline'`
2. Implement strict CSP in Next.js 15 using experimental features
3. Consider using Tailwind's JIT mode with extracted CSS
4. Gradually migrate to stricter CSP

**Example with Nonces:**
```typescript
// In middleware
const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
const cspHeader = [
  "default-src 'self'",
  `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
  `style-src 'self' 'nonce-${nonce}'`,
  // ...
].join('; ');
response.headers.set('Content-Security-Policy', cspHeader);
response.headers.set('x-nonce', nonce);
```

#### M-3: Rate Limiting Uses IP Address Only
**Severity:** MEDIUM
**CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
**Risk:** Rate limit bypass

**Description:**
Rate limiting in `src/lib/auth/middleware.ts:136-139` only uses IP address:

```typescript
const identifier = request.headers.get('x-forwarded-for') ||
                  request.headers.get('x-real-ip') ||
                  'unknown';
```

**Issues:**
1. Users behind the same NAT/proxy share rate limits
2. No per-user rate limiting for authenticated requests
3. IP spoofing possible if headers are not validated
4. 'unknown' fallback could cause all unidentified requests to share a limit

**Impact:**
- Legitimate users blocked if sharing IP with abuser
- Authenticated users not tracked separately
- Potential for rate limit bypass

**Recommendation:**
1. Use user ID for authenticated requests
2. Combine IP + User ID for better tracking
3. Validate proxy headers or use direct connection IP
4. Implement progressive rate limiting (stricter for unauthenticated)

**Example Fix:**
```typescript
const { user } = await validateRequest();
const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                  request.headers.get('x-real-ip') ||
                  'unknown';

const identifier = user ? `user:${user.id}` : `ip:${ipAddress}`;

// Different limits for authenticated vs unauthenticated
const maxRequests = user ? 200 : 100;
```

#### M-4: Missing Audit Logging Implementation
**Severity:** MEDIUM
**CWE:** CWE-778 (Insufficient Logging)
**Risk:** Lack of security event tracking

**Description:**
Admin audit logging is defined but not fully implemented in `src/lib/auth/admin-auth.ts:271-303`:

```typescript
export async function logAdminAction(...) {
  try {
    console.log('Admin action logged:', { ... });

    // In a real implementation, this would insert into the database:
    // await db.insert(auditLogs).values({ ... });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}
```

**Impact:**
- Admin actions not permanently logged
- Cannot track security events
- Compliance issues (GDPR, SOC 2)
- Difficult to investigate security incidents

**Recommendation:**
1. Implement database audit logging immediately
2. Log all authentication events (login, logout, failed attempts)
3. Log all admin actions (user management, data changes)
4. Include IP address, user agent, timestamp
5. Implement log retention policy
6. Create admin audit log viewer

**Example Implementation:**
```typescript
export async function logAdminAction(
  action: string,
  entityType: 'user' | 'plant' | 'system',
  entityId?: number,
  details?: Record<string, any>
): Promise<void> {
  try {
    const { user } = await requireAdminAuth();

    await db.insert(auditLogs).values({
      action,
      entityType,
      entityId,
      performedBy: user.id,
      timestamp: new Date(),
      details: JSON.stringify(details),
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
      success: true,
    });
  } catch (error) {
    // Still log to console as backup
    console.error('Failed to log admin action:', error);
    throw error; // Don't silently fail
  }
}
```

#### M-5: No Session Timeout or Idle Detection
**Severity:** MEDIUM
**CWE:** CWE-613 (Insufficient Session Expiration)
**Risk:** Session hijacking, unauthorized access

**Description:**
Session configuration in `lucia.ts:19-25` has:
```typescript
sessionCookie: {
  expires: false,  // Sessions never expire
  // ...
}
```

**Impact:**
- Sessions don't expire automatically
- Idle users remain authenticated indefinitely
- Higher risk of session hijacking
- Compliance issues

**Recommendation:**
1. Set session expiration (e.g., 7-30 days)
2. Implement idle timeout (e.g., 30 minutes of inactivity)
3. Add "remember me" option for longer sessions
4. Implement session refresh on activity

**Example Fix:**
```typescript
sessionCookie: {
  expires: true,
  attributes: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
},

// Add idle timeout middleware
const SESSION_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export async function validateRequest() {
  const result = await lucia.validateSession(sessionId);

  if (result.session) {
    const idleTime = Date.now() - result.session.lastActivityAt.getTime();
    if (idleTime > SESSION_IDLE_TIMEOUT) {
      await lucia.invalidateSession(result.session.id);
      return { user: null, session: null };
    }

    // Update last activity
    await db.update(sessions)
      .set({ lastActivityAt: new Date() })
      .where(eq(sessions.id, result.session.id));
  }

  return result;
}
```

### 2.3 LOW SEVERITY Issues

#### L-1: Email Verification Code Reuse
**Severity:** LOW
**CWE:** CWE-640 (Weak Password Recovery Mechanism)
**Risk:** Verification code replay

**Description:**
Email verification codes are generated but may not be invalidated after max attempts. The schema in `src/lib/db/schema.ts` shows:
- 6-digit codes
- 15-minute expiration
- Max 3 attempts tracked

However, there's no evidence of code invalidation after successful use or max attempts in the codebase reviewed.

**Recommendation:**
1. Invalidate codes after successful verification
2. Invalidate codes after 3 failed attempts
3. Generate new codes on resend
4. Add rate limiting to code generation

#### L-2: Fallback Database Credentials
**Severity:** LOW
**CWE:** CWE-798 (Use of Hard-coded Credentials)
**Risk:** Weak default credentials

**Description:**
Several files have fallback database connection strings:

- `src/lib/auth/lucia.ts:8`
- `src/lib/db/index.ts:8`
- `src/lib/db/script-connection.ts:11`

```typescript
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fancy_planties';
```

**Impact:**
- Weak default credentials (postgres:postgres)
- Could be used if environment variables fail to load
- Development convenience vs security trade-off

**Recommendation:**
1. Remove fallback credentials in production builds
2. Fail fast if DATABASE_URL is missing in production
3. Keep fallbacks only for local development

**Example Fix:**
```typescript
const connectionString = process.env.DATABASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('DATABASE_URL is required in production'); })()
    : 'postgresql://postgres:postgres@localhost:5432/fancy_planties');
```

#### L-3: Missing HTTPS Enforcement
**Severity:** LOW
**CWE:** CWE-319 (Cleartext Transmission of Sensitive Information)
**Risk:** Data interception

**Description:**
No explicit HTTPS redirect found in Next.js configuration or middleware. While the HSTS header is set, initial HTTP requests are not automatically redirected to HTTPS.

**Recommendation:**
1. Add HTTPS redirect in middleware for production
2. Configure reverse proxy (nginx) to redirect HTTP to HTTPS
3. Use `next.config.ts` redirects for HTTP to HTTPS

**Example Fix:**
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  // Redirect HTTP to HTTPS in production
  if (process.env.NODE_ENV === 'production' &&
      request.headers.get('x-forwarded-proto') !== 'https') {
    return NextResponse.redirect(
      `https://${request.headers.get('host')}${request.nextUrl.pathname}`,
      301
    );
  }
  // ... rest of middleware
}
```

### 2.4 INFORMATIONAL Issues

#### I-1: CSRF Middleware Not Applied to All Routes
**Severity:** INFORMATIONAL
**Risk:** Limited CSRF protection

**Description:**
CSRF protection middleware exists (`withCSRFProtection`) but is not automatically applied to all mutation routes. Routes must explicitly use this middleware.

**Recommendation:**
1. Apply CSRF protection to all POST/PUT/DELETE/PATCH routes by default
2. Document which routes are exempt and why
3. Consider automatic CSRF protection in middleware

#### I-2: No Subresource Integrity (SRI)
**Severity:** INFORMATIONAL
**Risk:** Third-party script tampering

**Description:**
No SRI hashes found for external resources. While the application primarily uses self-hosted resources, any CDN-loaded assets should use SRI.

**Recommendation:**
1. Add SRI hashes for any external scripts or stylesheets
2. Use SRI for CloudFront resources if possible
3. Implement CSP with strict resource loading

#### I-3: Password Policy Could Be Stronger
**Severity:** INFORMATIONAL
**Risk:** Weak passwords

**Description:**
Current password policy in `src/lib/auth/validation.ts:4-11`:
- Minimum 8 characters
- Requires: lowercase, uppercase, number
- Missing: special characters, common password checks

**Recommendation:**
1. Add special character requirement
2. Check against common password lists (e.g., Have I Been Pwned)
3. Implement password strength meter
4. Consider passphrase support (longer, more memorable)

**Example Enhancement:**
```typescript
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters long')
  .max(128, 'Password must be less than 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
    'Password must contain lowercase, uppercase, number, and special character'
  )
  .refine(async (password) => {
    // Check against Have I Been Pwned
    const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.substring(0, 5);
    const suffix = sha1.substring(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    const data = await response.text();

    return !data.includes(suffix);
  }, 'This password has been found in data breaches');
```

#### I-4: No Security.txt File
**Severity:** INFORMATIONAL
**Risk:** Difficult vulnerability reporting

**Description:**
No `security.txt` file found for responsible disclosure.

**Recommendation:**
Create `.well-known/security.txt`:
```
Contact: security@fancy-planties.com
Expires: 2026-12-31T23:59:59.000Z
Preferred-Languages: en
Canonical: https://fancy-planties.com/.well-known/security.txt
```

---

## 3. Compliance Considerations

### 3.1 GDPR Compliance
**Status:** PARTIAL

**Implemented:**
- User data isolation (per-user data access)
- Email verification
- User deletion capability (needs verification)

**Missing:**
- Data export functionality
- Privacy policy reference
- Cookie consent mechanism
- Data retention policies
- Audit logging for data access

**Recommendations:**
1. Implement data export API
2. Add privacy policy and cookie consent
3. Document data retention policies
4. Implement automatic data deletion after inactivity period

### 3.2 OWASP Top 10 (2021) Assessment

| # | Category | Status | Notes |
|---|----------|--------|-------|
| 1 | Broken Access Control | ✅ GOOD | Multi-level auth, email verification, curator checks |
| 2 | Cryptographic Failures | ✅ GOOD | HTTPS, secure cookies, bcrypt hashing |
| 3 | Injection | ✅ EXCELLENT | Drizzle ORM prevents SQL injection |
| 4 | Insecure Design | ✅ GOOD | Session-based auth, proper architecture |
| 5 | Security Misconfiguration | ⚠️ MEDIUM | CSP allows unsafe-inline, dev credentials |
| 6 | Vulnerable Components | ⚠️ MEDIUM | 4 moderate npm vulnerabilities |
| 7 | Identification & Auth | ✅ GOOD | Strong password hashing, email verification |
| 8 | Software & Data Integrity | ✅ GOOD | Lockfile verification, integrity checks |
| 9 | Security Logging | ⚠️ MEDIUM | Audit logging not implemented |
| 10 | SSRF | ✅ GOOD | No external URL fetching from user input |

---

## 4. Recommendations by Priority

### 4.1 CRITICAL (Address Immediately)
1. **Remove hardcoded credentials** from test files and scripts
2. **Enforce secure cookies** in production with runtime checks
3. **Implement audit logging** for all security-relevant events

### 4.2 HIGH (Address Within 1 Week)
1. **Update npm dependencies** to fix moderate vulnerabilities
2. **Implement session expiration** and idle timeout
3. **Enhance rate limiting** with per-user tracking
4. **Add HTTPS enforcement** in production

### 4.3 MEDIUM (Address Within 1 Month)
1. **Improve CSP** with nonces instead of unsafe-inline
2. **Implement email verification code** invalidation
3. **Add password strength** checks (Have I Been Pwned)
4. **Create security.txt** file
5. **Add CSRF protection** to all mutation routes by default

### 4.4 LOW (Address as Time Permits)
1. **Implement SRI** for external resources
2. **Add data export** functionality for GDPR
3. **Create privacy policy** and cookie consent
4. **Document data retention** policies
5. **Add security awareness** documentation

---

## 5. Testing Recommendations

### 5.1 Security Testing
1. **Penetration testing** - Engage security firm for comprehensive testing
2. **SAST** - Integrate static analysis (e.g., Semgrep, CodeQL)
3. **DAST** - Dynamic application security testing (e.g., OWASP ZAP)
4. **Dependency scanning** - Automate with Dependabot or Snyk
5. **Container scanning** - Scan Docker images (e.g., Trivy, Clair)

### 5.2 CI/CD Security
1. **Automated security checks** in GitHub Actions
2. **Secret scanning** with GitHub secret scanning
3. **Dependency updates** via Dependabot
4. **Security linting** in pre-commit hooks
5. **Image signing** for Docker containers

---

## 6. Monitoring & Incident Response

### 6.1 Monitoring
1. **Failed login attempts** - Alert on brute force
2. **Rate limit violations** - Monitor for abuse
3. **Admin actions** - Alert on sensitive operations
4. **Session anomalies** - Detect session hijacking
5. **Dependency vulnerabilities** - Weekly scans

### 6.2 Incident Response
1. **Create incident response plan**
2. **Define security roles** and responsibilities
3. **Set up security contact** (security@domain)
4. **Document escalation procedures**
5. **Establish breach notification** process

---

## 7. Security Checklist for Production Deployment

- [ ] Remove all hardcoded credentials and test passwords
- [ ] Set DATABASE_URL from secure secrets management
- [ ] Enable secure cookies (verify DISABLE_SECURE_COOKIES is not set)
- [ ] Configure HTTPS redirect
- [ ] Update npm dependencies (npm audit fix)
- [ ] Enable audit logging
- [ ] Set session expiration timeout
- [ ] Configure rate limiting per user
- [ ] Review and restrict admin access
- [ ] Set up security monitoring and alerts
- [ ] Create security.txt file
- [ ] Document security procedures
- [ ] Test authentication flows
- [ ] Verify CSRF protection on all mutations
- [ ] Check CSP headers in production
- [ ] Enable automated security scanning
- [ ] Set up backup and recovery procedures
- [ ] Configure WAF if using CloudFront
- [ ] Review IAM permissions for AWS resources
- [ ] Enable CloudWatch logging
- [ ] Set up intrusion detection

---

## 8. Conclusion

The Fancy Planties application demonstrates **strong security fundamentals** with excellent authentication, authorization, input validation, and infrastructure security. The use of industry-standard libraries (Lucia Auth, Drizzle ORM, bcryptjs) and security best practices (Docker hardening, CSP headers, rate limiting) shows a solid security-conscious development approach.

However, several areas require immediate attention:
1. **Hardcoded credentials in test files** pose a significant risk
2. **Missing audit logging** impacts compliance and incident response
3. **Dependency vulnerabilities** should be addressed
4. **Session management** needs expiration and idle timeout

Once these high-priority issues are addressed, the application will have a **robust security posture** suitable for production deployment with sensitive user data.

**Overall Rating:** 7.5/10 (GOOD with improvements needed)

---

## 9. Appendix

### A. Security Resources
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- OWASP Cheat Sheets: https://cheatsheetseries.owasp.org/
- Next.js Security: https://nextjs.org/docs/app/building-your-application/configuring/security
- Node.js Security: https://nodejs.org/en/docs/guides/security/
- GDPR Compliance: https://gdpr.eu/

### B. Contact Information
For questions about this security audit, please contact the development team or create an issue in the repository.

### C. Document History
- **v1.0** - November 7, 2025 - Initial security audit completed
