export type CardOutcome = "remembered" | "forgot";

export interface IntervalUpdate {
  interval_days: number;
  next_review_at: string; // ISO date string YYYY-MM-DD
  consecutive_correct: number;
}

/**
 * Computes the new interval, next review date, and consecutive_correct for a card.
 *
 * @param isFirstForgot - When true and outcome is "forgot", applies a soft penalty:
 *   halves the interval instead of resetting to 1. Used when the user forgets an old
 *   card for the first time in a session. On subsequent forgets, pass false to apply
 *   the hard reset to interval_days = 1.
 */
export function computeIntervalUpdate(
  current: { interval_days: number; consecutive_correct: number },
  outcome: CardOutcome,
  today: Date = new Date(),
  isFirstForgot: boolean = false
): IntervalUpdate {
  if (outcome === "forgot") {
    // Soft penalty for the first forget of an old card: halve the interval.
    // Hard reset (interval_days = 1) for new cards or repeated forgets.
    const isOldCard = current.interval_days > 1;
    if (isFirstForgot && isOldCard) {
      const newInterval = Math.max(1, Math.floor(current.interval_days / 2));
      return {
        interval_days: newInterval,
        next_review_at: offsetDate(today, 1),
        consecutive_correct: 0,
      };
    }
    return {
      interval_days: 1,
      next_review_at: offsetDate(today, 1),
      consecutive_correct: 0,
    };
  }

  const newInterval = current.interval_days * 2;
  // First-graduation rule: if this is the first time graduating (consecutive_correct was 0),
  // always schedule for tomorrow (today + 1) regardless of the doubled interval
  const isFirstGraduation = current.consecutive_correct === 0;
  const daysToAdd = isFirstGraduation ? 1 : newInterval;

  return {
    interval_days: newInterval,
    next_review_at: offsetDate(today, daysToAdd),
    consecutive_correct: current.consecutive_correct + 1,
  };
}

function offsetDate(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
