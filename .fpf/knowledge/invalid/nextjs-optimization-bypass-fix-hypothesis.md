---
id: nextjs-optimization-bypass-fix
type: hypothesis
created: 2026-02-06
problem: Images load slowly from CDN; no server-side thumbnails
status: invalid
invalidated: 2026-02-06
invalidation_reason: |
  Failed deduction: Fundamental architectural contradiction.
  The unoptimized flag exists because Next.js Image optimization proxies requests
  through the Next.js server (/_next/image?url=...). The browser sends the request
  to the Next.js server, which fetches the original, resizes it, and returns it.

  Problem: The Next.js server does NOT have CloudFront signed cookies. Those cookies
  are set in the browser via HttpOnly cookies scoped to the CloudFront domain.
  The server would need its own auth mechanism to fetch from CloudFront/S3.

  While technically possible (use IAM credentials or pre-signed URLs server-side),
  this fundamentally changes the architecture from "browser-direct CDN" to
  "server-proxied images" — making the Next.js server a bottleneck for ALL
  image requests. This defeats the purpose of having CloudFront in the first place.

  Additionally, the app runs as standalone Docker (output: 'standalone'), meaning
  the Next.js server has limited resources. Proxying all image requests through it
  would increase memory usage (Sharp processing) and response times.

  Learning: The unoptimized flag is architecturally correct given the signed cookie
  model. The solution must work WITH the browser-direct-to-CloudFront pattern, not
  against it.
formality: 3
novelty: Conservative
complexity: Low
author: Claude (generated), Human (to review)
scope:
  applies_to: "N/A — invalidated"
  not_valid_for: "N/A"
  scale: "N/A"
---

# Hypothesis: Re-enable Next.js Image optimization for CloudFront URLs (INVALID)

## Deduction Analysis

### 1. Consistency with Verified Knowledge

| Fact | Compatible? | Analysis |
|------|-------------|----------|
| CloudFront requires signed cookies (trusted_key_groups) | ✗ | Next.js server doesn't have these cookies. It would need IAM or pre-signed URLs instead. |
| App runs as standalone Docker | ✗ | Server-side image processing would consume container resources meant for serving the app |
| `shouldUnoptimizeImage()` returns true for ALL CloudFront URLs | ✗ | This was an intentional design decision, not a bug. Removing it breaks the auth model. |
| Browser sends cookies directly to CloudFront domain | ✗ | Proxying through Next.js means cookies go to the app domain, not CloudFront |

**Verdict:** Contradicts core architecture. The unoptimized flag is correct.

### 2. Internal Consistency

The hypothesis assumes the `unoptimized` flag is a mistake or workaround. Code review reveals it's an intentional architectural decision documented in comments:
- `image-loader.ts` line 2: "CloudFront images need direct browser access to send signed cookies"
- `S3Image.tsx` line 18-20: "Uses Next.js Image with direct CloudFront access via custom domain"

**Verdict:** Internal contradiction — hypothesis assumes a bug where there is intentional design.

### 3. Critical Flaw: Server as Bottleneck

If Next.js proxies all image requests:
- Every image load goes: Browser → Next.js Server → S3/CloudFront → resize → Browser
- Instead of: Browser → CloudFront (edge cache) → Browser
- This adds network hop, processing time, and server load
- CloudFront edge caching becomes useless for the resize path
- The standalone Docker container becomes the chokepoint

### Verdict: FAIL — Moved to invalid/

Fundamental architectural contradiction. The solution must preserve browser-direct-to-CloudFront access, not proxy through the application server.

**Learning:** The `unoptimized` flag is not the problem — it's the correct response to the signed cookie architecture. The real problem is that full-size images are served where thumbnails would suffice. Thumbnails should be pre-generated and served directly via CloudFront, not proxied through Next.js.
