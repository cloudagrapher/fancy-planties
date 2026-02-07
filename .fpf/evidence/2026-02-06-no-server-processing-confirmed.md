---
id: no-server-processing-confirmed
type: internal-test
source: internal
created: 2026-02-06
hypothesis: .fpf/knowledge/L1/s3-thumbnail-generation-hypothesis.md
assumption_tested: "No server-side image processing exists (confirming the root cause)"
valid_until: 2026-08-06
decay_action: refresh
scope:
  applies_to: "Current codebase state"
  not_valid_for: "After thumbnail implementation"
  environment: "Codebase + dependency analysis"
---

# Test: Confirm No Server-Side Image Processing

## Purpose
Empirically verify that the app has zero server-side image processing, confirming the root cause of slow image loading.

## Method
1. Checked package.json for image processing dependencies
2. Checked Sharp availability (bundled with Next.js but unused for our images)
3. Verified `unoptimized` flag on all CloudFront images
4. Checked S3 upload flow for any processing step

## Raw Results

### Dependencies
```
Image-related packages in package.json: NONE
Sharp: AVAILABLE (bundled with Next.js) but NOT USED for CloudFront images
```

### Code Verification
- `shouldUnoptimizeImage()` returns `true` for ALL CloudFront URLs
- S3ImageUpload uploads files directly to S3 via pre-signed POST (no processing)
- Upload Lambda (`presigned_upload.py`) only generates URLs, never touches image data
- No S3 event notifications on the bucket (no post-upload processing)
- Client-side Canvas utilities exist in `performance.ts` but are used for display only

### Upload Flow (Verified)
```
Browser selects file → S3ImageUpload component
  → Calls /api/images/upload (Next.js proxy)
  → Lambda generates pre-signed POST URL
  → Browser uploads RAW FILE directly to S3
  → S3 key stored in database
  → No processing whatsoever
```

### Display Flow (Verified)
```
S3Image component
  → Converts S3 key to CloudFront URL
  → Sets unoptimized=true (bypasses Next.js optimization)
  → Browser fetches FULL-SIZE original from CloudFront
  → Browser renders at whatever size CSS dictates
```

## Verdict

- [x] Root cause **CONFIRMED** — Full-size originals (3-8MB) served for ALL display contexts including 48x48px list thumbnails. Zero server-side processing exists. The `unoptimized` flag deliberately bypasses Next.js Image optimization for CloudFront URLs.
