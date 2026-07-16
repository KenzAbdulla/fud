/**
 * POST /api/cart/instamart — update Instamart cart (full replace)
 * GET  /api/cart/instamart — get current Instamart cart
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerClient } from "@/lib/db/supabase";
import { getToken } from "@/lib/auth/tokens";
import { createMcpClient } from "@/lib/mcp/client";
import { updateImCart, getImCart } from "@/lib/mcp/instamart";

const updateSchema = z.object({
  addressId: z.string().min(1),
  items: z.array(z.object({
    spinId: z.string(),
    quantity: z.number().int().min(0),
  })),
});

export async function GET(req: NextRequest) {
  const db = getServerClient();
  const { data: { user } } = await db.auth.getUser(
    req.headers.get("authorization")?.replace("Bearer ", "") ?? ""
  );
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const token = await getToken(user.id, "instamart");
  if (!token) return NextResponse.json({ error: "Instamart not connected" }, { status: 401 });

  const client = await createMcpClient("instamart", token.accessToken);
  const cart = await getImCart(client);
  return NextResponse.json({ cart });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getServerClient();
  const { data: { user } } = await db.auth.getUser(
    req.headers.get("authorization")?.replace("Bearer ", "") ?? ""
  );
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const token = await getToken(user.id, "instamart");
  if (!token) return NextResponse.json({ error: "Instamart not connected" }, { status: 401 });

  const client = await createMcpClient("instamart", token.accessToken);

  // GUARDRAILS #2: send FULL cart — this REPLACES, never merges
  const items = parsed.data.items.filter((i) => i.quantity > 0);
  const cart = await updateImCart(client, {
    selectedAddressId: parsed.data.addressId,
    items,
  });

  // Verify against what we sent
  const verified = await getImCart(client);
  return NextResponse.json({ cart, verified });
}
