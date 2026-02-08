---
id: capacitor-wrapper
type: hypothesis
created: 2026-02-07
problem: Convert fancy-planties web app to iOS app
status: invalid
invalidated: 2026-02-07
invalidation_reason: |
  Failed deduction: Fatal structural contradiction between Capacitor's static-export
  model and Next.js SSR architecture.

  1. STATIC EXPORT IMPOSSIBLE: Next.js with output: 'standalone' uses Server Components,
     API Routes, Middleware, cookies(), headers() — none of which work with output: 'export'.
     Capacitor requires static files in WKWebView. The "zero UI rewrite" claim is false.

  2. COOKIE SCOPING BROKEN: WKWebView serves content from capacitor://localhost. CloudFront
     signed cookies are scoped to .fancy-planties.com domain. Cookies would NOT be sent
     with cross-origin image requests from capacitor:// origin.

  3. CSRF VALIDATION FAILS: Middleware checks Origin header against expected host. Requests
     from Capacitor would have Origin: capacitor://localhost, failing CSRF with 403.

  4. NO SERVICE WORKER: WKWebView does not support Service Workers. All PWA offline
     functionality is lost.

  5. REMOTE URL FALLBACK: Pointing WKWebView at remote server works technically but
     creates a "web clip" that Apple likely rejects under guideline 4.2.

  Learning: Next.js SSR apps cannot be wrapped by Capacitor without either (a) gutting
  all server-side functionality (full rewrite, not "zero rewrite") or (b) pointing at
  a remote URL (Apple rejection risk). The hypothesis's core premise — minimal changes —
  is structurally impossible with this architecture.
formality: 3
novelty: Conservative
complexity: Low
author: Claude (generated), Human (to review)
scope:
  applies_to: "N/A — invalidated"
  not_valid_for: "N/A"
  scale: "N/A"
---

# Hypothesis: Capacitor Wrapper over Existing Next.js PWA (INVALID)

## Deduction Analysis

### 1. Consistency with L2 Knowledge

| L2 Fact | Compatible? | Analysis |
|---------|-------------|----------|
| S3 Thumbnail Generation | ✓ | Thumbnail pipeline is server-side, decoupled from client |
| CloudFront signed cookies architecture | ✗ | Cookies scoped to .fancy-planties.com, not sent from capacitor://localhost |
| Next.js Image unoptimized flag is intentional | ✗ | Confirms browser-direct-to-CloudFront pattern that breaks in WKWebView |

**Verdict:** Contradicts L2 cookie/auth architecture

### 2. Internal Consistency — FATAL CONTRADICTION

Next.js 15 with `output: 'standalone'` produces a Node.js server, not static files.
- Server Components use `import 'server-only'`, `cookies()`, `headers()`
- API Routes (`/api/plants`, `/api/images/auth-cookie`, `/api/csrf`) are server functions
- Middleware runs on Edge Runtime (CSRF, auth redirects, security headers)

Switching to `output: 'export'` would require removing ALL of the above. This IS a full rewrite.

**Verdict:** Fatal internal contradiction — "zero UI rewrite" is false

### 3. Implication Analysis

| Implication | Acceptable? | Analysis |
|-------------|-------------|---------|
| WKWebView must send CloudFront cookies cross-origin | ✗ | capacitor://localhost ≠ .fancy-planties.com domain |
| CSRF double-submit must work | ✗ | Origin: capacitor://localhost fails validation |
| Service worker must function | ✗ | WKWebView does not support Service Workers |

**Verdict:** Three fatal implications

### VERDICT: FAIL

Structural impossibility. No amount of engineering resolves the SSR-vs-static-export contradiction without abandoning the hypothesis's core premise.
