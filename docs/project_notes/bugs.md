# Bug Log

Bug investigations and solutions. Detailed write-ups live in individual files; this is the quick-reference index.

## 2026-02-08 - Bug Hunt Day (PRs #65-#69)

### Fixed — 30 bugs total across 5 PRs:

**PR #65 — Modal fixes:**
- Modal vertical centering pushed content above viewport on mobile
- Hardcoded `max-h-96` scroll container fought with modal's `max-height: 90vh`
- Note edit/delete buttons invisible on touch (hover-only)

**PR #66 — Morning review:**
- Care API auth (`/api/care/log`, `/quick-log`, `/dashboard`) used `requireAuthSession()` → redirected instead of returning 401 JSON
- CSS `var()` bugs — plant card backgrounds used bare `--color-mint-100` (invalid CSS, silently failed)
- QuickCareActions modal: no backdrop close, no ARIA, buttons not thumb-reachable on mobile
- PlantCard max-width constraints prevented cards from filling grid on tablets
- Leaked Zod validation details in error responses

**PR #67 — Bug hunt round 1:**
- Flush care type missing from `validCareTypes` array (button threw error)
- Missing FK cascades on plant deletion → crashes with care history (⚠️ needs DB migration)
- CSRF token missing on admin taxonomy merge/delete (raw `fetch()` vs `apiFetch()`)
- Plant instance delete always returned false (missing `.returning()`)
- Calendar timezone bug: `new Date('2026-02-15')` = UTC midnight = Feb 14 in EST

**PR #68 — Bug hunt round 2:**
- Dashboard `careDueToday` counted all overdue, not just today → split into `careDueToday` + `overdueCount`
- Monthly fertilizer drift: "1 month" → flat 30 days caused permanent drift → uses `setMonth()` now
- Rate limiter race condition: non-atomic read-then-write → SQL atomic increment
- Image upload: no file type validation on contentType/extension
- Care guide search: ILIKE wildcard injection (`%`, `_` not escaped)
- Care history `careType`: `as any` cast bypassed validation
- Offline sync schema missing 'flush' care type
- Propagation: backward status transitions allowed (ready→started)
- Propagation: missing sourceType fields (DB columns existed, API didn't accept)

**PR #69 — Bug hunt round 3:**
- PlantImageGallery: stale keyboard handler (arrow keys broke after first nav)
- Body overflow conflict: gallery closing clobbered parent modal's scroll lock
- PropagationForm: missing Escape key handler + scroll lock (+ overflow save/restore from review feedback)
- Propagation confirm dialogs: no Escape, no ARIA, no backdrop close → extracted reusable ConfirmDialog
- Propagation card dropdown: click-outside overlay (`z-0 fixed inset-0`) blocked ALL page clicks
- Dashboard overdue count: TypeScript interface missing field, UI never showed it
- 7 components used raw `fetch()` instead of `apiFetch()` — session expiry silently failed
- useOffline: duplicate auto-sync effect with missing deps (redundant with OfflineManager)

### Still unfixed (needs discussion):
- **Middleware extra HTTP call** — self-referencing HTTP call per page navigation for email verification check. Performance impact on every route transition.


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
