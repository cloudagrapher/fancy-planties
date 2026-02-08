---
id: expo-monorepo
type: hypothesis
created: 2026-02-07
problem: Convert fancy-planties web app to iOS app
status: L1
deduction_passed: 2026-02-07
deduction_result: conditional
conditions_needed: |
  1. Bearer tokens MUST be stored in iOS Keychain (expo-secure-store), never AsyncStorage
  2. Token refresh mechanism MUST be designed alongside dual-auth implementation
  3. Batch presigned URL endpoint MUST be included in API to avoid N+1 image loading
  4. CSRF middleware MUST exempt bearer-token requests WITHOUT weakening web security
  5. Developer must accept ongoing maintenance cost of two UI codebases
deduction_notes: |
  CONDITIONAL PASS. Technically sound with five explicit conditions.

  Key findings from deduction:
  - Lucia's validateSession() just takes a string session ID — does not care where it came from.
    Extending validateRequest() to also check Authorization header is straightforward.
  - CSRF exemption for bearer tokens is correct security practice (bearer tokens are not
    ambient credentials, so CSRF attacks don't apply).
  - Presigned S3 URLs bypass CloudFront, losing edge caching. Need batch endpoint to
    avoid N+1 API calls for image-heavy views (plant grid).
  - Token refresh flow does not exist in current architecture — must be designed.
  - Two UI codebases is the honest cost. Every feature built twice.

  No L2 contradictions. No internal contradictions. All assumptions testable.
  Primary risk is maintenance burden, not technical feasibility.
formality: 3
novelty: Conservative
complexity: Medium
author: Claude (generated), Human (to review)
scope:
  applies_to: "Solo developer with React/Next.js expertise wanting native iOS app with code reuse"
  not_valid_for: "Teams wanting maximum native performance or iOS-exclusive features"
  scale: "Personal project, single developer"
---

# Hypothesis: Expo (React Native) in Monorepo with Shared Validation Layer

## 1. The Method (Design-Time)

### Proposed Approach
Use Expo managed workflow in a Turborepo/npm workspaces monorepo alongside the existing Next.js app. Share Zod schemas, TypeScript types, and a typed API client between web and mobile. Rebuild all UI natively with React Native components. Adapt authentication to support bearer tokens alongside existing cookie-based sessions.

### Rationale
Most proven path for a solo React developer. Expo eliminates native build complexity. Monorepo keeps types in sync. Sharing validation/types (not components) is realistic since React web and React Native use fundamentally different primitives. Existing API routes work unchanged — just add a bearer token auth path.

### Implementation Steps
1. Restructure repo into monorepo: `apps/web`, `apps/mobile`, `packages/shared`
2. Extract Zod schemas and TypeScript types into `packages/shared`
3. Add bearer token auth path to `validateRequest()` in existing API routes
4. Build typed API client in `packages/shared`
5. Scaffold Expo app with React Navigation, React Query, react-hook-form
6. Rebuild screens iteratively: Dashboard → Plants Grid → Care Tracking → Propagations
7. Handle S3 images via presigned URLs (replace signed cookies for mobile)
8. Implement push notifications for care reminders

### Expected Capability
- Native iOS app with smooth scrolling, native gestures, native camera
- Shared type safety between web and mobile
- Single repo with coordinated releases
- Existing web app continues working unchanged

## 2. The Validation (Run-Time)

### Plausibility Assessment

| Filter | Score | Justification |
|--------|-------|---------------|
| **Simplicity** | Med | Monorepo adds tooling complexity, but Expo simplifies mobile build chain |
| **Explanatory Power** | High | Addresses all four user questions cleanly |
| **Consistency** | High | React ecosystem continuity, same TypeScript, same React Query patterns |
| **Falsifiability** | High | Clear metrics: if shared code < 15% of total effort, monorepo not justified |

**Plausibility Verdict:** PLAUSIBLE

### Deduction Results

#### L2 Consistency: NO CONTRADICTIONS
- Thumbnail pipeline (L2) is server-side, decoupled from client — no conflict
- Presigned URLs bypass CloudFront (lose edge caching) but are architecturally sound
- INVALID hypothesis learning (no Next.js image proxy) does not apply — mobile uses RN Image component

#### Internal Consistency: PASS
- Shared types/schemas claim is honest (only ~500 lines, not UI components)
- Lucia session validation accepts any string ID — header-based auth is straightforward
- CSRF exemption for bearer tokens is correct (not ambient credentials)
- Full UI rewrite is explicitly acknowledged — no hidden assumptions

#### Critical Implications
1. **Dual auth (cookie + bearer)** — Well-understood pattern. Middleware must differentiate correctly.
2. **Presigned URL batch endpoint** — Required for plant grid performance (20+ images). Without it, N+1 API calls.
3. **Token refresh flow** — Does not exist in current arch. Must be designed (near-expiry detection + refresh).
4. **Token storage** — MUST use iOS Keychain (expo-secure-store). AsyncStorage is insecure.
5. **Two UI codebases** — Every feature built twice. Honest cost for a solo developer.

#### Edge Cases Identified
- Push notification infrastructure needed (APNs setup, device token storage, Expo Push Service)
- Offline mode possible via SQLite + Expo but not addressed in hypothesis (omission, not contradiction)
- Watchtower restart window may cause brief API unavailability — mobile needs retry logic

### Assumptions to Verify
- [ ] Lucia Auth can be extended to dual-mode (cookie + bearer token) without full rewrite
- [ ] Presigned URL batch endpoint performs acceptably for 20+ images
- [ ] Expo managed workflow supports camera, push notifications, background tasks
- [ ] Monorepo restructuring does not break existing CI/CD pipeline
- [ ] Token refresh flow can be implemented cleanly on top of Lucia sessions

### Required Evidence
- [ ] **Internal Test:** Spike Lucia dual-mode auth (cookie + bearer token) — 1-2 days
  - **Performer:** Developer
- [ ] **Internal Test:** Build batch presigned URL endpoint, measure latency for 20 URLs
  - **Performer:** Developer
- [ ] **Research:** Verify Expo managed workflow supports all required native features
  - **Performer:** AI Agent

## Falsification Criteria
- If Lucia Auth cannot support dual-mode auth without a full rewrite, this approach fails
- If shared code (types, schemas, API client) < 10% of total mobile effort, monorepo not justified
- If Expo managed workflow cannot handle camera + background notifications, must eject (loses simplicity)
- If presigned URL batch endpoint latency > 500ms for 20 URLs, image loading UX is unacceptable

## Estimated Effort
8-12 weeks (2 weeks monorepo + auth, 6-8 weeks screen rebuild, 2 weeks polish + App Store)

## Weakest Link (Updated After Deduction)
**Maintenance burden.** Two UI codebases maintained by one developer. Every feature built twice. The technical weakest links (token refresh, presigned URL batching, CSRF middleware) are all well-understood engineering problems. The real question is sustainability.
