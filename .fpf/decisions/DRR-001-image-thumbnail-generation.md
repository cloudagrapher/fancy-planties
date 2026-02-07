---
id: DRR-001
title: "Implement server-side + client-side thumbnail generation for plant images"
status: ACCEPTED
date: 2026-02-06
decision_makers:
  - "Stefan Bekker — project owner"
  - "Claude — analyst/advisor"
supersedes: none
hypothesis_selected: "s3-thumbnail-generation + client-side-resize-before-upload"
alternatives_rejected: ["cloudfront-image-resizing", "nextjs-optimization-bypass-fix"]
---

# DRR-001: Implement Server-Side + Client-Side Thumbnail Generation

## Executive Summary

**Decision:** Implement a dual-layer thumbnail system: client-side Canvas thumbnails for instant feedback during upload (H4), backed by server-side S3-event-triggered Lambda with Sharp for guaranteed quality thumbnails (H1). Existing images backfilled via one-time Lambda invocation.

**Based on:** H1 (R_eff = 1.00) + H4 (R_eff = 0.70) combined approach

**Key evidence:** Sharp generates 4 thumbnails in <100ms. Plant list view currently wastes 1000x bandwidth (100MB served where 100KB suffices).

## Context

### Problem Statement
Images load slowly from the CDN. No server-side thumbnails are generated — full-size originals (3-8MB) served everywhere, including 48x48px list view thumbnails. CloudFront URLs bypass Next.js Image optimization (`unoptimized` flag) due to signed cookie requirements.

### Trigger
User-reported slow image loading. Investigation confirmed zero server-side image processing exists.

### Constraints
- Solo developer, personal project
- Existing AWS infrastructure (S3 + CloudFront + Lambda via CDK)
- Must preserve browser-direct-to-CloudFront architecture (signed cookies)
- Low operational burden preferred

### Success Criteria
- List view page load: <500KB total images (currently ~100MB for 20 plants)
- Thumbnail generation: <2 seconds after upload
- No visible quality degradation on plant cards
- Zero impact on existing upload UX

## Decision

**We will:**
1. Add a Lambda function triggered by S3 PutObject events that generates 4 thumbnail sizes using Sharp
2. Extend the S3ImageUpload component to generate Canvas thumbnails client-side during upload for instant preview
3. Store thumbnails in S3 with predictable key patterns (`thumb-{size}/` prefix)
4. Update S3Image component to request appropriate thumbnail size based on display context
5. Backfill existing images with a one-time Lambda invocation

**We will NOT:**
- Use Lambda@Edge for on-demand resizing (too complex for solo dev)
- Re-enable Next.js Image optimization for CloudFront URLs (breaks signed cookie architecture)
- Change the CloudFront cache policy
- Modify the existing upload Lambda

**Based on hypotheses:**
- `.fpf/knowledge/L2/s3-thumbnail-generation-hypothesis.md` (H1, primary)
- `.fpf/knowledge/L1/client-side-resize-before-upload-hypothesis.md` (H4, complement)

## Alternatives Considered

### Lambda@Edge On-Demand Resizing (H2)

- **Status:** L2 (verified)
- **Summary:** Resize images on CloudFront cache miss using Lambda@Edge origin-request
- **WLNK R_eff:** 0.85
- **Why rejected:** Operationally complex for solo developer. Cross-region CloudWatch logs, slower deployments, harder debugging. Cold starts of 0.6-2.3s on first request. Not worth the complexity for a personal project when H1 delivers pre-generated instant thumbnails.

### Re-enable Next.js Image Optimization (H3)

- **Status:** Invalid
- **Summary:** Remove `unoptimized` flag and proxy CloudFront images through Next.js server
- **WLNK R_eff:** N/A (invalidated)
- **Why rejected:** Fundamental architectural contradiction. Next.js server doesn't have CloudFront signed cookies. Would make the Docker container a bottleneck for ALL image requests, defeating the CDN.

## Evidence Summary

### Supporting Evidence

| Claim | Evidence | Type | Congruence | R_eff |
|-------|----------|------|------------|-------|
| Sharp fits in Lambda (<100ms, <200MB) | evidence/2026-02-06-sharp-benchmark.md | internal | — | 1.00 |
| 4 optimal thumbnail tiers identified | evidence/2026-02-06-display-size-analysis.md | internal | — | 1.00 |
| Root cause: zero server-side processing | evidence/2026-02-06-no-server-processing-confirmed.md | internal | — | 1.00 |
| Lambda@Edge + cookies compatible (for H2) | evidence/2026-02-06-lambda-edge-signed-cookies-compat.md | external | high | 1.00 |

### WLNK Calculation

```
H1 R_eff = min(1.00, 1.00, 1.00) = 1.00
H4 R_eff = min(0.70, 1.00) = 0.70
Combined R_eff = min(1.00, 0.70) = 0.70

Weakest link: H4 Canvas quality (not directly benchmarked against Sharp)
Mitigation: Lambda overwrites client thumbnails with Sharp quality
```

### Evidence Gaps

- Backfill Lambda not tested (estimated from Sharp benchmark)
- Canvas thumbnail quality not compared head-to-head with Sharp
- Recursive trigger prevention not tested (standard pattern)

## Thumbnail Specification

### Sizes (from codebase analysis)

| Tier | Dimensions | Format | Quality | Primary Use Cases |
|------|-----------|--------|---------|-------------------|
| Tiny | 64x64 | WebP | 80% | List view, timeline, gallery strip, propagation cards |
| Small | 200x150 | WebP | 80% | Plant cards (all sizes), form previews |
| Medium | 300x300 | WebP | 80% | Gallery grids, detail modal |
| Large | 400x300 | WebP | 80% | Care guide cards, large detail views |

### S3 Key Pattern

```
Original:  users/{userId}/{entityType}/{entityId}/{uuid}.jpg
Tiny:      users/{userId}/{entityType}/{entityId}/thumb-64/{uuid}.webp
Small:     users/{userId}/{entityType}/{entityId}/thumb-200/{uuid}.webp
Medium:    users/{userId}/{entityType}/{entityId}/thumb-300/{uuid}.webp
Large:     users/{userId}/{entityType}/{entityId}/thumb-400/{uuid}.webp
```

### Bandwidth Impact (estimated)

| Page | Current | With Thumbnails | Reduction |
|------|---------|-----------------|-----------|
| Plant list (20 plants) | ~100 MB | ~60-100 KB | 99.9% |
| Plant grid (12 cards) | ~60 MB | ~96-240 KB | 99.6% |
| Plant detail | ~35 MB | ~200 KB + 5 MB (gallery) | 85% |

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| Recursive Lambda trigger | Low | Med (cost spike) | S3 event prefix filter excluding `thumb-*` | Stefan |
| Thumbnail race condition (not ready after upload) | Med | Low (bad UX briefly) | Frontend falls back to original if thumb 404s | Stefan |
| Orphaned thumbnails on image delete | Med | Low (wasted storage) | Add cleanup when delete endpoint is built | Stefan |
| Canvas quality artifacts (H4) | Low | Low | Lambda overwrites with Sharp quality | Stefan |
| Backfill Lambda hits S3 rate limits | Low | Low | Throttle with SQS or batch with delays | Stefan |

## Validity Conditions

This decision remains valid **WHILE:**
- App runs on self-hosted Docker (not Vercel/managed Next.js)
- CloudFront signed cookies remain the auth model
- Image count stays under ~10,000
- Solo developer workflow

**Re-evaluate IF:**
- Moving to Vercel (Next.js Image optimization becomes viable)
- Changing auth model away from signed cookies
- Adding video support (different processing pipeline needed)
- User count/image count grows significantly (consider H2 Lambda@Edge)
- New UI components need sizes outside the 4 tiers

## Implementation Notes

### Phase 1: Client-Side Quick Win (H4) — 1 day
1. Extend `S3ImageUpload.tsx` to generate Canvas thumbnails during upload
2. Upload thumbnails alongside originals to S3
3. Update pre-signed URL Lambda to support multiple size requests
4. Update `S3Image` component to accept `size` prop

### Phase 2: Server-Side Lambda (H1) — 2 days
1. Create thumbnail generation Lambda (Node.js + Sharp or Python + Pillow)
2. Add S3 event notification for PutObject (exclude `thumb-*` prefix)
3. Add CDK infrastructure (Lambda + S3 event + IAM)
4. Lambda generates all 4 sizes in WebP, writes to `thumb-{size}/` prefix

### Phase 3: Backfill + Cleanup — 1 day
1. Run backfill Lambda on all existing S3 images
2. Update all frontend components to use appropriate thumbnail sizes
3. Verify with network tab / Lighthouse

### Total Estimated Effort: 3-4 days

## Consequences

### Expected Positive Outcomes
- 85-99.9% bandwidth reduction across all pages
- Sub-200ms image loads for list/card views
- Improved LCP (Largest Contentful Paint) scores
- Better mobile experience (less data usage)

### Accepted Trade-offs
- S3 storage increases ~2% per image (negligible cost)
- Upload flow slightly more complex (client generates thumbnails)
- New Lambda to maintain (but low operational burden)
- Thumbnails delayed 1-5s after upload (Lambda async processing)

### Potential Negative Outcomes (Accepted Risks)
- Recursive trigger possible if prefix filter misconfigured — accepted because it's a well-known pattern
- Orphaned thumbnails accumulate — accepted because no delete endpoint exists yet

## Audit Trail

### Reasoning Cycle
- **Problem defined:** 2026-02-06
- **Hypotheses generated:** 4 on 2026-02-06
- **Deduction completed:** 2026-02-06 — 3 passed, 1 failed (H3 invalidated)
- **External research:** 2026-02-06 — H2 conditions resolved (Lambda@Edge + cookies compat)
- **Internal testing:** 2026-02-06 — Sharp benchmark, display size analysis, root cause confirmed
- **Audit completed:** 2026-02-06 — 0 blockers, 3 warnings, R_eff = 1.00 (H1)
- **Decision finalized:** 2026-02-06

### Key Decisions During Cycle
- H3 invalidated: `unoptimized` flag is architecturally correct, not a bug
- H2 promoted after research: Lambda@Edge + signed cookies are compatible
- H1 selected over H2: operational simplicity wins for solo dev project
- H4 added as complement: instant client-side feedback during upload

## References

- **Session archive:** `.fpf/sessions/2026-02-06-image-thumbnails.md`
- **Winning hypotheses:** `.fpf/knowledge/L2/s3-thumbnail-generation-hypothesis.md`, `.fpf/knowledge/L1/client-side-resize-before-upload-hypothesis.md`
- **Evidence files:**
  - `.fpf/evidence/2026-02-06-sharp-benchmark.md`
  - `.fpf/evidence/2026-02-06-display-size-analysis.md`
  - `.fpf/evidence/2026-02-06-no-server-processing-confirmed.md`
  - `.fpf/evidence/2026-02-06-lambda-edge-signed-cookies-compat.md`
- **Invalidated:** `.fpf/knowledge/invalid/nextjs-optimization-bypass-fix-hypothesis.md`
- **Related DRRs:** None (first DRR)
