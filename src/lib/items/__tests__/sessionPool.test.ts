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

  it("includes new cards (consecutive_correct=0, next_review_at=today)", () => {
    const items = [makeItem({ id: "1" }), makeItem({ id: "2" })];
    const pool = buildSessionPool(items, TODAY);
    expect(pool).toHaveLength(2);
  });

  it("includes old cards (next_review_at <= today, not new)", () => {
    const old = makeItem({
      id: "old-1",
      consecutive_correct: 1,
      next_review_at: "2026-03-10",
    });
    const pool = buildSessionPool([old], TODAY);
    expect(pool).toHaveLength(1);
    expect(pool[0].id).toBe("old-1");
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

  it("includes future cards as upcoming fallback when no new cards exist", () => {
    // With upcoming-card fallback, future cards are now included to fill new-side slots
    const future = makeItem({
      id: "future",
      consecutive_correct: 1,
      next_review_at: "2026-03-20",
    });
    const pool = buildSessionPool([future], TODAY);
    expect(pool).toHaveLength(1);
    expect(pool[0].id).toBe("future");
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

  describe("upcoming-card fallback", () => {
    it("fills remaining new slots with upcoming cards when new cards exhausted", () => {
      const newCards = [
        makeItem({ id: "new-1" }),
        makeItem({ id: "new-2" }),
      ];
      const upcomingCards = [
        makeItem({
          id: "upcoming-1",
          consecutive_correct: 1,
          next_review_at: "2026-03-16",
        }),
        makeItem({
          id: "upcoming-2",
          consecutive_correct: 1,
          next_review_at: "2026-03-17",
        }),
        makeItem({
          id: "upcoming-3",
          consecutive_correct: 1,
          next_review_at: "2026-03-18",
        }),
      ];
      const pool = buildSessionPool([...newCards, ...upcomingCards], TODAY);

      // Should have 2 new + up to 8 upcoming (to reach 10 total new-side cards)
      expect(pool.length).toBe(5);
      const ids = pool.map((i) => i.id);
      expect(ids).toContain("new-1");
      expect(ids).toContain("new-2");
      expect(ids).toContain("upcoming-1");
      expect(ids).toContain("upcoming-2");
      expect(ids).toContain("upcoming-3");
    });

    it("selects soonest-due upcoming cards first", () => {
      const newCards = [makeItem({ id: "new-1" })];
      const upcomingCards = [
        makeItem({
          id: "upcoming-far",
          consecutive_correct: 1,
          next_review_at: "2026-03-25",
        }),
        makeItem({
          id: "upcoming-near",
          consecutive_correct: 1,
          next_review_at: "2026-03-16",
        }),
        makeItem({
          id: "upcoming-mid",
          consecutive_correct: 1,
          next_review_at: "2026-03-20",
        }),
      ];
      const pool = buildSessionPool([...newCards, ...upcomingCards], TODAY);

      const ids = pool.map((i) => i.id);
      expect(ids).toContain("new-1");
      expect(ids).toContain("upcoming-near");
      expect(ids).toContain("upcoming-mid");
      // Should not include the farthest one if we only need 3 total
      expect(ids).toContain("upcoming-far");
      expect(pool.length).toBe(4);
    });

    it("does not add upcoming cards if 10 new cards already exist", () => {
      const newCards = Array.from({ length: 10 }, (_, i) =>
        makeItem({ id: `new-${i}` })
      );
      const upcomingCards = [
        makeItem({
          id: "upcoming-1",
          consecutive_correct: 1,
          next_review_at: "2026-03-16",
        }),
      ];
      const pool = buildSessionPool([...newCards, ...upcomingCards], TODAY);

      // Should only have the 10 new cards, no upcoming
      expect(pool.length).toBe(10);
      const ids = pool.map((i) => i.id);
      expect(ids).not.toContain("upcoming-1");
    });

    it("combines old cards, new cards, and upcoming fallback to reach 10+10", () => {
      const oldCards = Array.from({ length: 10 }, (_, i) =>
        makeItem({
          id: `old-${i}`,
          consecutive_correct: 1,
          next_review_at: "2026-03-14",
        })
      );
      const newCards = [
        makeItem({ id: "new-1" }),
        makeItem({ id: "new-2" }),
      ];
      const upcomingCards = Array.from({ length: 10 }, (_, i) =>
        makeItem({
          id: `upcoming-${i}`,
          consecutive_correct: 1,
          next_review_at: `2026-03-${16 + i}`,
        })
      );
      const pool = buildSessionPool(
        [...oldCards, ...newCards, ...upcomingCards],
        TODAY
      );

      // Should have 10 old + 2 new + 8 upcoming = 20 total
      expect(pool.length).toBe(20);
      const ids = pool.map((i) => i.id);
      expect(ids.filter((id) => id.startsWith("old-"))).toHaveLength(10);
      expect(ids.filter((id) => id.startsWith("new-"))).toHaveLength(2);
      expect(ids.filter((id) => id.startsWith("upcoming-"))).toHaveLength(8);
    });

    it("handles case with no new cards and fills entirely from upcoming", () => {
      const upcomingCards = Array.from({ length: 15 }, (_, i) =>
        makeItem({
          id: `upcoming-${i}`,
          consecutive_correct: 1,
          next_review_at: `2026-03-${16 + i}`,
        })
      );
      const pool = buildSessionPool(upcomingCards, TODAY);

      // Should have 10 upcoming cards (no new, no old)
      expect(pool.length).toBe(10);
      const ids = pool.map((i) => i.id);
      expect(ids.every((id) => id.startsWith("upcoming-"))).toBe(true);
    });
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

    it("fills new slots with upcoming cards up to custom maxNew", () => {
      const newCards = [makeItem({ id: "new-1" })];
      const upcomingCards = Array.from({ length: 5 }, (_, i) =>
        makeItem({
          id: `upcoming-${i}`,
          consecutive_correct: 1,
          next_review_at: `2026-03-${16 + i}`,
        })
      );
      const pool = buildSessionPool([...newCards, ...upcomingCards], TODAY, 10, 4);
      // Should have 1 new + 3 upcoming = 4 total new-side cards
      expect(pool.length).toBe(4);
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
  });
});
