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

  it("does not include future cards", () => {
    const future = makeItem({
      id: "future",
      consecutive_correct: 1,
      next_review_at: "2026-03-20",
    });
    const pool = buildSessionPool([future], TODAY);
    expect(pool).toHaveLength(0);
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
});
