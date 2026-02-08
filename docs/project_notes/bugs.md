# Bug Log

Bug investigations and solutions. Detailed write-ups live in individual files; this is the quick-reference index.

## 2026-02-08 - Deleting Plant with Care History CRASHES (FK Cascades Missing)
- **Issue**: Deleting a plant instance with care history crashes — FK constraints default to `no action`, blocking the delete
- **Reported by**: Howl (bug hunt round)
- **Root Cause**: `schema.ts` had correct `onDelete` rules (cascade/restrict/set null) but the initial migration (`0000`) created all FKs with `ON DELETE no action`. The schema changes were never migrated — 10 out of 13 FKs were out of sync.
- **Solution**: Generated migration `0004_flimsy_black_crow.sql` — drops and re-creates all 10 mismatched FK constraints with correct rules (6 cascade, 2 restrict, 2 set null)
- **Migration needed**: YES — `0004_flimsy_black_crow.sql` must be applied to local and production databases
- **Affected FKs**: sessions.user_id, plant_instances.user_id, plant_instances.plant_id, plants.created_by, propagations.user_id, propagations.plant_id, propagations.parent_instance_id, care_history.user_id, care_history.plant_instance_id, care_guides.user_id

## 2026-02-06 - S3Image Cookie Race Condition
- **Issue**: Plant images showed 403 errors then permanently fell back to placeholders on first page load
- **Root Cause**: `S3Image` component tried loading images before CloudFront signed cookies were set
- **Solution**: Added `useEffect` that polls for `CloudFront-Key-Pair-Id` cookie every 100ms, resets failure states when cookies arrive
- **Prevention**: Any component depending on async credentials should wait for them before first render attempt
- **PR**: #52 (feat/thumbnail-generation)

## 2026-02-06 - Dashboard API 500 Errors
- **Issue**: `/api/dashboard` returning 500 in production
- **Root Cause**: Under investigation. Database connectivity suspected — Lucia auth creates uncapped connection pool separate from Drizzle's pooled client. Initial `toISOString()` fix was a no-op (Drizzle handles both Date and string identically)
- **Partial Fix**: Added pool limits to Lucia postgres client (`max: 5, idle_timeout: 20, connect_timeout: 10`). Need to check production server logs for actual error
- **Prevention**: Always configure connection pool limits on database clients

## 2026-02-06 - Curator-Status API 500 Errors
- **Issue**: `/api/auth/curator-status` returning 500 on every page load
- **Root Cause**: Same database connectivity issue as dashboard. Catch block was returning status 500 with valid fallback data
- **Solution**: Changed error response from 500 to 200 since `{ isCurator: false, isAuthenticated: false, isVerified: false }` is valid fallback. Added pool config to Lucia client
- **Note**: This masks the underlying error. Check production logs for root cause
- **PR**: #52

## 2026-02-03 - Plant Card Images Super Zoomed on Mobile
- **Issue**: Plant images extremely zoomed/cropped on mobile viewports
- **Root Cause**: Fixed pixel heights (`h-20`, `h-24`, `h-32`) + `object-fit: cover` on narrow containers
- **Solution**: Replaced with `aspect-ratio: 4/3` for responsive sizing
- **Details**: [003-image-aspect-ratio-bug.md](./003-image-aspect-ratio-bug.md)
- **PR**: #35

## 2026-02-03 - Photos Not Loading in Production Docker
- **Issue**: All plant images broken in Docker deployment, silent fallback to placeholder
- **Root Cause**: `NEXT_PUBLIC_CLOUDFRONT_DOMAIN` not propagated from Docker build stage to runtime stage
- **Solution**: Added `ARG`/`ENV` propagation in Dockerfile runner stage
- **Details**: [002-photos-not-loading-bug.md](./002-photos-not-loading-bug.md)
- **PR**: #34

## 2026-02-03 - Fertilizer Due Date Calculated Incorrectly
- **Issue**: Every plant with non-legacy schedule format appeared perpetually overdue
- **Root Cause**: `parseInt("4 weeks")` returns `4`, treating weeks as days
- **Solution**: Regex unit parser with proper day/week/month conversion, safe parseInt only for pure numeric strings
- **Details**: [001-fertilizer-due-date-bug.md](./001-fertilizer-due-date-bug.md)
- **PR**: #33
