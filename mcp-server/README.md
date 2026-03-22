# Rote MCP Server

A Model Context Protocol (MCP) server for the Rote spaced repetition system. This server allows Claude Desktop to interact with your flashcards through natural language commands.

## Features

- **Create or update flashcards** - Add new cards or merge with existing ones
- **Bulk import** - Import multiple cards from markdown format
- **List cards** - View all your flashcards with optional filtering
- **Update cards** - Modify any card field
- **Delete cards** - Remove cards you no longer need
- **Get single card** - Retrieve a specific card by ID

## Quick Start

### 1. Install Dependencies

```bash
cd /root/rote/mcp-server
npm install
```

### 2. Get Your Authentication Token

The MCP server needs your Rote app authentication token to access your data:

1. Open your Rote app in a browser (e.g., `https://rote.vercel.app/auth/login`)
2. Log in to your account
3. Open DevTools:
   - **Chrome/Edge**: Press F12 or Cmd+Option+I (Mac)
   - **Firefox**: Press F12 or Cmd+Option+I (Mac)
4. Go to the **Application** tab (Chrome/Edge) or **Storage** tab (Firefox)
5. Expand **Local Storage** and click on your app domain
6. Find the key matching the pattern `sb-.*-auth-token`
7. Copy the token value (it's a long JWT string)

**Note:** The token expires after some time. If authentication fails, extract a fresh token.

### 3. Set Environment Variables

Option A: Set in your shell/environment

```bash
export SUPABASE_URL="your-supabase-url"
export SUPABASE_ANON_KEY="your-supabase-anon-key"
export ROTE_APP_URL="https://rote.vercel.app"  # Optional, defaults to this
export ROTE_USER_TOKEN="your-extracted-token"  # Optional, you'll be prompted if not set
```

Option B: Set in Claude Desktop config (recommended - see below)

### 4. Run the Server

```bash
npm start
```

If you didn't set `ROTE_USER_TOKEN`, you'll be prompted to paste your token.

## Claude Desktop Integration

To use this MCP server with Claude Desktop, add it to your Claude Desktop configuration:

### macOS

`~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows

`%APPDATA%\Claude\claude_desktop_config.json`

### Configuration

```json
{
  "mcpServers": {
    "rote": {
      "command": "node",
      "args": ["--no-deprecation", "/root/rote/mcp-server/src/index.ts"],
      "env": {
        "SUPABASE_URL": "your-supabase-url",
        "SUPABASE_ANON_KEY": "your-supabase-anon-key",
        "ROTE_APP_URL": "https://rote.vercel.app",
        "ROTE_USER_TOKEN": "your-auth-token"
      }
    }
  }
}
```

**Note:** Use `npx tsx` instead of `node` if you don't want to compile TypeScript:

```json
{
  "mcpServers": {
    "rote": {
      "command": "npx",
      "args": ["tsx", "/root/rote/mcp-server/src/index.ts"],
      "env": {
        "SUPABASE_URL": "your-supabase-url",
        "SUPABASE_ANON_KEY": "your-supabase-anon-key",
        "ROTE_APP_URL": "https://rote.vercel.app",
        "ROTE_USER_TOKEN": "your-auth-token"
      }
    }
  }
}
```

Restart Claude Desktop after updating the configuration.

## Available Tools

### create_item

Create a new flashcard or merge with an existing one.

**Parameters:**
- `key` (string, required): The question or term
- `value` (string, required): The answer or content (supports markdown)

**Behavior:**
- If a card with the same key exists, the new value is prepended to the existing value
- Otherwise, a new card is created

**Example:**
```
Create a flashcard: What is Docker? → A container platform for applications
```

### bulk_import

Import multiple flashcards from markdown format.

**Parameters:**
- `markdown` (string, required): Markdown content with `#` headings

**Format:**
```markdown
# Question 1
Answer content 1

# Question 2
Answer content 2
```

**Behavior:**
- Each `#` heading becomes a key
- Content under the heading becomes the value
- Duplicate keys are merged (new value prepended)
- Content before the first heading is ignored

**Example:**
```
Import these flashcards:
# What is MCP?
Model Context Protocol - a standard for AI tool integration

# What is Rote?
A spaced repetition system for memorization
```

### list_items

List all flashcards for the current user.

**Parameters:**
- `limit` (number, optional): Maximum items to return (default: 100)
- `filter` (string, optional): Text filter to search in keys

**Example:**
```
List my flashcards
Show me all cards about Docker
```

### get_item

Get a single flashcard by ID.

**Parameters:**
- `id` (string, required): UUID of the flashcard

**Example:**
```
Get the flashcard with ID abc-123-def
```

### update_item

Update an existing flashcard. Only include the fields you want to change.

**Parameters:**
- `id` (string, required): UUID of the flashcard
- `key` (string, optional): New key value
- `value` (string, optional): New value content
- `next_review_at` (string, optional): Next review date (ISO 8601 format)
- `interval_days` (number, optional): Review interval in days
- `consecutive_correct` (number, optional): Streak count

**Example:**
```
Update the flashcard abc-123-def: set interval_days to 7
```

### delete_item

Delete a flashcard.

**Parameters:**
- `id` (string, required): UUID of the flashcard

**Example:**
```
Delete the flashcard with ID abc-123-def
```

## Natural Language Usage

Once connected to Claude Desktop, you can use natural language commands:

- "Add a flashcard: What is Docker? → A container platform"
- "Show me all my flashcards"
- "Import these cards from markdown: [paste markdown content]"
- "Update the card about Docker to change the interval to 7 days"
- "Delete the flashcard about Kubernetes"

## Troubleshooting

### Authentication fails

**Problem:** "Invalid or expired token" error

**Solution:**
1. Go back to your Rote app in the browser
2. Refresh the page and log in again if needed
3. Extract a fresh token from DevTools
4. Update the `ROTE_USER_TOKEN` environment variable

### "Module not found" errors

**Problem:** Cannot find `@modelcontextprotocol/sdk` or other dependencies

**Solution:**
```bash
cd /root/rote/mcp-server
npm install
```

### Server not starting

**Problem:** Server fails to start with "Missing Supabase configuration"

**Solution:** Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment variables are set. You can find these in your Supabase project settings.

### Claude Desktop can't find the server

**Problem:** Claude Desktop shows "Failed to connect to MCP server"

**Solution:**
1. Check the file path in your config is correct
2. Ensure dependencies are installed (`npm install`)
3. Check Claude Desktop logs for detailed error messages
4. On Windows, use double backslashes or forward slashes in paths

### Token expires frequently

**Problem:** You have to extract a new token every few hours

**Solution:** This is expected security behavior from Supabase. For long-running servers, you may need to refresh the token periodically. Consider setting up a token refresh mechanism or using a longer-lived token if your auth provider supports it.

## Development

### Project Structure

```
mcp-server/
├── src/
│   └── index.ts          # Main server implementation
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md             # This file
```

### Running in Development Mode

```bash
npm run dev
```

This uses `tsx --watch` for automatic reloading on file changes.

## Security Notes

- Your authentication token is sensitive - treat it like a password
- Never commit tokens to version control
- The server only communicates with your Supabase project
- All operations respect Supabase RLS policies - you can only access your own data
- Tokens expire for security - you'll need to refresh them periodically

## License

MIT
