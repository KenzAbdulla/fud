/**
 * POST /api/order/dineout/slots
 * Fetch available slots for a restaurant (7-day window).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerClient } from "@/lib/db/supabase";
import { getToken } from "@/lib/auth/tokens";
import { createMcpClient } from "@/lib/mcp/client";
import { getAvailableSlots } from "@/lib/mcp/dineout";
import { loadFixture } from "@/lib/mcp/fixtures";

const schema = z.object({
  restaurantId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  latitude: z.number(),
  longitude: z.number(),
});

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ slots: [] });

  if (process.env.USE_MCP_FIXTURES === "true") {
    return NextResponse.json({ slots: loadFixture("dineout-slots") });
  }

  const db = getServerClient();
  const { data: { user } } = await db.auth.getUser(
    req.headers.get("authorization")?.replace("Bearer ", "") ?? ""
  );
  if (!user) return NextResponse.json({ slots: [] });

  const token = await getToken(user.id, "dineout");
  if (!token) return NextResponse.json({ slots: [] });

  const client = await createMcpClient("dineout", token.accessToken);
  const slots = await getAvailableSlots(client, body.data);
  return NextResponse.json({ slots });
}
