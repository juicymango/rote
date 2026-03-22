#!/usr/bin/env tsx
/**
 * Rote MCP Server
 *
 * A Model Context Protocol server for the Rote spaced repetition system.
 * Allows Claude Desktop to interact with flashcards via CRUD operations.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import readline from "readline";

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ROTE_APP_URL = process.env.ROTE_APP_URL || "https://rote.vercel.app";
const USER_TOKEN = process.env.ROTE_USER_TOKEN;

// Validation schemas
const CreateItemSchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string().min(1, "Value is required"),
});

const BulkImportSchema = z.object({
  markdown: z.string().min(1, "Markdown content is required"),
});

const GetItemSchema = z.object({
  id: z.string().uuid("Invalid UUID format"),
});

const UpdateItemSchema = z.object({
  id: z.string().uuid("Invalid UUID format"),
  key: z.string().optional(),
  value: z.string().optional(),
  next_review_at: z.string().optional(),
  interval_days: z.number().int().positive().optional(),
  consecutive_correct: z.number().int().nonnegative().optional(),
});

const DeleteItemSchema = z.object({
  id: z.string().uuid("Invalid UUID format"),
});

const ListItemsSchema = z.object({
  limit: z.number().int().positive().default(100),
  filter: z.string().optional(),
});

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: "create_item",
    description: "Create or update a flashcard. If a card with the same key exists, the new value will be prepended to the existing value.",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "The question or term for the flashcard",
        },
        value: {
          type: "string",
          description: "The answer or content for the flashcard (supports markdown)",
        },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "bulk_import",
    description: "Import multiple flashcards from a markdown string. Each # heading becomes a key, and the content under it becomes the value.",
    inputSchema: {
      type: "object",
      properties: {
        markdown: {
          type: "string",
          description: "Markdown content with # headings for each flashcard",
        },
      },
      required: ["markdown"],
    },
  },
  {
    name: "list_items",
    description: "List all flashcards for the current user",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of items to return",
          default: 100,
        },
        filter: {
          type: "string",
          description: "Optional text filter to search in keys",
        },
      },
      required: [],
    },
  },
  {
    name: "get_item",
    description: "Get a single flashcard by ID",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "UUID of the flashcard",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "update_item",
    description: "Update an existing flashcard. Only include the fields you want to change.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "UUID of the flashcard",
        },
        key: {
          type: "string",
          description: "New key value",
        },
        value: {
          type: "string",
          description: "New value content",
        },
        next_review_at: {
          type: "string",
          description: "Next review date (ISO 8601 format)",
        },
        interval_days: {
          type: "number",
          description: "Review interval in days",
        },
        consecutive_correct: {
          type: "number",
          description: "Number of consecutive correct answers (streak)",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_item",
    description: "Delete a flashcard",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "UUID of the flashcard",
        },
      },
      required: ["id"],
    },
  },
];

// Global state
let supabase: SupabaseClient | null = null;
let userId: string | null = null;

/**
 * Parse markdown bulk import format
 * Splits on # heading boundaries
 */
function parseMarkdownBulkImport(markdown: string): Array<{ key: string; value: string }> {
  const items: Array<{ key: string; value: string }> = [];
  const lines = markdown.split("\n");
  let currentKey: string | null = null;
  let currentValue: string[] = [];

  for (const line of lines) {
    if (line.startsWith("# ")) {
      // Save previous item if exists
      if (currentKey && currentValue.length > 0) {
        const value = currentValue.join("\n").trim();
        if (value) {
          items.push({ key: currentKey, value });
        }
      }
      // Start new item
      currentKey = line.substring(2).trim();
      currentValue = [];
    } else if (currentKey) {
      currentValue.push(line);
    }
  }

  // Save last item
  if (currentKey && currentValue.length > 0) {
    const value = currentValue.join("\n").trim();
    if (value) {
      items.push({ key: currentKey, value });
    }
  }

  return items;
}

/**
 * Merge values for duplicate keys
 * Prepends new value to existing value with a blank line separator
 */
function mergeValues(newValue: string, existingValue: string): string {
  return `${newValue}\n\n${existingValue}`;
}

/**
 * Verify the user token and extract user ID
 */
async function verifyToken(token: string): Promise<{ userId: string; email?: string }> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set");
  }

  const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data, error } = await tempClient.auth.getUser();
  if (error || !data.user) {
    throw new Error("Invalid or expired token. Please extract a fresh token from the browser.");
  }

  return { userId: data.user.id, email: data.user.email };
}

/**
 * Interactive login prompt via stdin
 */
function promptForToken(): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr,
    });

    rl.question("\nPaste your token here: ", (token) => {
      rl.close();
      resolve(token.trim());
    });
  });
}

/**
 * Initialize authentication
 * Checks for token in environment or prompts user
 */
async function initializeAuth(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }

  let token = USER_TOKEN;
  let needsVerification = true;

  if (!token) {
    console.error("\n🔐 Authentication Required");
    console.error("\nTo get your authentication token:");
    console.error(`1. Open ${ROTE_APP_URL}/auth/login in your browser`);
    console.error("2. Log in to your account");
    console.error("3. Open DevTools (F12 or Cmd+Option+I)");
    console.error("4. Go to Application → Local Storage");
    console.error("5. Find the key matching pattern: sb-.*-auth-token");
    console.error("6. Copy the token value (it's a long JWT string)");

    token = await promptForToken();
  } else {
    console.error("🔑 Found token in environment, verifying...");
  }

  // Verify token and get user info
  try {
    const result = await verifyToken(token);
    userId = result.userId;
    console.error(`\n✅ Logged in as: ${result.email || result.userId}`);

    // Create Supabase client with the token
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
  } catch (error) {
    console.error(`\n❌ Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    console.error("\nPlease try again with a fresh token.");
    throw error;
  }
}

/**
 * Create or update an item
 */
async function createItem(key: string, value: string): Promise<string> {
  if (!supabase || !userId) {
    throw new Error("Not authenticated");
  }

  const trimmedKey = key.trim();
  const trimmedValue = value.trim();

  // Check for existing item with same key
  const { data: existing } = await supabase
    .from("items")
    .select("id, value")
    .eq("user_id", userId)
    .eq("key", trimmedKey)
    .maybeSingle();

  if (existing) {
    // Merge values
    const mergedValue = mergeValues(trimmedValue, existing.value);
    const { data, error } = await supabase
      .from("items")
      .update({ value: mergedValue })
      .eq("id", existing.id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return JSON.stringify(data, null, 2);
  }

  // Create new item
  const { data, error } = await supabase
    .from("items")
    .insert({ key: trimmedKey, value: trimmedValue, user_id: userId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return JSON.stringify(data, null, 2);
}

/**
 * Bulk import from markdown
 */
async function bulkImport(markdown: string): Promise<string> {
  if (!supabase || !userId) {
    throw new Error("Not authenticated");
  }

  const items = parseMarkdownBulkImport(markdown);

  if (items.length === 0) {
    return JSON.stringify({ message: "No valid items found in markdown", imported: 0 }, null, 2);
  }

  let imported = 0;
  let merged = 0;
  const errors: string[] = [];

  for (const item of items) {
    try {
      // Check for existing
      const { data: existing } = await supabase
        .from("items")
        .select("id, value")
        .eq("user_id", userId)
        .eq("key", item.key)
        .maybeSingle();

      if (existing) {
        const mergedValue = mergeValues(item.value, existing.value);
        await supabase
          .from("items")
          .update({ value: mergedValue })
          .eq("id", existing.id)
          .eq("user_id", userId);
        merged++;
      } else {
        await supabase
          .from("items")
          .insert({ key: item.key, value: item.value, user_id: userId });
        imported++;
      }
    } catch (error) {
      errors.push(`${item.key}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return JSON.stringify({
    message: "Import completed",
    imported,
    merged,
    errors: errors.length > 0 ? errors : undefined,
  }, null, 2);
}

/**
 * List items
 */
async function listItems(limit: number, filter?: string): Promise<string> {
  if (!supabase || !userId) {
    throw new Error("Not authenticated");
  }

  let query = supabase
    .from("items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filter) {
    query = query.ilike("key", `%${filter}%`);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return JSON.stringify(data || [], null, 2);
}

/**
 * Get single item
 */
async function getItem(id: string): Promise<string> {
  if (!supabase || !userId) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Item not found");

  return JSON.stringify(data, null, 2);
}

/**
 * Update item
 */
async function updateItem(id: string, updates: Record<string, unknown>): Promise<string> {
  if (!supabase || !userId) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("items")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Item not found");

  return JSON.stringify(data, null, 2);
}

/**
 * Delete item
 */
async function deleteItem(id: string): Promise<string> {
  if (!supabase || !userId) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("items")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  return JSON.stringify({ message: "Item deleted successfully", id }, null, 2);
}

/**
 * Main function
 */
async function main() {
  try {
    // Initialize authentication
    await initializeAuth();

    // Create MCP server
    const server = new Server(
      {
        name: "rote-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // List tools handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: TOOLS };
    });

    // Call tool handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "create_item": {
            const { key, value } = CreateItemSchema.parse(args);
            const result = await createItem(key, value);
            return { content: [{ type: "text", text: result }] };
          }

          case "bulk_import": {
            const { markdown } = BulkImportSchema.parse(args);
            const result = await bulkImport(markdown);
            return { content: [{ type: "text", text: result }] };
          }

          case "list_items": {
            const { limit, filter } = ListItemsSchema.parse(args);
            const result = await listItems(limit, filter);
            return { content: [{ type: "text", text: result }] };
          }

          case "get_item": {
            const { id } = GetItemSchema.parse(args);
            const result = await getItem(id);
            return { content: [{ type: "text", text: result }] };
          }

          case "update_item": {
            const params = UpdateItemSchema.parse(args);
            const { id, ...updates } = params;
            const result = await updateItem(id, updates);
            return { content: [{ type: "text", text: result }] };
          }

          case "delete_item": {
            const { id } = DeleteItemSchema.parse(args);
            const result = await deleteItem(id);
            return { content: [{ type: "text", text: result }] };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [{ type: "text", text: JSON.stringify({ error: errorMessage }, null, 2) }],
          isError: true,
        };
      }
    });

    // Connect to transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error("\n✅ Rote MCP Server is running...");
    console.error("\nAvailable tools:");
    for (const tool of TOOLS) {
      console.error(`  - ${tool.name}`);
    }

  } catch (error) {
    console.error("\n❌ Failed to start server:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Start the server
main();
