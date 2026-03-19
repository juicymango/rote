export type ParsedItem = { key: string; value: string };

export function parseMarkdownToItems(markdown: string): ParsedItem[] {
  const lines = markdown.split("\n");
  const items: ParsedItem[] = [];
  let currentKey: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (currentKey !== null) {
      const value = currentLines.join("\n").trim();
      if (value) items.push({ key: currentKey, value });
    }
  };

  for (const line of lines) {
    if (line.startsWith("# ")) {
      flush();
      currentKey = line.slice(2).trim();
      currentLines = [];
    } else if (currentKey !== null) {
      currentLines.push(line);
    }
  }
  flush();
  return items;
}
