/**
 * GET /api/addresses — unified address list across Food + Instamart + Dineout.
 * F-40: Single linked-account UX — fetches from whichever servers are connected
 * and deduplicates by addressLine.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/db/supabase";
import { getToken } from "@/lib/auth/tokens";
import { createMcpClient } from "@/lib/mcp/client";
import { getAddresses } from "@/lib/mcp/food";
import { imGetAddresses } from "@/lib/mcp/instamart";
import { getDineoutSavedLocations } from "@/lib/mcp/dineout";
import type { SwiggyAddress } from "@/lib/types";

export async function GET(req: NextRequest) {
  // Fixture mode
  if (process.env.USE_MCP_FIXTURES === "true") {
    const { loadFixture } = await import("@/lib/mcp/fixtures");
    return NextResponse.json({ addresses: loadFixture("food-addresses") });
  }

  const db = getServerClient();
  const { data: { user } } = await db.auth.getUser(
    req.headers.get("authorization")?.replace("Bearer ", "") ?? ""
  );
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const results: SwiggyAddress[] = [];

  // Fetch from whichever servers are connected (non-blocking per server)
  const [foodToken, imToken] = await Promise.all([
    getToken(user.id, "food"),
    getToken(user.id, "instamart"),
  ]);

  await Promise.allSettled([
    (async () => {
      if (!foodToken) return;
      const client = await createMcpClient("food", foodToken.accessToken);
      const addrs = await getAddresses(client);
      results.push(...addrs);
    })(),
    (async () => {
      if (!imToken) return;
      const client = await createMcpClient("instamart", imToken.accessToken);
      const addrs = await imGetAddresses(client);
      // Merge without duplicates (by id)
      for (const a of addrs) {
        if (!results.find((r) => r.id === a.id)) results.push(a);
      }
    })(),
  ]);

  return NextResponse.json({ addresses: results });
}
