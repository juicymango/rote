import { parseMarkdownToItems } from "../parseMarkdown";

describe("parseMarkdownToItems", () => {
  it("parses a normal markdown document into items", () => {
    const md = `# Question One\nThis is the answer to one.\n\n# Question Two\nThis is the answer to two.`;
    const items = parseMarkdownToItems(md);
    expect(items).toHaveLength(2);
    expect(items[0].key).toBe("Question One");
    expect(items[0].value).toBe("This is the answer to one.");
    expect(items[1].key).toBe("Question Two");
    expect(items[1].value).toBe("This is the answer to two.");
  });

  it("returns empty array when there are no H1 headings", () => {
    const md = `## Not a heading\nSome content without H1.`;
    expect(parseMarkdownToItems(md)).toHaveLength(0);
  });

  it("skips items with empty values", () => {
    const md = `# Key Without Value\n# Key With Value\nSome content here.`;
    const items = parseMarkdownToItems(md);
    expect(items).toHaveLength(1);
    expect(items[0].key).toBe("Key With Value");
  });

  it("handles consecutive H1 headings (both without body between them)", () => {
    const md = `# First\n# Second\nContent for second.`;
    const items = parseMarkdownToItems(md);
    expect(items).toHaveLength(1);
    expect(items[0].key).toBe("Second");
    expect(items[0].value).toBe("Content for second.");
  });

  it("trims whitespace from keys and values", () => {
    const md = `#  Spaced Key  \n  Content with spaces  `;
    const items = parseMarkdownToItems(md);
    expect(items[0].key).toBe("Spaced Key");
    expect(items[0].value).toBe("Content with spaces");
  });

  it("returns empty array for empty input", () => {
    expect(parseMarkdownToItems("")).toHaveLength(0);
  });

  it("preserves multi-line values", () => {
    const md = `# Key\nLine one\nLine two\nLine three`;
    const items = parseMarkdownToItems(md);
    expect(items[0].value).toBe("Line one\nLine two\nLine three");
  });
});
