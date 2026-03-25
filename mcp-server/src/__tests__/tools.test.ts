import { createServer } from "../index.js";
import { RoteClient } from "../client.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRoteClient(requestImpl: jest.Mock): RoteClient {
  return { request: requestImpl } as unknown as RoteClient;
}

const ITEM = {
  id: "item-1",
  key: "What is 2+2?",
  value: "4",
  next_review_at: "2026-03-25",
  interval_days: 1,
  consecutive_correct: 0,
  created_at: "2026-03-01T00:00:00Z",
};

/**
 * Invoke a named tool on the server by directly calling its registered handler.
 * The MCP SDK stores tools in `server._registeredTools` (a plain object keyed by tool name).
 */
async function callTool(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any,
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const registeredTools: Record<string, { handler: (args: unknown) => Promise<unknown> }> =
    server._registeredTools;
  const tool = registeredTools[name];
  if (!tool) throw new Error(`Tool "${name}" not found`);
  return tool.handler(args) as Promise<{ content: Array<{ type: string; text: string }> }>;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("add_item tool", () => {
  it("POSTs to /api/items with key and value", async () => {
    const request = jest.fn().mockResolvedValue(ITEM);
    const server = createServer(makeRoteClient(request));

    await callTool(server, "add_item", { key: "q", value: "a" });

    expect(request).toHaveBeenCalledWith("/api/items", {
      method: "POST",
      body: JSON.stringify({ key: "q", value: "a" }),
    });
  });

  it("returns JSON stringified item in text content", async () => {
    const request = jest.fn().mockResolvedValue(ITEM);
    const server = createServer(makeRoteClient(request));

    const result = await callTool(server, "add_item", { key: "q", value: "a" });
    expect(JSON.parse(result.content[0].text)).toEqual(ITEM);
  });
});

describe("bulk_import tool", () => {
  it("POSTs to /api/items/bulk with markdown", async () => {
    const request = jest.fn().mockResolvedValue({ count: 3 });
    const server = createServer(makeRoteClient(request));

    await callTool(server, "bulk_import", { markdown: "# Q1\nA1" });

    expect(request).toHaveBeenCalledWith("/api/items/bulk", {
      method: "POST",
      body: JSON.stringify({ markdown: "# Q1\nA1" }),
    });
  });
});

describe("list_items tool", () => {
  it("GETs /api/items", async () => {
    const request = jest.fn().mockResolvedValue([ITEM]);
    const server = createServer(makeRoteClient(request));

    await callTool(server, "list_items", {});
    expect(request).toHaveBeenCalledWith("/api/items");
  });

  it("filters by substring when filter is provided", async () => {
    const items = [
      { ...ITEM, key: "math question", value: "answer" },
      { ...ITEM, id: "item-2", key: "science question", value: "42" },
    ];
    const request = jest.fn().mockResolvedValue(items);
    const server = createServer(makeRoteClient(request));

    const result = await callTool(server, "list_items", { filter: "math" });
    const returned = JSON.parse(result.content[0].text);
    expect(returned).toHaveLength(1);
    expect(returned[0].key).toBe("math question");
  });

  it("limits results when limit is provided", async () => {
    const items = [ITEM, { ...ITEM, id: "item-2" }, { ...ITEM, id: "item-3" }];
    const request = jest.fn().mockResolvedValue(items);
    const server = createServer(makeRoteClient(request));

    const result = await callTool(server, "list_items", { limit: 2 });
    const returned = JSON.parse(result.content[0].text);
    expect(returned).toHaveLength(2);
  });
});

describe("get_item tool", () => {
  it("GETs /api/items/:id", async () => {
    const request = jest.fn().mockResolvedValue(ITEM);
    const server = createServer(makeRoteClient(request));

    await callTool(server, "get_item", { id: "item-1" });
    expect(request).toHaveBeenCalledWith("/api/items/item-1");
  });
});

describe("update_item tool", () => {
  it("PUTs to /api/items/:id with fields", async () => {
    const updated = { ...ITEM, value: "new answer" };
    const request = jest.fn().mockResolvedValue(updated);
    const server = createServer(makeRoteClient(request));

    await callTool(server, "update_item", { id: "item-1", key: "q", value: "new answer" });

    expect(request).toHaveBeenCalledWith("/api/items/item-1", {
      method: "PUT",
      body: JSON.stringify({ key: "q", value: "new answer" }),
    });
  });
});

describe("delete_item tool", () => {
  it("DELETEs /api/items/:id", async () => {
    const request = jest.fn().mockResolvedValue(null);
    const server = createServer(makeRoteClient(request));

    await callTool(server, "delete_item", { id: "item-1" });
    expect(request).toHaveBeenCalledWith("/api/items/item-1", { method: "DELETE" });
  });
});

describe("get_due_items tool", () => {
  it("GETs /api/session without query params by default", async () => {
    const request = jest.fn().mockResolvedValue([ITEM]);
    const server = createServer(makeRoteClient(request));

    await callTool(server, "get_due_items", {});
    expect(request).toHaveBeenCalledWith("/api/session");
  });

  it("appends old and new query params when provided", async () => {
    const request = jest.fn().mockResolvedValue([ITEM]);
    const server = createServer(makeRoteClient(request));

    await callTool(server, "get_due_items", { old: 5, new: 3 });
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining("old=5") && expect.stringContaining("new=3")
    );
  });
});

describe("get_stats tool", () => {
  it("GETs /api/items and computes stats", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const items = [
      { ...ITEM, next_review_at: today, interval_days: 2 },
      { ...ITEM, id: "item-2", next_review_at: "2099-01-01", interval_days: 4 },
    ];
    const request = jest.fn().mockResolvedValue(items);
    const server = createServer(makeRoteClient(request));

    const result = await callTool(server, "get_stats", {});
    const stats = JSON.parse(result.content[0].text);

    expect(stats.total).toBe(2);
    expect(stats.due_today).toBe(1);
    expect(stats.avg_interval_days).toBe(3); // (2+4)/2
  });
});
