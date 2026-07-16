/**
 * MCP client factory — wraps @modelcontextprotocol/sdk for streamable HTTP.
 *
 * Each server (food, instamart, dineout) gets its own client instance bound to
 * the user's access token. We never fork the SDK; retries + idempotency live
 * in the orchestration layer above this.
 *
 * Fixture mode: set USE_MCP_FIXTURES=true to load from /fixtures/*.json instead
 * of making real network calls. Lets the app boot without Swiggy credentials.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export type SwiggyServer = "food" | "instamart" | "dineout";

const SERVER_URLS: Record<SwiggyServer, string> = {
  food: "https://mcp.swiggy.com/food",
  instamart: "https://mcp.swiggy.com/im",
  dineout: "https://mcp.swiggy.com/dineout",
};

/** Create a single-use MCP client for a given server + user token. */
export async function createMcpClient(
  server: SwiggyServer,
  accessToken: string
): Promise<Client> {
  const url = new URL(SERVER_URLS[server]);

  const transport = new StreamableHTTPClientTransport(url, {
    requestInit: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const client = new Client(
    { name: "craving-to-plate", version: "0.1.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  return client;
}

/** Call a tool and return its result content. Throws on non-success. */
export async function callTool<T = unknown>(
  client: Client,
  toolName: string,
  args: Record<string, unknown>
): Promise<T> {
  const result = await client.callTool({ name: toolName, arguments: args });

  if (result.isError) {
    const contents = result.content as Array<{ type: string; text?: string }> | undefined;
    const message = contents?.[0]?.type === "text" ? contents[0].text ?? "MCP tool error" : "MCP tool error";
    throw new McpError(toolName, message);
  }

  // Tools return JSON text content
  const contents = result.content as Array<{ type: string; text?: string }> | undefined;
  const textContent = contents?.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new McpError(toolName, "No text content in response");
  }

  try {
    const parsed = JSON.parse(textContent.text ?? "") as { success: boolean; data?: T; error?: { message: string } };
    if (!parsed.success) {
      throw new McpError(toolName, parsed.error?.message ?? "Tool returned success:false");
    }
    return parsed.data as T;
  } catch (e) {
    if (e instanceof McpError) throw e;
    // Some tools return plain text, not JSON
    return textContent.text as unknown as T;
  }
}

export class McpError extends Error {
  constructor(
    public readonly toolName: string,
    message: string
  ) {
    super(`[MCP:${toolName}] ${message}`);
    this.name = "McpError";
  }
}

/** Classify error for retry logic (OPERATIONS.md §Error Classification) */
export function classifyMcpError(error: unknown): "auth" | "bad_input" | "upstream" | "domain" | "internal" {
  if (!(error instanceof Error)) return "internal";
  const msg = error.message.toLowerCase();
  if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("unauthenticated")) return "auth";
  if (msg.includes("400") || msg.includes("invalid") || msg.includes("missing")) return "bad_input";
  if (msg.includes("504") || msg.includes("timeout") || msg.includes("502") || msg.includes("503")) return "upstream";
  if (msg.includes("success:false") || msg.includes("slot_unavailable") || msg.includes("not_bookable")) return "domain";
  return "internal";
}
