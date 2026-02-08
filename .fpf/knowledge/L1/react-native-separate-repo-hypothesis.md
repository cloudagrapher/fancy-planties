---
id: react-native-separate-repo
type: hypothesis
created: 2026-02-07
problem: Convert fancy-planties web app to iOS app
status: L1
deduction_passed: 2026-02-07
deduction_result: conditional
conditions_needed: |
  1. Replace "bare CLI" with Expo — bare RN CLI adds operational overhead with zero benefit
     for this app's feature set (camera, push, haptics, offline all supported by Expo)
  2. Same 5 backend conditions as H1 (dual-auth, Keychain tokens, batch presigned URLs,
     CSRF exemption, token refresh)
  3. Accept type drift risk — either publish Zod schemas as npm package or accept manual sync
deduction_notes: |
  CONDITIONAL PASS. Architecturally sound but converges with H1 once "bare CLI" is
  replaced with Expo. The key difference from H1 is: separate repo vs monorepo.

  Separate repo tradeoffs:
  + Simpler repo structure (no Turborepo config)
  + Independent CI/CD pipelines
  + Cleaner mental model (web = web, mobile = mobile)
  - Type drift between repos (Zod schemas duplicated)
  - No compile-time safety across API boundary
  - Two CI/CD pipelines to maintain

  If "bare CLI" is kept, this is strictly inferior to H1 (same work, more build hassle).
  If "bare CLI" is replaced with Expo, this becomes "H1 without the monorepo" — a
  legitimate alternative if monorepo tooling is unwanted.

  Critical finding: bare RN CLI in 2026 offers no advantage over Expo for this app.
  All needed native features (camera, push, haptics, secure storage, SQLite) are
  covered by Expo modules.
formality: 3
novelty: Conservative
complexity: Medium
author: Claude (generated), Human (to review)
scope:
  applies_to: "Solo developer wanting clean separation between web and mobile codebases"
  not_valid_for: "Teams wanting maximum code reuse or shared component libraries"
  scale: "Personal project, clean architecture over shared complexity"
---

# Hypothesis: React Native in Separate Repository (Updated: Expo recommended over bare CLI)

## 1. The Method (Design-Time)

### Proposed Approach
Create a new repository with Expo (not bare React Native CLI — see deduction notes). Build the mobile app from scratch with React Native components. Consume existing Next.js API routes via bearer token auth. Zod schemas and types duplicated or published as npm package.

### Implementation Steps
1. Create new repo with Expo (`npx create-expo-app`)
2. Add dual-auth to existing Next.js API (same as H1)
3. Build API client using existing route signatures
4. Implement screens iteratively: Auth → Plant Grid → Plant Detail → Care Tracking → Propagations
5. Use React Navigation, React Query, react-hook-form
6. Native camera with presigned URL upload to S3
7. Background fetch for care reminders
8. Publish Zod schemas as npm package OR accept manual sync

## 2. The Validation (Run-Time)

### Deduction Results

#### L2 Consistency: NO CONTRADICTIONS
- Thumbnail pipeline decoupled from client ✓
- Presigned URLs bypass CloudFront correctly ✓
- Bearer token auth required (same as all mobile hypotheses) ✓

#### Internal Consistency: PASS (with bare CLI → Expo correction)
- Bare RN CLI offers no advantage for this app's features
- Expo provides all needed native modules with less ops overhead
- Separate repo is architecturally valid

#### Key Implications
- Backend modifications identical to H1 (dual-auth, presigned URLs, CSRF exemption)
- 108 client components + 11 hooks = full UI rewrite (same scope as H1)
- Type drift is the main tradeoff vs H1's monorepo shared package
- Two CI/CD pipelines needed (web + mobile)

### Assumptions to Verify
- [ ] Expo covers all native features needed (camera, push, haptics, secure store, offline DB)
- [ ] Zod schemas can be published as npm package across repos (or drift is acceptable)
- [ ] Same 5 backend conditions as H1

## Falsification Criteria
- If schema drift causes mobile breakage >1x/month, need shared types (→ converge to H1)
- If Expo cannot handle all native features, must eject (loses simplicity)
- Same auth conditions as H1

## Estimated Effort
8-12 weeks (same as H1 — the UI rewrite dominates, not repo structure)

## Weakest Link (Updated)
**Type drift between repos.** Without compile-time safety across the API boundary, schema changes are the primary source of silent breakage. If this proves painful, the natural evolution is to adopt H1's monorepo approach.
