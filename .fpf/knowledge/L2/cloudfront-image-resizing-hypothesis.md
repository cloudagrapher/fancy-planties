---
id: cloudfront-image-resizing
type: hypothesis
created: 2026-02-06
problem: Images load slowly from CDN; no server-side thumbnails
status: L2
deduction_passed: 2026-02-06
induction_passed: 2026-02-06
evidence:
  - ../../evidence/2026-02-06-lambda-edge-signed-cookies-compat.md
  - ../../evidence/2026-02-06-sharp-benchmark.md
  - ../../evidence/2026-02-06-display-size-analysis.md
evidence_summary: |
  Lambda@Edge + signed cookies confirmed compatible (viewer-level validation).
  Sharp single resize: ~80ms. Warm Lambda@Edge: ~130-280ms. Cold: ~630-2280ms.
  Cache policy change required (forward query strings). Standard practice.
deduction_notes: |
  Promoted from CONDITIONAL to L1 after external research.
  All three conditions resolved:
  1. Lambda@Edge + signed cookies coexist (CloudFront validates cookies at viewer level, before origin-request)
  2. Cache policy change from CACHING_OPTIMIZED to custom (forward w,h,f,q query strings)
  3. Cold starts 1-3s first request, then cached at edge
formality: 3
novelty: Novel
complexity: Medium
author: Claude (generated), Human (to review)
external_evidence:
  - file: ../../evidence/2026-02-06-lambda-edge-signed-cookies-compat.md
    congruence: high
    finding: Lambda@Edge origin-request coexists with trusted_key_groups. Cookie validation at viewer level precedes origin-request.
scope:
  applies_to: "All S3-stored plant images served via CloudFront"
  not_valid_for: "Legacy Base64 images still in database"
  scale: "Any scale — on-demand means no storage bloat"
---

# Hypothesis: Use CloudFront Lambda@Edge for on-demand image resizing

## 1. The Method (Design-Time)

### Proposed Approach
Add a Lambda@Edge function on the origin-request event that intercepts image requests with query parameters (e.g., `?w=150&h=150&f=webp`), resizes the image on-the-fly using Sharp, and returns the resized version. CloudFront caches the result, so subsequent requests for the same size are served from cache.

### Rationale
On-demand resizing eliminates the backfill problem entirely. CloudFront's cache means each unique size is only generated once per edge location. Signed cookie validation happens at viewer level BEFORE origin-request fires, so auth is preserved.

### Implementation Steps
1. Create Lambda@Edge function with Sharp layer for image resizing (us-east-1)
2. Create custom cache policy forwarding `w`, `h`, `f`, `q` query strings
3. Configure CloudFront behavior to use origin-request Lambda@Edge + custom cache policy
4. Add size whitelist to prevent cache busting attacks
5. Update `s3-image-service.ts` to append query params based on display context
6. Update `S3Image` component to pass desired dimensions as query params
7. Update CDK stack with Lambda@Edge deployment

### Expected Capability
- Any image size on demand — no pre-generation
- Zero storage overhead for thumbnails
- Signed cookies still work (validated before Lambda fires)
- Graceful degradation: if Lambda fails, original image served

## 2. The Validation (Run-Time)

### Plausibility Assessment (Updated after research)

| Filter | Score | Justification |
|--------|-------|---------------|
| **Simplicity** | Low | Lambda@Edge deployment complexity (us-east-1, cross-region logs) |
| **Explanatory Power** | High | Right-sized images for every context, no backfill needed |
| **Consistency** | High | Confirmed compatible with signed cookies via API docs |
| **Falsifiability** | High | Measurable: load times, cache hit ratios |

**Plausibility Verdict:** PLAUSIBLE (upgraded from CONDITIONAL)

## Deduction + Research Summary

### Conditions Resolved:
1. **Signed cookies + Lambda@Edge:** COMPATIBLE. CloudFront validates cookies at viewer level. Invalid cookies = 403 before Lambda fires. Valid cookies = origin-request Lambda runs normally on cache miss.
2. **Cache policy:** Need custom policy forwarding query strings. Standard practice. One-time cache invalidation.
3. **Cold starts:** 1-3s first request per unique image+size. Cached at edge after that.

### Remaining Risks:
- Lambda@Edge debugging is harder (logs in nearest region's CloudWatch)
- Must deploy Lambda@Edge in us-east-1 (CDK already defaults to us-east-1)
- Need size whitelist to prevent abuse (e.g., `?w=99999`)
- One-time cache invalidation during migration

## Falsification Criteria
- If cold starts consistently >5s, user experience is unacceptable
- If Sharp layer exceeds Lambda@Edge memory limits for large images
- If cache hit ratio is too low (many unique sizes = many misses)

## Estimated Effort
3-5 days (Lambda@Edge + CDK + frontend + cache policy)

## Weakest Link
Operational complexity. Lambda@Edge is harder to deploy, debug, and maintain than regular Lambda. Logs scattered across regions. Deployments are slower. But the architecture is sound.
