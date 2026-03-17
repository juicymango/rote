import { computeIntervalUpdate } from "../spacedRepetition";

const TODAY = new Date("2026-03-15");

describe("computeIntervalUpdate", () => {
  it("doubles interval and increments streak on remembered", () => {
    const result = computeIntervalUpdate(
      { interval_days: 1, consecutive_correct: 0 },
      "remembered",
      TODAY
    );
    expect(result.interval_days).toBe(2);
    expect(result.consecutive_correct).toBe(1);
    // First graduation: should be tomorrow (today+1), not today+2
    expect(result.next_review_at).toBe("2026-03-16");
  });

  it("doubles interval again from 2 to 4", () => {
    const result = computeIntervalUpdate(
      { interval_days: 2, consecutive_correct: 1 },
      "remembered",
      TODAY
    );
    expect(result.interval_days).toBe(4);
    expect(result.consecutive_correct).toBe(2);
    expect(result.next_review_at).toBe("2026-03-19");
  });

  it("resets interval to 1 and clears streak on forgot", () => {
    const result = computeIntervalUpdate(
      { interval_days: 8, consecutive_correct: 3 },
      "forgot",
      TODAY
    );
    expect(result.interval_days).toBe(1);
    expect(result.consecutive_correct).toBe(0);
    expect(result.next_review_at).toBe("2026-03-16");
  });

  it("forgot always sets next_review_at to tomorrow regardless of current interval", () => {
    const result = computeIntervalUpdate(
      { interval_days: 64, consecutive_correct: 6 },
      "forgot",
      TODAY
    );
    expect(result.next_review_at).toBe("2026-03-16");
  });

  it("uses today as default date", () => {
    const result = computeIntervalUpdate(
      { interval_days: 1, consecutive_correct: 0 },
      "remembered"
    );
    // Just verify it returns a valid ISO date
    expect(result.next_review_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  describe("first-graduation rule", () => {
    it("schedules tomorrow (today+1) when consecutive_correct=0 before graduation", () => {
      const result = computeIntervalUpdate(
        { interval_days: 1, consecutive_correct: 0 },
        "remembered",
        TODAY
      );
      expect(result.interval_days).toBe(2);
      expect(result.consecutive_correct).toBe(1);
      // Should be tomorrow, not day after tomorrow
      expect(result.next_review_at).toBe("2026-03-16");
    });

    it("applies normal doubling after first graduation (consecutive_correct > 0)", () => {
      const result = computeIntervalUpdate(
        { interval_days: 2, consecutive_correct: 1 },
        "remembered",
        TODAY
      );
      expect(result.interval_days).toBe(4);
      expect(result.consecutive_correct).toBe(2);
      // Should be today + 4 days
      expect(result.next_review_at).toBe("2026-03-19");
    });

    it("applies normal doubling for all subsequent graduations", () => {
      const result = computeIntervalUpdate(
        { interval_days: 8, consecutive_correct: 3 },
        "remembered",
        TODAY
      );
      expect(result.interval_days).toBe(16);
      expect(result.consecutive_correct).toBe(4);
      // Should be today + 16 days
      expect(result.next_review_at).toBe("2026-03-31");
    });
  });
});
