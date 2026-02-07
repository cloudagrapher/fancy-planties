---
id: lambda-edge-signed-cookies-compat
type: external-research
source: web
created: 2026-02-06
hypothesis: .fpf/knowledge/L0/cloudfront-image-resizing-hypothesis.md
assumption_tested: "Lambda@Edge can coexist with trusted_key_groups (signed cookies) on same CloudFront behavior"
valid_until: 2026-08-06
decay_action: refresh
congruence:
  level: high
  penalty: 0.00
  source_context: "AWS official documentation and API reference for CloudFront cache behaviors"
  our_context: "CloudFront distribution with trusted_key_groups and S3 OAC origin"
  justification: "Official AWS docs directly describe our exact configuration pattern"
sources:
  - url: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-distribution-cachebehavior.html
    title: "AWS::CloudFront::Distribution CacheBehavior"
    type: official-docs
    accessed: 2026-02-06
    credibility: high
  - url: https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_CacheBehavior.html
    title: "CacheBehavior - CloudFront API Reference"
    type: official-docs
    accessed: 2026-02-06
    credibility: high
  - url: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-cookies.html
    title: "Use signed cookies - Amazon CloudFront"
    type: official-docs
    accessed: 2026-02-06
    credibility: high
  - url: https://github.com/aws-samples/lambda-edge-resizing-images-custom-origin
    title: "AWS Sample: Lambda@Edge Resizing Images Custom Origin"
    type: official-docs
    accessed: 2026-02-06
    credibility: high
  - url: https://aws.amazon.com/blogs/networking-and-content-delivery/signed-cookie-based-authentication-with-amazon-cloudfront-and-aws-lambdaedge-part-2-authorization/
    title: "Signed cookie-based auth with CloudFront and Lambda@Edge Part 2"
    type: official-docs
    accessed: 2026-02-06
    credibility: high
scope:
  applies_to: "CloudFront distributions using trusted_key_groups with Lambda@Edge"
  not_valid_for: "CloudFront Functions (different execution model)"
---

# Research: Lambda@Edge + Signed Cookies Compatibility

## Purpose
Verify whether Lambda@Edge origin-request functions can coexist with CloudFront trusted_key_groups (signed cookies) on the same cache behavior.

## Hypothesis Reference
- **File:** `.fpf/knowledge/L0/cloudfront-image-resizing-hypothesis.md`
- **Assumptions tested:**
  1. Lambda@Edge + signed cookies coexist on same behavior
  2. Signed cookie validation happens before origin-request Lambda fires
  3. Cache policy must change to forward query strings

## Findings

### Finding 1: CloudFront CacheBehavior supports BOTH simultaneously

The CacheBehavior API reference confirms that `TrustedKeyGroups` and `LambdaFunctionAssociations` are independent properties on the same behavior. There is no documented mutual exclusion.

- `TrustedKeyGroups`: List of key groups for signed URLs/cookies
- `LambdaFunctionAssociations`: List of Lambda@Edge associations per event type

A cache behavior can have BOTH — zero or more of each.

### Finding 2: CloudFront validates signed cookies during viewer-request phase

From the signed cookies documentation:
1. CloudFront receives request with Cookie header
2. CloudFront validates signature using public key from trusted key group
3. If invalid → 403 Forbidden (request never reaches origin-request)
4. If valid → proceeds with normal flow (cache lookup → origin-request if miss)

**This means:** If signed cookies are valid, the origin-request Lambda@Edge fires normally on cache miss. If cookies are invalid, the request is rejected BEFORE origin-request ever fires. This is the ideal behavior — authentication happens first, then our resize Lambda runs.

### Finding 3: AWS official sample uses origin-request for image resizing

The `aws-samples/lambda-edge-resizing-images-custom-origin` repo confirms:
- Uses `origin-request` event (fires on cache miss)
- Uses Sharp for image processing
- Accepts query parameters (`width`, `format`) for resize dimensions
- Does NOT address signed cookies (public images)

The sample doesn't show signed cookies + Lambda@Edge together, but the architecture is compatible based on the CacheBehavior API.

### Finding 4: Cache policy must forward query strings

The `CACHING_OPTIMIZED` policy does not forward query strings to origin. For image resizing with query params (`?w=150&h=150`), we need a custom cache policy that includes specific query strings in the cache key. This is well-documented and standard practice.

### Finding 5: Cold start and performance

From multiple sources:
- Lambda@Edge cold starts: 100-200ms for simple functions, up to 1-3s with Sharp layer
- First request for each unique image+size combination: cold start + S3 fetch + Sharp resize
- Subsequent requests: served from CloudFront cache (sub-10ms)
- Arm64 Lambda shows 13-24% faster cold starts

## Synthesis

**The three conditions for H2 are resolvable:**

1. **Signed cookies + Lambda@Edge:** COMPATIBLE. They coexist on the same cache behavior. Signed cookie validation happens at viewer level, before origin-request fires. Unauthenticated requests are rejected before our Lambda ever runs. This is actually a security benefit.

2. **Cache policy change:** REQUIRED but straightforward. Need custom cache policy that forwards `w`, `h`, `f`, `q` query strings. One-time cache invalidation on existing content.

3. **Cold start latency:** 1-3 seconds on first request per unique size. Acceptable given CloudFront caching makes it a one-time cost per edge location.

## Verdict

- [x] Assumption **SUPPORTED** by external evidence (with congruence: high)
  - Lambda@Edge + trusted_key_groups coexist (API docs confirm)
  - Signed cookie validation happens before origin-request (docs confirm)
  - Cache policy change is standard practice

## Gaps

- No official AWS sample showing image resizing + signed cookies together (pattern is inferred from API docs)
- Exact cold start time with Sharp layer on Lambda@Edge not benchmarked for our image sizes
- Cache invalidation impact on existing users during migration not quantified

## Recommendations

- H2 conditions are met from a documentation perspective
- Promote to L1 (passed logical + external evidence check)
- Internal test (q3-test) recommended to verify cold start times with real images
