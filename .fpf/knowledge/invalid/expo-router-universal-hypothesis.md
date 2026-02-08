---
id: expo-router-universal
type: hypothesis
created: 2026-02-07
problem: Convert fancy-planties web app to iOS app
status: invalid
invalidated: 2026-02-07
invalidation_reason: |
  Failed deduction: "Single codebase" requires rewriting the ENTIRE backend and produces
  a worse web experience — more total work than maintaining two focused codebases.

  1. BACKEND REWRITE REQUIRED: 82 API route files, 48 files using validateRequest(),
     72 files using server-only imports. All tightly coupled to NextRequest/NextResponse
     and next/headers. Extracting to Fastify/Hono is ~8,000-12,000 lines of server code
     to port. This is not "extraction" — it is a full rewrite.

  2. WEB EXPERIENCE REGRESSION: Lose Server Components, streaming SSR, edge middleware,
     route-level code splitting, and Turbopack. Expo Router web is client-side only.
     Produces larger JS bundles (+150-200KB React Native for Web overhead).

  3. NATIVEWIND LIMITATIONS: No CSS Grid, position: fixed, CSS animations, pseudo-selectors.
     108 client components need significant refactoring, not just styling swaps.

  4. THREE DEPLOYMENT TARGETS: Instead of one (Next.js Docker), need Expo web (static/Node),
     Fastify/Hono API server (separate Docker), and mobile app. Triples ops complexity.

  5. NO SERVICE WORKER: Expo Router has no built-in PWA support. Offline features regress.

  Learning: "Single codebase = less work" is false when that codebase requires rewriting
  the backend, degrading the web frontend, AND adding platform-specific UI code. The total
  work exceeds maintaining two purpose-built codebases. H5 solves a problem (two codebases)
  by creating a worse problem.
formality: 3
novelty: Novel
complexity: High
author: Claude (generated), Human (to review)
scope:
  applies_to: "N/A — invalidated"
  not_valid_for: "N/A"
  scale: "N/A"
---

# Hypothesis: Expo Router Universal App (INVALID)

## Deduction Analysis

### Fatal Contradiction: "Single codebase" produces MORE work, not less

The hypothesis assumes extracting API routes from Next.js is a bounded task. Codebase inspection reveals:
- 82 API route files coupled to `NextRequest`/`NextResponse`
- 48 files using `validateRequest()` which imports from `next/headers`
- 72 files with `server-only` imports
- 12 auth/middleware files dependent on Next.js request context

Total extraction cost: ~8,000-12,000 lines of server code rewritten for a different framework.

### L2 Consistency
No direct L2 contradictions, but contradicts the learning from INVALID-capacitor: that this app's server-side architecture is deeply coupled to Next.js. H5 requires severing ALL of those couplings.

### Implication Analysis
- Lose Server Components (72 files) → larger client bundles, slower initial load
- Lose middleware → auth/CSRF/rate-limiting must be rebuilt in Fastify/Hono
- NativeWind covers ~70-80% of Tailwind → remaining 20-30% needs platform-specific code
- Service worker lost → offline functionality regresses

### VERDICT: FAIL
The "single codebase" benefit does not compensate for rewriting the backend AND degrading the web experience.
