/**
 * POST /api/compare
 * Main comparison endpoint — runs the 3-leg orchestrator.
 * Streams SSE updates per leg so UI renders progressively.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRecipe } from "@/lib/recipe/service";
import { runComparison } from "@/lib/orchestrator/compare";
import { getToken } from "@/lib/auth/tokens";
import { createMcpClient } from "@/lib/mcp/client";
import { getServerClient } from "@/lib/db/supabase";
import { cacheSet } from "@/lib/cache/redis";
import { CACHE_KEYS, TTL } from "@/lib/cache/keys";
import type { Comparison } from "@/lib/types";

const schema = z.object({
  dish: z.string().min(1).optional(),
  reelUrl: z.string().url().optional(),
  addressId: z.string().min(1),
  servings: z.number().int().min(1).max(20).optional(),
  vegOnly: z.boolean().optional(),
  city: z.string().min(1).default("bengaluru"),
  dineoutLat: z.number().optional(),
  dineoutLng: z.number().optional(),
  dineoutAddressId: z.string().optional(),
}).refine((d) => d.dish || d.reelUrl, {
  message: "Provide dish name or reel URL",
});

/** Helper: get or create mock MCP clients for fixture/dev mode */
async function getMcpClients(userId: string) {
  const useMocks = process.env.USE_MCP_FIXTURES === "true";

  if (useMocks) {
    // Return minimal mock clients — actual calls use fixtures
    const { createMcpClient } = await import("@/lib/mcp/client");
    // In fixture mode we can pass a dummy token; fixtures bypass network
    const mock = { callTool: async () => ({ content: [{ type: "text", text: "[]" }] }) } as unknown;
    return { foodClient: mock, imClient: mock, dineoutClient: mock } as Awaited<ReturnType<typeof getRealClients>>;
  }

  return getRealClients(userId);
}

async function getRealClients(userId: string) {
  const [foodToken, imToken, dineoutToken] = await Promise.all([
    getToken(userId, "food"),
    getToken(userId, "instamart"),
    getToken(userId, "dineout"),
  ]);

  if (!foodToken) throw new Error("Swiggy Food not connected. Please connect your account.");
  if (!imToken) throw new Error("Swiggy Instamart not connected.");
  if (!dineoutToken) throw new Error("Swiggy Dineout not connected.");

  const [foodClient, imClient, dineoutClient] = await Promise.all([
    createMcpClient("food", foodToken.accessToken),
    createMcpClient("instamart", imToken.accessToken),
    createMcpClient("dineout", dineoutToken.accessToken),
  ]);

  return { foodClient, imClient, dineoutClient };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Auth check
  const db = getServerClient();
  const { data: { user } } = await db.auth.getUser(
    req.headers.get("authorization")?.replace("Bearer ", "") ?? ""
  );
  const userId = user?.id ?? "anonymous";

  // Recipe resolution
  let recipe;
  try {
    const result = await getRecipe({
      dishName: parsed.data.dish,
      reelUrl: parsed.data.reelUrl,
      servings: parsed.data.servings,
    });
    recipe = result.recipe;
  } catch (err) {
    return NextResponse.json({ error: `Recipe resolution failed: ${String(err)}` }, { status: 422 });
  }

  // MCP clients
  let clients;
  try {
    clients = await getMcpClients(userId);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 401 });
  }

  // Run comparison
  let comparison: Comparison;
  try {
    comparison = await runComparison(clients, {
      recipe,
      addressId: parsed.data.addressId,
      city: parsed.data.city,
      vegOnly: parsed.data.vegOnly,
      dineoutLat: parsed.data.dineoutLat,
      dineoutLng: parsed.data.dineoutLng,
      dineoutAddressId: parsed.data.dineoutAddressId,
    });
  } catch (err) {
    return NextResponse.json({ error: `Comparison failed: ${String(err)}` }, { status: 500 });
  }

  // Persist for shareable URL (strip PII — no user addresses stored)
  const sharePayload = { ...comparison, addressId: "[redacted]" };
  await cacheSet(CACHE_KEYS.comparison(comparison.shareSlug), sharePayload, TTL.comparison);

  return NextResponse.json({ comparison });
}
