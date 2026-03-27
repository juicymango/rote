import { buildSessionPool, Item } from "../sessionPool";

const TODAY = new Date("2026-03-15");
const TODAY_STR = "2026-03-15";

function makeItem(overrides: Partial<Item> & { id: string }): Item {
  return {
    key: "key",
    value: "value",
    next_review_at: TODAY_STR,
    interval_days: 1,
    consecutive_correct: 0,
    created_at: "2026-03-01T00:00:00Z",
    ...overrides,
  };
}

describe("buildSessionPool", () => {
  it("returns empty array when no items", () => {
    expect(buildSessionPool([], TODAY)).toHaveLength(0);
  });

  it("includes new cards (consecutive_correct=0)", () => {
    const items = [makeItem({ id: "1" }), makeItem({ id: "2" })];
    const pool = buildSessionPool(items, TODAY);
    expect(pool).toHaveLength(2);
  });

  it("includes old cards (consecutive_correct > 0, next_review_at <= today)", () => {
    const old = makeItem({
      id: "old-1",
      consecutive_correct: 1,
      next_review_at: "2026-03-10",
    });
    const pool = buildSessionPool([old], TODAY);
    expect(pool).toHaveLength(1);
    expect(pool[0].id).toBe("old-1");
  });

  it("includes old cards with future next_review_at (upcoming)", () => {
    const upcoming = makeItem({
      id: "upcoming-1",
      consecutive_correct: 1,
      next_review_at: "2026-03-20",
    });
    const pool = buildSessionPool([upcoming], TODAY);
    expect(pool).toHaveLength(1);
    expect(pool[0].id).toBe("upcoming-1");
  });

  it("old cards sorted by next_review_at ASC (due cards before upcoming)", () => {
    const items = [
      makeItem({ id: "upcoming", consecutive_correct: 1, next_review_at: "2026-03-20" }),
      makeItem({ id: "due", consecutive_correct: 1, next_review_at: "2026-03-10" }),
    ];
    // Use maxOld=1 to pick only the soonest one
    const pool = buildSessionPool(items, TODAY, 1, 0);
    expect(pool).toHaveLength(1);
    expect(pool[0].id).toBe("due");
  });

  it("caps old cards at 10", () => {
    const oldItems = Array.from({ length: 15 }, (_, i) =>
      makeItem({
        id: `old-${i}`,
        consecutive_correct: 1,
        next_review_at: `2026-03-0${(i % 9) + 1}`,
      })
    );
    const pool = buildSessionPool(oldItems, TODAY);
    expect(pool.length).toBeLessThanOrEqual(10);
  });

  it("caps new cards at 10", () => {
    const newItems = Array.from({ length: 15 }, (_, i) =>
      makeItem({ id: `new-${i}` })
    );
    const pool = buildSessionPool(newItems, TODAY);
    expect(pool.length).toBeLessThanOrEqual(10);
  });

  it("combines up to 10 old and 10 new (max 20 total)", () => {
    const oldItems = Array.from({ length: 10 }, (_, i) =>
      makeItem({
        id: `old-${i}`,
        consecutive_correct: 1,
        next_review_at: "2026-03-10",
      })
    );
    const newItems = Array.from({ length: 10 }, (_, i) =>
      makeItem({ id: `new-${i}` })
    );
    const pool = buildSessionPool([...oldItems, ...newItems], TODAY);
    expect(pool).toHaveLength(20);
  });

  it("does not duplicate items", () => {
    const items = Array.from({ length: 20 }, (_, i) =>
      makeItem({ id: `item-${i}` })
    );
    const pool = buildSessionPool(items, TODAY);
    const ids = pool.map((i) => i.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("includes mix of due and upcoming old cards", () => {
    const due = makeItem({ id: "due", consecutive_correct: 2, next_review_at: "2026-03-10" });
    const upcoming = makeItem({ id: "upcoming", consecutive_correct: 1, next_review_at: "2026-03-25" });
    const pool = buildSessionPool([due, upcoming], TODAY);
    expect(pool).toHaveLength(2);
    const ids = pool.map((i) => i.id);
    expect(ids).toContain("due");
    expect(ids).toContain("upcoming");
  });

  describe("dynamic pool size (maxOld / maxNew)", () => {
    it("respects custom maxOld", () => {
      const oldCards = Array.from({ length: 10 }, (_, i) =>
        makeItem({
          id: `old-${i}`,
          consecutive_correct: 1,
          next_review_at: "2026-03-14",
        })
      );
      const pool = buildSessionPool(oldCards, TODAY, 5, 10);
      expect(pool.length).toBe(5);
      const ids = pool.map((c) => c.id);
      expect(ids.every((id) => id.startsWith("old-"))).toBe(true);
    });

    it("respects custom maxNew", () => {
      const newCards = Array.from({ length: 10 }, (_, i) =>
        makeItem({ id: `new-${i}` })
      );
      const pool = buildSessionPool(newCards, TODAY, 10, 3);
      expect(pool.length).toBe(3);
      const ids = pool.map((c) => c.id);
      expect(ids.every((id) => id.startsWith("new-"))).toBe(true);
    });

    it("returns up to maxOld + maxNew total cards", () => {
      const oldCards = Array.from({ length: 10 }, (_, i) =>
        makeItem({
          id: `old-${i}`,
          consecutive_correct: 1,
          next_review_at: "2026-03-14",
        })
      );
      const newCards = Array.from({ length: 10 }, (_, i) =>
        makeItem({ id: `new-${i}` })
      );
      const pool = buildSessionPool([...oldCards, ...newCards], TODAY, 3, 5);
      expect(pool.length).toBe(8); // 3 old + 5 new
    });

    it("upcoming old cards count toward maxOld", () => {
      const upcomingOld = Array.from({ length: 5 }, (_, i) =>
        makeItem({
          id: `upcoming-${i}`,
          consecutive_correct: 1,
          next_review_at: `2026-03-${20 + i}`,
        })
      );
      const pool = buildSessionPool(upcomingOld, TODAY, 3, 0);
      expect(pool.length).toBe(3);
    });
  });
});
