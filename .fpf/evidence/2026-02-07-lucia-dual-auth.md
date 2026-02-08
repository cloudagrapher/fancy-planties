---
id: lucia-dual-auth
type: external-research
source: docs
created: 2026-02-07
hypothesis: ../knowledge/L1/expo-monorepo-hypothesis.md
assumption_tested: "Lucia Auth can be extended to dual-mode (cookie + bearer token)"
valid_until: 2027-02-07
decay_action: refresh
congruence:
  level: high
  penalty: 0.00
  source_context: "Lucia v3 official documentation and maintainer discussions"
  our_context: "Lucia v3.2.2 with PostgreSQL adapter, Next.js 15"
  justification: "Direct match — same library version, same use case (mobile + web auth)"
sources:
  - url: https://v3.lucia-auth.com/guides/validate-bearer-tokens
    title: "Lucia v3 - Validate Bearer Tokens Guide"
    type: official-docs
    accessed: 2026-02-07
    credibility: high
  - url: https://v3.lucia-auth.com/basics/sessions
    title: "Lucia v3 - Sessions Documentation"
    type: official-docs
    accessed: 2026-02-07
    credibility: high
  - url: https://github.com/lucia-auth/lucia/discussions/652
    title: "RFC: Support native apps (#652)"
    type: official-docs
    accessed: 2026-02-07
    credibility: high
  - url: https://github.com/lucia-auth/lucia/discussions/1714
    title: "A Fresh Start - Deprecation Announcement (#1714)"
    type: official-docs
    accessed: 2026-02-07
    credibility: high
scope:
  applies_to: "H1, H3, H4 — any hypothesis requiring bearer token auth alongside cookies"
  not_valid_for: "JWT-based or OAuth-only auth flows"
---

# Research: Lucia v3 Dual-Mode Authentication

## Purpose
Verify whether Lucia Auth v3 can support both cookie-based (web) and bearer token (mobile) authentication simultaneously.

## Findings

### ASSUMPTION STRONGLY SUPPORTED

1. **`lucia.validateSession(sessionId)` is source-agnostic.** It takes a plain string and does a database lookup. Does not care if the ID came from a cookie or Authorization header.

2. **Lucia v3 has an official Bearer Token guide** at `v3.lucia-auth.com/guides/validate-bearer-tokens`. The built-in `lucia.readBearerToken()` helper extracts session IDs from `Authorization: Bearer` headers.

3. **Session creation returns a usable token.** `lucia.createSession(userId, {})` returns a session object whose `.id` is the bearer token. Mobile login endpoint returns this ID instead of setting a cookie.

4. **Session IDs have 200 bits of entropy** (25 random bytes, base32 encoded). Exceeds OWASP's 128-bit minimum.

5. **Session refresh works transparently.** When `session.fresh === true`, Lucia has already extended the expiration in the database. The session ID does NOT change. Mobile client just needs to know the new expiration (via response header).

6. **CSRF exemption is correct.** Bearer tokens are not ambient credentials — CSRF attacks don't apply. Middleware should skip CSRF for bearer-token requests.

### Security Considerations
- Session IDs stored in plaintext in PostgreSQL (no hashing). Database compromise = all sessions usable.
- Token storage on mobile MUST use iOS Keychain (expo-secure-store), not AsyncStorage.
- Lucia v3 does NOT rotate session IDs on refresh.

### Deprecation Note
Lucia v3 was deprecated in late 2024. No new features or security patches. Works fine as-is on v3.2.2 but be aware.

## Verdict
- [x] Assumption **SUPPORTED** by external evidence (congruence: HIGH)

## Implementation Impact
Changes needed in `src/lib/auth/server.ts`:
- `validateRequest()` → check Authorization header first, fall back to cookies
- Middleware → skip CSRF for bearer-token requests
- New endpoint: `POST /api/auth/token` to create and return session for mobile login
