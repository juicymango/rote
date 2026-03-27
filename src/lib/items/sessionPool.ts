export interface Item {
  id: string;
  key: string;
  value: string;
  next_review_at: string;
  interval_days: number;
  consecutive_correct: number;
  created_at: string;
}

export const DEFAULT_OLD_COUNT = 10;
export const DEFAULT_NEW_COUNT = 10;
export const DEFAULT_FETCH_OLD_COUNT = 100;
export const DEFAULT_FETCH_NEW_COUNT = 100;

/** Returns up to maxOld old + maxNew new cards, combined and shuffled.
 * Old cards: consecutive_correct > 0, sorted by next_review_at ASC (includes upcoming).
 * New cards: consecutive_correct === 0, sorted by created_at ASC.
 */
export function buildSessionPool(
  allItems: Item[],
  today: Date = new Date(),
  maxOld: number = DEFAULT_OLD_COUNT,
  maxNew: number = DEFAULT_NEW_COUNT
): Item[] {
  const isOld = (i: Item) => i.consecutive_correct > 0;
  const isNew = (i: Item) => i.consecutive_correct === 0;

  const oldCards = allItems
    .filter(isOld)
    .sort((a, b) => a.next_review_at.localeCompare(b.next_review_at))
    .slice(0, maxOld);

  const newCards = allItems
    .filter(isNew)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(0, maxNew);

  return shuffle([...oldCards, ...newCards]);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
