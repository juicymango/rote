#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AuthClient } from "./auth.js";
import { RoteClient } from "./client.js";

// ── Types ────────────────────────────────────────────────────────────────────

interface Item {
  id: string;
  key: string;
  value: string;
  next_review_at: string;
  interval_days: number;
  consecutive_correct: number;
  created_at: string;
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function createServer(roteClient: RoteClient): McpServer {
  const server = new McpServer({
    name: "rote-mcp-server",
    version: "0.1.0",
  });

  // ── add_item ────────────────────────────────────────────────────────────────
  server.tool(
    "add_item",
    "Create a new flashcard item or merge its value into an existing item with the same key.",
    {
      key: z.string().describe("The question / concept key"),
      value: z.string().describe("The answer / content value"),
    },
    async (args) => {
      const data = await roteClient.request("/api/items", {
        method: "POST",
        body: JSON.stringify({ key: args.key, value: args.value }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── bulk_import ─────────────────────────────────────────────────────────────
  server.tool(
    "bulk_import",
    "Import multiple flashcard items from a markdown string. Each # heading becomes a key; content under it becomes the value.",
    {
      markdown: z.string().describe("Markdown with # headings as keys"),
    },
    async (args) => {
      const data = await roteClient.request("/api/items/bulk", {
        method: "POST",
        body: JSON.stringify({ markdown: args.markdown }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── list_items ──────────────────────────────────────────────────────────────
  server.tool(
    "list_items",
    "List all flashcard items, optionally limited or filtered by key/value substring.",
    {
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Maximum number of items to return (optional)"),
      filter: z
        .string()
        .optional()
        .describe("Substring to filter items by key or value (optional)"),
    },
    async (args) => {
      let items = (await roteClient.request("/api/items")) as Item[];

      if (args.filter) {
        const lc = args.filter.toLowerCase();
        items = items.filter(
          (i) =>
            i.key.toLowerCase().includes(lc) ||
            i.value.toLowerCase().includes(lc)
        );
      }

      if (args.limit !== undefined && args.limit > 0) {
        items = items.slice(0, args.limit);
      }

      return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
    }
  );

  // ── get_item ────────────────────────────────────────────────────────────────
  server.tool(
    "get_item",
    "Get a single flashcard item by its ID.",
    {
      id: z.string().describe("The item UUID"),
    },
    async (args) => {
      const data = await roteClient.request(`/api/items/${args.id}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── update_item ─────────────────────────────────────────────────────────────
  server.tool(
    "update_item",
    "Update an existing flashcard item. Only provided fields are updated.",
    {
      id: z.string().describe("The item UUID"),
      key: z.string().optional().describe("New key (optional)"),
      value: z.string().optional().describe("New value (optional)"),
      next_review_at: z
        .string()
        .optional()
        .describe("Override next review date YYYY-MM-DD (optional)"),
      interval_days: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Override interval in days (optional)"),
      consecutive_correct: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe("Override consecutive correct count (optional)"),
    },
    async (args) => {
      const { id, ...fields } = args;
      const data = await roteClient.request(`/api/items/${id}`, {
        method: "PUT",
        body: JSON.stringify(fields),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── delete_item ─────────────────────────────────────────────────────────────
  server.tool(
    "delete_item",
    "Delete a flashcard item by its ID.",
    {
      id: z.string().describe("The item UUID"),
    },
    async (args) => {
      await roteClient.request(`/api/items/${args.id}`, { method: "DELETE" });
      return { content: [{ type: "text", text: `Item ${args.id} deleted.` }] };
    }
  );

  // ── get_due_items ───────────────────────────────────────────────────────────
  server.tool(
    "get_due_items",
    "Get a shuffled session pool of due and new flashcard items for review.",
    {
      old: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Max number of due (old) cards to include (default 10)"),
      new: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Max number of new cards to include (default 10)"),
    },
    async (args) => {
      const qs = new URLSearchParams();
      if (args.old !== undefined) qs.set("old", String(args.old));
      if (args.new !== undefined) qs.set("new", String(args.new));
      const path = `/api/session${qs.toString() ? `?${qs.toString()}` : ""}`;
      const data = await roteClient.request(path);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── get_stats ───────────────────────────────────────────────────────────────
  server.tool(
    "get_stats",
    "Get statistics: total items, items due today, and average interval.",
    {},
    async () => {
      const items = (await roteClient.request("/api/items")) as Item[];
      const today = new Date().toISOString().slice(0, 10);

      const total = items.length;
      const dueToday = items.filter((i) => i.next_review_at <= today).length;
      const avgInterval =
        total > 0
          ? Math.round(
              items.reduce((sum, i) => sum + i.interval_days, 0) / total
            )
          : 0;

      const stats = { total, due_today: dueToday, avg_interval_days: avgInterval };
      return { content: [{ type: "text", text: JSON.stringify(stats, null, 2) }] };
    }
  );

  return server;
}

// ── Entrypoint ───────────────────────────────────────────────────────────────

async function main() {
  const appUrl = process.env.ROTE_APP_URL;
  const email = process.env.ROTE_EMAIL;
  const password = process.env.ROTE_PASSWORD;

  if (!appUrl || !email || !password) {
    console.error(
      "Missing required environment variables: ROTE_APP_URL, ROTE_EMAIL, ROTE_PASSWORD"
    );
    process.exit(1);
  }

  const authClient = new AuthClient(appUrl, email, password);
  const roteClient = new RoteClient(appUrl, authClient);

  const server = createServer(roteClient);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Only run when invoked directly (not when imported by tests)
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
