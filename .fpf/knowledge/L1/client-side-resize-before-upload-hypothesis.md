---
id: client-side-resize-before-upload
type: hypothesis
created: 2026-02-06
problem: Images load slowly from CDN; no server-side thumbnails
status: L1
deduction_passed: 2026-02-06
deduction_notes: |
  Passed logical consistency check.
  Reuses existing Canvas-based image utilities in performance.ts.
  No infrastructure changes needed — works within existing S3+CloudFront+signed cookies.
  Main limitation: Canvas quality is lower than Sharp, and no solution for existing images.
  Should be considered as a complement to H1 (quick win for new uploads), not standalone.
formality: 3
novelty: Conservative
complexity: Low
author: Claude (generated), Human (to review)
scope:
  applies_to: "New image uploads going forward"
  not_valid_for: "Existing images already in S3 (need separate backfill)"
  scale: "Immediate improvement for new uploads"
---

# Hypothesis: Resize and generate thumbnails client-side before uploading to S3

## 1. The Method (Design-Time)

### Proposed Approach
The codebase already has `compressBase64Image()` and `generateThumbnail()` in `performance.ts` but they're used for display, not upload. Extend the S3ImageUpload component to generate 2-3 thumbnail sizes client-side using Canvas API before upload, then upload all sizes to S3 with predictable key patterns. This leverages existing code with zero infrastructure changes.

### Rationale
The client already has the image data in memory during upload. Generating thumbnails there costs the user a few hundred milliseconds of processing but saves every future viewer from downloading full-size images. Zero new Lambda functions, zero new infrastructure. The existing Canvas-based utilities already work.

### Implementation Steps
1. Extend `S3ImageUpload.tsx` to generate thumbnails (150x150, 400x300) using existing Canvas utilities
2. Request pre-signed URLs for each thumbnail size (modify upload API to accept multiple sizes)
3. Upload original + thumbnails in parallel to S3 with key pattern: `users/{id}/.../thumb-{size}/{file}.webp`
4. Store all S3 keys in database (extend `s3ImageKeys` schema or add `s3ThumbnailKeys`)
5. Update `S3Image` component to select appropriate size based on display context
6. Backfill: create a script or Lambda for existing images

### Expected Capability
- 10-50x smaller files for list/card views
- No new infrastructure (no Lambda, no Lambda@Edge)
- Works with existing CloudFront + signed cookies unchanged
- Upload is slightly slower (thumbnail generation) but downloads are much faster

## 2. The Validation (Run-Time)

### Plausibility Assessment

| Filter | Score | Justification |
|--------|-------|---------------|
| **Simplicity** | High | Reuses existing Canvas utilities, no infrastructure changes |
| **Explanatory Power** | Med | Solves for new uploads but doesn't address existing images without a separate backfill |
| **Consistency** | High | Works within existing architecture completely |
| **Falsifiability** | High | Upload thumbnails, measure download times |

**Plausibility Verdict:** PLAUSIBLE

## Deduction Analysis

### 1. Consistency with Verified Knowledge

| Fact | Compatible? | Analysis |
|------|-------------|----------|
| S3ImageUpload uses pre-signed POST URLs | ✓ | Need 3 pre-signed URLs instead of 1, but same mechanism |
| performance.ts has Canvas-based resize utilities | ✓ | generateThumbnail() already generates 150x150 squares at 70% quality |
| CloudFront signed cookies work for any S3 key path | ✓ | Thumbnail paths accessible with same cookies |
| Upload API proxies to Lambda for pre-signed URLs | ✓ | Lambda can generate multiple URLs per request (small API change) |
| S3 bucket allows PUT via pre-signed POST | ✓ | Same mechanism for thumbnails |

**Verdict:** No contradictions. Fully compatible with existing architecture.

### 2. Internal Consistency

- [x] Assumptions don't contradict each other
- [x] Approach logically follows from assumptions
- [x] No circular reasoning
- [x] Scope claims are consistent

**Note:** The existing `generateThumbnail()` outputs JPEG via `canvas.toDataURL('image/jpeg', 0.7)`. The hypothesis claims WebP output, but Canvas `toDataURL('image/webp')` is NOT supported on all browsers (notably Safari on iOS < 16). Need to fall back to JPEG on unsupported browsers.

**Verdict:** Internally consistent with minor browser compatibility note

### 3. Implication Analysis

| Implication | Acceptable? | Notes |
|-------------|-------------|-------|
| Upload takes longer (Canvas processing + 3 uploads) | ✓ | Canvas resize is fast (~100-200ms). 3 parallel uploads instead of 1. Acceptable. |
| 3x pre-signed URL requests per upload | ✓ | Lambda can batch these into one request. Minor API change. |
| Database schema needs thumbnail keys | ✓ | Can extend s3ImageKeys array or add separate field |
| Existing images remain slow | ⚠ | This is a "going forward" solution only. Need separate backfill. |
| Canvas quality < Sharp quality | ⚠ | For 150x150 thumbnails, difference is negligible. For 800x600, noticeable on detailed photos. |
| Mobile upload experience | ✓ | Canvas processing is fast even on mobile. Not a blocker. |

**Verdict:** Acceptable implications with noted limitation on existing images

### 4. Assumption Audit

| Assumption | Testable? | Reasonable? | Risk if Wrong |
|------------|-----------|-------------|---------------|
| Canvas resize quality is acceptable | Yes | High for small thumbnails | Low — Sharp backfill can replace later |
| Mobile can handle Canvas processing | Yes | High (150ms typical) | Low — can skip thumbnails on slow devices |
| WebP output from Canvas supported | Yes | Med (not on older iOS) | Low — fallback to JPEG |
| Pre-signed URL API can handle batch requests | Yes | High (simple Lambda change) | Low — call 3 times in parallel instead |

**Verdict:** All assumptions reasonable. WebP browser support is the weakest.

### 5. Edge Cases

| Edge Case | How Hypothesis Handles It | Gap? |
|-----------|---------------------------|------|
| Browser doesn't support WebP Canvas output | Fall back to JPEG | ✓ (needs implementation) |
| Upload fails for thumbnail but succeeds for original | Original still saved. Thumbnail missing. | ⚠ Need retry or graceful fallback |
| User uploads many images at once (6 max) | 6 originals + 18 thumbnails = 24 uploads | ⚠ Could hit pre-signed URL rate limits |
| Very large image (10MB) | Canvas can handle it | ✓ |

**Verdict:** Minor gaps in error handling for partial upload failure

### 6. Weakest Link Reassessment

- **Original:** Canvas quality and existing image backfill
- **After deduction:** Still correct. Canvas quality is acceptable for small thumbnails but not great for larger sizes. And existing images remain the elephant in the room.
- **Change:** Same weakest link, slightly better understanding of impact.

### Verdict: PASS — Promote to L1

Logically consistent. Works entirely within existing architecture. Low complexity, quick to implement. Main limitation (existing images) is a scope issue, not a logical flaw. Best positioned as a quick win alongside H1 (Lambda backfill).
