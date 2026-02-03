# 001: Fertilizer Due Date Calculated Incorrectly

**Status:** Fixed (PRs #33, docs/codebase-context-and-bugfix branch)
**Severity:** High — every plant with a non-legacy schedule format appeared overdue
**Date:** 2026-02-03

## Symptom

Plants that were recently fertilized showed as "overdue" on the care dashboard almost
immediately. A plant with schedule "every 4 weeks" and last fertilized yesterday would
show as overdue.

## Root Cause

JavaScript's `parseInt()` extracts the leading integer from a string and ignores the rest:

```js
parseInt("4 weeks", 10)  // → 4  (not 28)
parseInt("every 2 weeks", 10)  // → NaN (starts with "e")
```

Both schedule parsers used `parseInt` as a fallback when the schedule string didn't match
the predefined map. For strings like `"4 weeks"` that weren't in the map, `parseInt`
returned `4` — treating 4 weeks as 4 days.

### Affected Functions

Two independent parsers had the same bug:

1. **`careHelpers.parseFertilizerSchedule`** in `src/lib/types/care-types.ts`
   - Used by: `CareTaskCard` display, `care-history.ts` queries, consistency score calculation
   - Had a decent schedule map but vulnerable parseInt fallback

2. **`careValidation.parseFertilizerScheduleToDays`** in `src/lib/validation/care-schemas.ts`
   - Used by: `CareCalculator` service (4 call sites in `care-calculator.ts`)
   - Had a minimal schedule map (only legacy words) and vulnerable parseInt fallback

### Why the map wasn't enough

The schedule map covered legacy single-word formats (`"weekly"`, `"monthly"`) but the
database contains strings from multiple sources:

- Form dropdowns produce: `"every 2 weeks"`, `"every 4-6 weeks"`
- CSV imports produce: `"2 weeks"`, `"3 months"`
- AI care guides produce varied formats
- Manual entry could be anything

Any format not in the map fell through to `parseInt`, which silently returned wrong values.

### Additional issue: API route

`src/app/api/plant-instances/route.ts` (POST handler) calculated the initial fertilizer
due date using `new Date()` as the base, ignoring the `lastFertilized` field. If a user
added a plant with a historical last-fertilized date, the due date was calculated from today
instead of from the last fertilized date.

## Fix

### Parser fix (both files)

1. **Case-insensitive matching** — normalize to lowercase before map lookup
2. **Expanded schedule map** — added all known database formats including range averages
3. **Regex unit parser** — `"X days/weeks/months"` parsed with proper unit conversion
4. **Safe parseInt** — only used when the entire string is numeric (`/^\d+$/`)

```typescript
// Before (dangerous):
const customDays = parseInt(schedule, 10);
if (!isNaN(customDays) && customDays > 0) return customDays;

// After (safe):
const match = normalized.match(/^(\d+)\s*(day|week|month)s?$/i);
if (match) {
  const amount = parseInt(match[1], 10);
  switch (match[2].toLowerCase()) {
    case 'day': return amount;
    case 'week': return amount * 7;
    case 'month': return amount * 30;
  }
}
if (/^\d+$/.test(normalized)) {
  const customDays = parseInt(normalized, 10);
  if (customDays > 0) return customDays;
}
```

### API route fix

Changed the base date from `new Date()` to `lastFertilized` when provided:

```typescript
const baseDate = validatedData.lastFertilized
  ? new Date(validatedData.lastFertilized)
  : new Date();
```

## Lesson

**Never use naked `parseInt` on a string that might contain units.** `parseInt("4 weeks")`
looks like it fails, but it silently succeeds with value `4`. Always validate the format
first, extract the numeric part explicitly, and convert units.

## Future Improvement

The two parsers should be consolidated into a single shared function. They exist separately
because `care-types.ts` (display/UI logic) and `care-schemas.ts` (validation logic) were
written independently. Refactoring them into `src/lib/utils/schedule-parser.ts` would
eliminate the duplication risk.
