import { createServer } from "../index.js";
import { RoteClient } from "../client.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

function makeRoteClient(): RoteClient {
  return {
    request: jest.fn().mockResolvedValue([]),
  } as unknown as RoteClient;
}

const EXPECTED_TOOLS = [
  "add_item",
  "bulk_import",
  "list_items",
  "get_item",
  "update_item",
  "delete_item",
  "get_due_items",
  "get_stats",
];

describe("MCP server startup — ListTools", () => {
  it("returns all expected tool names", async () => {
    const server = createServer(makeRoteClient());

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);

    const client = new Client({ name: "test-client", version: "1.0.0" });
    await client.connect(clientTransport);

    const { tools } = await client.listTools();
    const toolNames = tools.map((t) => t.name);

    for (const expected of EXPECTED_TOOLS) {
      expect(toolNames).toContain(expected);
    }

    await client.close();
    await server.close();
  });
});
