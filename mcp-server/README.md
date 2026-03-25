# Rote MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server for the Rote spaced-repetition app. It exposes Rote's flashcard and session features as MCP tools, allowing AI assistants to create, review, and manage flashcards.

## Design

- Authenticates by calling `POST /api/auth/login` on the Rote app — **no Supabase credentials required**.
- All item operations call the Rote app's existing API routes over HTTP. Business logic stays in the app; the MCP server is a thin HTTP client.
- On a `401` response, the server automatically calls `POST /api/auth/refresh` and retries the request once.

## Configuration

Set the following environment variables before starting the server:

| Variable | Description | Example |
|---|---|---|
| `ROTE_APP_URL` | Base URL of the deployed Rote app | `https://rote.vercel.app` |
| `ROTE_EMAIL` | Rote account email | `alice@example.com` |
| `ROTE_PASSWORD` | Rote account password | `s3cr3t` |

## Available Tools

| Tool | Description |
|---|---|
| `add_item` | Create a flashcard item, or merge its value into an existing item with the same key |
| `bulk_import` | Import multiple items from a markdown string (`# heading` → key, content → value) |
| `list_items` | List all items, with optional `limit` and substring `filter` |
| `get_item` | Fetch a single item by UUID |
| `update_item` | Update fields of an existing item (`key`, `value`, `next_review_at`, `interval_days`, `consecutive_correct`) |
| `delete_item` | Delete an item by UUID |
| `get_due_items` | Get a shuffled session pool of due and new items for review (`old` and `new` count params) |
| `get_stats` | Compute summary statistics: total items, items due today, average interval |

## Usage

### With Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "rote": {
      "command": "node",
      "args": ["/path/to/rote/mcp-server/dist/index.js"],
      "env": {
        "ROTE_APP_URL": "https://rote.vercel.app",
        "ROTE_EMAIL": "alice@example.com",
        "ROTE_PASSWORD": "s3cr3t"
      }
    }
  }
}
```

### Building

```bash
cd mcp-server
npm install
npm run build
```

### Running directly

```bash
cd mcp-server
ROTE_APP_URL=https://rote.vercel.app \
ROTE_EMAIL=alice@example.com \
ROTE_PASSWORD=s3cr3t \
node dist/index.js
```

### Running tests

```bash
cd mcp-server
npm test
```

## Project Structure

```
mcp-server/
├── src/
│   ├── auth.ts          # AuthClient — login + token refresh
│   ├── client.ts        # RoteClient — authenticated HTTP requests with auto-refresh
│   ├── index.ts         # McpServer factory + tool registrations + entrypoint
│   └── __tests__/
│       ├── auth.test.ts     # Unit tests for AuthClient
│       ├── client.test.ts   # Unit tests for RoteClient (including 401 auto-refresh)
│       ├── tools.test.ts    # Unit tests for each tool handler
│       └── startup.test.ts  # Integration test: starts server, calls ListTools
├── jest.config.js
├── tsconfig.json
└── package.json
```
