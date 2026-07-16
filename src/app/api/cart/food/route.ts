/**
 * POST /api/cart/food/coupons — fetch coupons for a restaurant
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerClient } from "@/lib/db/supabase";
import { getToken } from "@/lib/auth/tokens";
import { createMcpClient } from "@/lib/mcp/client";
import { fetchFoodCoupons } from "@/lib/mcp/food";

const schema = z.object({
  restaurantId: z.string().min(1),
  addressId: z.string().min(1),
  couponCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ coupons: [] });

  const db = getServerClient();
  const { data: { user } } = await db.auth.getUser(
    req.headers.get("authorization")?.replace("Bearer ", "") ?? ""
  );

  if (!user) {
    // In dev/fixture mode, return fixture coupons
    if (process.env.USE_MCP_FIXTURES === "true") {
      const { loadFixture } = await import("@/lib/mcp/fixtures");
      return NextResponse.json({ coupons: loadFixture("food-coupons") });
    }
    return NextResponse.json({ coupons: [] });
  }

  const token = await getToken(user.id, "food");
  if (!token) return NextResponse.json({ coupons: [] });

  const client = await createMcpClient("food", token.accessToken);
  const coupons = await fetchFoodCoupons(client, body.data);
  return NextResponse.json({ coupons });
}
