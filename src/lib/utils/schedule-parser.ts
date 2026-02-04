/**
 * Shared fertilizer schedule parser.
 *
 * Converts human-readable schedule strings (e.g. "every 2 weeks",
 * "monthly", "14") into the equivalent number of days between
 * applications.
 *
 * This is the single source of truth — imported by both `care-types.ts`
 * and `care-schemas.ts` so the mapping stays in sync.
 */

const SCHEDULE_MAP: Record<string, number> = {
  // Legacy single-word formats
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  bimonthly: 60,
  quarterly: 90,
  // Descriptive formats
  '1 week': 7,
  '2 weeks': 14,
  '1 month': 30,
  '2 months': 60,
  '3 months': 90,
  // Database / form formats
  'every 2 weeks': 14,
  'every 2-3 weeks': 18,
  'every 2-4 weeks': 21,
  'every 3-4 weeks': 24,
  'every 4 weeks': 28,
  'every 4-6 weeks': 35,
  'every 6-8 weeks': 49,
  'every 17 weeks': 119,
};

/** Default fallback when a schedule string can't be parsed. */
const DEFAULT_DAYS = 30;

/**
 * Parse a fertilizer schedule string into a number of days.
 *
 * Supports:
 * - Predefined keywords ("weekly", "bimonthly", "every 4-6 weeks", …)
 * - "<N> <unit>" patterns ("3 weeks", "7 days", "2 months")
 * - Plain numeric strings ("14" → 14 days)
 *
 * Returns `DEFAULT_DAYS` (30) when the input is empty or unrecognisable.
 */
export function parseFertilizerScheduleToDays(schedule: string): number {
  if (!schedule) return DEFAULT_DAYS;

  const normalized = schedule.toLowerCase().trim();

  // 1. Known schedule keyword
  if (SCHEDULE_MAP[normalized] !== undefined) {
    return SCHEDULE_MAP[normalized];
  }

  // 2. "<N> day(s)/week(s)/month(s)" pattern
  const match = normalized.match(/^(\d+)\s*(day|week|month)s?$/i);
  if (match) {
    const amount = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    switch (unit) {
      case 'day':
        return amount;
      case 'week':
        return amount * 7;
      case 'month':
        return amount * 30;
    }
  }

  // 3. Plain number of days
  if (/^\d+$/.test(normalized)) {
    const days = parseInt(normalized, 10);
    if (days > 0) return days;
  }

  return DEFAULT_DAYS;
}
