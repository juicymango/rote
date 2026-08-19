export const DEFAULT_POSTPONE_DAYS = 3;
export const POSTPONE_OPTIONS = [1, 3, 7, 14] as const;
export const MAX_POSTPONE_DAYS = 365;

export function parsePostponeDays(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_POSTPONE_DAYS;
  }

  const days = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(days) || days < 1 || days > MAX_POSTPONE_DAYS) {
    return null;
  }

  return days;
}

/** Return an ISO calendar date after the given number of UTC calendar days. */
export function addPostponeDays(base: Date, days: number): string {
  const date = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate())
  );
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
