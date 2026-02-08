# Bug Log

Bug investigations and solutions. Detailed write-ups live in individual files; this is the quick-reference index.

## 2026-02-08 - Bug Hunt Round 1 (PR #67)

### Fixed:
- **Flush care type validation missing** (`care-history.ts`) — `validCareTypes` array omitted `'flush'`, so Flush button threw an error
- **Missing FK cascades — plant deletion crashes** (`schema.ts`) — Deleting any plant with care history threw unhandled FK constraint error. Added cascades on all FK relationships. ⚠️ Requires DB migration after merge.
- **CSRF token missing on admin taxonomy mutations** (`TaxonomyManagementClient.tsx`) — Used raw `fetch()` instead of `apiFetch()`, failing with 403
- **Plant instance delete always returns false** (`plant-instances.ts`) — `db.delete().where()` without `.returning()` has no meaningful `.length`
- **Calendar timezone bug** (`FertilizerCalendar.tsx`) — `new Date('2026-02-15')` parses as UTC midnight = Feb 14 in EST. Events on wrong day west of UTC.

### Known but unfixed:
- Dashboard `careDueToday` count misleadingly includes all overdue plants, not just today
- Middleware makes extra HTTP call per page load for email verification check
- Monthly fertilizer calculation permanently drifts (Jan 31 → Feb 28 → Mar 28, never back to 31)

## 2026-02-08 - Morning Review (PR #66)

- **Care API auth pattern** — `/api/care/log`, `/api/care/quick-log`, `/api/care/dashboard` used `requireAuthSession()` which redirects on failure. API clients got unexpected redirects instead of 401 JSON.
- **CSS `var()` bugs** — Plant card backgrounds used bare `--color-mint-100` instead of `var(--color-mint-100)` — silently failed.
- **QuickCareActions modal** — Missing backdrop click-to-close, no ARIA attributes, buttons not thumb-reachable on mobile.
- **PlantCard max-width constraints** — Artificial caps prevented cards from filling grid cells on tablets.
- **Leaked Zod validation details** in error responses.

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
