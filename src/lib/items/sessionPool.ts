export interface Item {
  id: string;
  key: string;
  value: string;
  next_review_at: string;
  interval_days: number;
  consecutive_correct: number;
  created_at: string;
}

/** Returns up to 10 old + 10 new cards, combined and shuffled. */
export function buildSessionPool(
  allItems: Item[],
  today: Date = new Date()
): Item[] {
  const todayStr = today.toISOString().slice(0, 10);
  const isNew = (i: Item) =>
    i.consecutive_correct === 0 && i.next_review_at === todayStr;
  const isDue = (i: Item) => !isNew(i) && i.next_review_at <= todayStr;

  const oldCards = allItems
    .filter(isDue)
    .sort((a, b) => a.next_review_at.localeCompare(b.next_review_at))
    .slice(0, 10);

  const newCards = allItems
    .filter(isNew)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(0, 10);

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
