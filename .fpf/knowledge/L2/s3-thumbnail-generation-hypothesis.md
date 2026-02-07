---
id: s3-thumbnail-generation
type: hypothesis
created: 2026-02-06
problem: Images load slowly from CDN; no server-side thumbnails
status: L2
deduction_passed: 2026-02-06
induction_passed: 2026-02-06
evidence:
  - ../../evidence/2026-02-06-sharp-benchmark.md
  - ../../evidence/2026-02-06-display-size-analysis.md
  - ../../evidence/2026-02-06-no-server-processing-confirmed.md
evidence_summary: |
  Sharp generates 4 thumbnails in <100ms with <200MB memory.
  4 optimal thumbnail tiers identified from codebase: 64x64, 200x150, 300x300, 400x300.
  Plant list view currently loads 100MB+ where 100KB would suffice (1000x reduction).
  Lambda execution estimated at 340-590ms total (well within 30s timeout).
deduction_notes: |
  Passed logical consistency check.
  No S3 event notifications currently on bucket — clean add.
  Signed cookies are path-scoped to bucket root (/*), so thumbnail paths work automatically.
  Lambda role already has read_write on the bucket.
  Key risk: recursive trigger if Lambda writes back to same bucket prefix.
  Mitigation: use distinct prefix (thumb-*) and filter S3 event to exclude it.
formality: 3
novelty: Conservative
complexity: Medium
author: Claude (generated), Human (to review)
scope:
  applies_to: "All S3-stored plant images served via CloudFront"
  not_valid_for: "Legacy Base64 images still in database"
  scale: "Hundreds to low thousands of images"
---

# Hypothesis: Generate thumbnails server-side at upload time via Lambda

## 1. The Method (Design-Time)

### Proposed Approach
Add an S3 event-triggered Lambda function that generates multiple thumbnail sizes (150x150, 400x300, 800x600) when an image is uploaded. Store thumbnails alongside originals in S3 with a predictable key pattern (e.g., `users/{id}/.../thumb-150/{file}.webp`). Update the frontend to request appropriate thumbnail sizes based on context (list view, card, gallery).

### Rationale
This is the industry-standard approach for image-heavy apps. Generating thumbnails at upload time means the cost is paid once (write-time) and every subsequent read is fast. Lambda + Sharp is battle-tested for this. CloudFront already serves the bucket, so thumbnails get CDN caching automatically.

### Implementation Steps
1. Add a Lambda function (Python/Pillow or Node/Sharp) triggered by S3 PutObject events
2. Lambda generates 3 sizes (small/medium/large) in WebP format, stores back in S3
3. Update `s3-image-service.ts` to provide thumbnail URL helpers (e.g., `s3KeyToThumbnailUrl(key, size)`)
4. Update `S3Image` component to accept a `size` prop and request appropriate thumbnail
5. Backfill existing images with a one-time migration Lambda
6. Add CDK infrastructure for the new Lambda + S3 event notification

### Expected Capability
- 10-50x smaller file sizes for list/card views (150x150 WebP vs full-size JPEG)
- Sub-200ms image loads for thumbnail views
- No change to upload UX (thumbnails generated async)

## 2. The Validation (Run-Time)

### Plausibility Assessment

| Filter | Score | Justification |
|--------|-------|---------------|
| **Simplicity** | Med | Requires new Lambda, CDK changes, frontend updates — moderate complexity |
| **Explanatory Power** | High | Directly addresses the root cause: full-size images served where thumbnails suffice |
| **Consistency** | High | Fits existing S3+CloudFront+Lambda architecture perfectly |
| **Falsifiability** | High | Measurable: compare load times before/after with lighthouse or network tab |

**Plausibility Verdict:** PLAUSIBLE

## Deduction Analysis

### 1. Consistency with Verified Knowledge

| Fact | Compatible? | Analysis |
|------|-------------|----------|
| S3 bucket uses OAC (CloudFront-only access) | ✓ | Thumbnails stored in same bucket, same CloudFront access pattern |
| Signed cookies scoped to `/*` on CloudFront domain | ✓ | Any S3 key path is accessible, including `thumb-*` prefixes |
| Lambda role has `grant_read_write` on bucket | ✓ | Thumbnail Lambda can reuse existing role or get its own |
| No existing S3 event notifications on bucket | ✓ | Clean add, no conflict risk |
| CloudFront uses `CACHING_OPTIMIZED` cache policy | ✓ | Thumbnails cached at edge automatically |

**Verdict:** No contradictions

### 2. Internal Consistency

- [x] Assumptions don't contradict each other
- [x] Approach logically follows from assumptions
- [x] No circular reasoning
- [x] Scope claims are consistent

**Critical finding:** Must use S3 event prefix filter to avoid recursive triggers. If Lambda writes `thumb-150/image.webp` back to the same bucket, the PutObject event could re-trigger the Lambda. Solution: filter S3 event notification to only fire on `users/` prefix AND exclude `thumb-` prefix, OR write thumbnails to a separate prefix that's excluded from the notification.

**Verdict:** Internally consistent (with recursive trigger mitigation)

### 3. Implication Analysis

| Implication | Acceptable? | Notes |
|-------------|-------------|-------|
| S3 storage increases ~3x per image (3 thumbnail sizes) | ✓ | Thumbnails are tiny (5-50KB each). Negligible cost increase on Intelligent-Tiering |
| Upload latency unchanged (async Lambda) | ✓ | S3 event triggers are async. User doesn't wait |
| Thumbnails may take 1-5 seconds to appear after upload | ✓ | Acceptable for UX — user just uploaded, not browsing yet |
| Frontend must know which sizes exist | ✓ | Predictable key pattern makes this deterministic |
| Backfill required for existing images | ⚠ | One-time effort but adds to scope. Can be done incrementally |

**Verdict:** All implications acceptable

### 4. Assumption Audit

| Assumption | Testable? | Reasonable? | Risk if Wrong |
|------------|-----------|-------------|---------------|
| Pillow/Sharp fits in Lambda memory | Yes | High (256MB is plenty for single image resize) | Low — increase memory |
| No existing S3 event notifications | Yes | High (verified in CDK code) | Low — can coexist |
| Signed cookies work for new paths | Yes | High (wildcard path policy) | Low — just a path |
| WebP supported on target browsers | Yes | High (iOS 14+ = 2020+) | Low — fallback to JPEG |

**Verdict:** All assumptions reasonable and testable

### 5. Edge Cases

| Edge Case | How Hypothesis Handles It | Gap? |
|-----------|---------------------------|------|
| Very large images (>10MB) | Lambda has 15-min timeout, 10GB max memory | ✓ |
| Corrupt/invalid image uploaded | Lambda should catch, log, skip — don't block original upload | ⚠ Need error handling |
| Concurrent uploads of same image | Idempotent — overwrites same thumbnail key | ✓ |
| Image deleted from S3 | Thumbnails become orphaned | ⚠ Need cleanup strategy |

**Verdict:** Minor gaps in error handling and cleanup, but no blockers

### 6. Weakest Link Reassessment

- **Original:** Backfilling existing images
- **After deduction:** Still the weakest link, plus recursive trigger prevention
- **Change:** Added recursive trigger concern. Both are solvable with known patterns.

### Verdict: PASS — Promote to L1

Logically consistent. No contradictions with existing architecture. Fits naturally into the S3+CloudFront+Lambda stack. Recursive trigger risk is well-known and easily mitigated. Backfill is additional scope but not a blocker.
