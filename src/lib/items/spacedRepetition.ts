export type CardOutcome = "remembered" | "forgot";

export interface IntervalUpdate {
  interval_days: number;
  next_review_at: string; // ISO date string YYYY-MM-DD
  consecutive_correct: number;
}

export function computeIntervalUpdate(
  current: { interval_days: number; consecutive_correct: number },
  outcome: CardOutcome,
  today: Date = new Date()
): IntervalUpdate {
  if (outcome === "forgot") {
    return {
      interval_days: 1,
      next_review_at: offsetDate(today, 1),
      consecutive_correct: 0,
    };
  }

  const newInterval = current.interval_days * 2;
  return {
    interval_days: newInterval,
    next_review_at: offsetDate(today, newInterval),
    consecutive_correct: current.consecutive_correct + 1,
  };
}

function offsetDate(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
