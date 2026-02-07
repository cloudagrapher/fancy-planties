# Work Log

Completed work and in-progress items. Full details in PRs/issues.

## 2026-02-06 - PR #52/#53: S3 Thumbnail Generation System (DRR-001)
- **Status**: Completed
- **Description**: End-to-end thumbnail generation - CDK Lambda infrastructure, frontend consumption with fallback chain, client-side upload preview, backfill of 174 existing images
- **URL**: https://github.com/cloudagrapher/fancy-planties/pull/53
- **Notes**: Lambda in Storage Stack (moved from API Stack to fix cyclic dependency). Backfill completed 174/174 images successfully.

## 2026-02-06 - S3Image Cookie Race Condition Fix
- **Status**: Completed
- **Description**: Fixed images permanently showing placeholders due to 403s before CloudFront cookies were set
- **URL**: https://github.com/cloudagrapher/fancy-planties/pull/52
- **Notes**: Added useEffect polling for cookie readiness

## 2026-02-06 - Dashboard/Curator-Status 500 Fix
- **Status**: Partially Fixed
- **Description**: Dashboard and curator-status API routes returning 500. Curator-status changed to return 200 with fallback data. Lucia connection pool now has limits. Root cause TBD - need production server logs.
- **URL**: https://github.com/cloudagrapher/fancy-planties/pull/52
- **Notes**: `toISOString()` change was a no-op. Real issue likely database connectivity. Check `docker logs fancy-planties-app-prod` for actual error.

## 2026-02-06 - Lucia Connection Pool Configuration
- **Status**: Completed (not yet deployed)
- **Description**: Added `max: 5, idle_timeout: 20, connect_timeout: 10` to Lucia postgres client - was previously uncapped
- **File**: `src/lib/auth/lucia.ts`
- **Notes**: Needs commit and deploy to take effect

## 2026-02-03 - PR #35: Image Aspect Ratio Fix
- **Status**: Completed
- **Description**: Fixed plant card images being extremely zoomed on mobile
- **URL**: https://github.com/cloudagrapher/fancy-planties/pull/35

## 2026-02-03 - PR #34: Photos Not Loading in Docker
- **Status**: Completed
- **Description**: Fixed NEXT_PUBLIC_* env vars not propagating to Docker runtime stage
- **URL**: https://github.com/cloudagrapher/fancy-planties/pull/34

## 2026-02-03 - PR #33: Fertilizer Due Date Bug
- **Status**: Completed
- **Description**: Fixed parseInt silently truncating schedule units
- **URL**: https://github.com/cloudagrapher/fancy-planties/pull/33
