# 002: Photos Not Loading in Production

**Status:** Fixed (PR #34)
**Severity:** High — all plant images broken in Docker deployment
**Date:** 2026-02-03

## Symptom

Plant images that worked in local development showed placeholder images in the Docker
production deployment. No errors visible to the user — images silently fell back to
`/placeholder-plant.png`.

## Root Cause

`NEXT_PUBLIC_CLOUDFRONT_DOMAIN` was not available at runtime inside the Docker container,
even though it was set during `next build`.

### How Next.js handles NEXT_PUBLIC_ variables

Next.js inlines `NEXT_PUBLIC_*` environment variables into the **client-side JavaScript
bundle** at build time. They become string literals in the compiled JS — not runtime
environment lookups.

However, **server-side code** (API routes, server components) accesses them via
`process.env.NEXT_PUBLIC_*` at runtime. If the env var isn't set in the runtime environment,
server-side reads return `undefined`.

### The Docker gap

The Dockerfile's multi-stage build:

```
Stage 1 (deps):     Install node_modules
Stage 2 (builder):  Run next build  ← NEXT_PUBLIC_* inlined into client JS here
Stage 3 (runner):   Copy build output, run next start  ← process.env is empty!
```

The client bundle worked fine (variables baked in). But:

- `S3ImageService.getCloudFrontDomain()` reads `process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN`
- The `/api/images/auth-cookie` route uses this to set signed cookies
- Without the domain, `s3KeyToCloudFrontUrl()` returned empty string or threw

### Why it threw silently

`s3KeyToCloudFrontUrl` threw an `Error('CloudFront domain not configured')`, but the
`S3Image` component's conditional check (`S3ImageService.isEnabled()`) happened before
the URL conversion. The flow was:

```
1. isEnabled() → true (because the check used a different env var)
2. s3KeyToCloudFrontUrl() → throws
3. Image component error → falls back to placeholder
```

No visible error in the UI. Just silent placeholder images.

## Fix

### 1. Dockerfile: Propagate build ARGs to runtime ENVs

```dockerfile
# In the runner stage:
ARG NEXT_PUBLIC_AWS_API_ENDPOINT
ARG NEXT_PUBLIC_CLOUDFRONT_DOMAIN
ENV NEXT_PUBLIC_AWS_API_ENDPOINT=$NEXT_PUBLIC_AWS_API_ENDPOINT
ENV NEXT_PUBLIC_CLOUDFRONT_DOMAIN=$NEXT_PUBLIC_CLOUDFRONT_DOMAIN
```

This ensures the variables are available via `process.env` at runtime, AND can still
be overridden by `docker-compose.yml` environment vars.

### 2. S3ImageService: Graceful degradation

Changed `s3KeyToCloudFrontUrl` from throwing to returning empty string with a descriptive
`console.error`. This makes the failure visible in logs without crashing the component.

### 3. S3Image component: URL computation before conditional

Moved URL computation above the fallback check so the empty-string case triggers the
placeholder path instead of an exception.

### 4. Documentation

Updated `.env.example` with prominent comments explaining that `CLOUDFRONT_DOMAIN` must
be set as both a `.env` var AND a GitHub repository secret for Docker builds.

## Lesson

**`NEXT_PUBLIC_*` is a build-time concept for the client, but a runtime concept for the
server.** In Docker multi-stage builds, you must explicitly carry these variables into the
runner stage. This is a well-known Next.js + Docker footgun but easy to miss.

## Verification

To verify the fix is working in production:
1. Check Docker container: `docker exec <container> env | grep NEXT_PUBLIC`
2. Check browser console for `[S3ImageService]` errors
3. Verify images load on the plant grid (not just placeholders)

## Related Files

- `Dockerfile` (ARG/ENV propagation)
- `src/lib/services/s3-image-service.ts` (URL transform + error handling)
- `src/components/shared/S3Image.tsx` (component render flow)
- `.env.example` (documentation for required vars)
- `.github/workflows/docker-build.yml` (build secrets → build args)
