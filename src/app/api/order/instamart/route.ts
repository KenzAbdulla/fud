/**
 * POST /api/order/instamart
 * Instamart checkout. Sends FULL cart state (replace semantics).
 * All GUARDRAILS enforced before the write.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerClient } from "@/lib/db/supabase";
import { getToken } from "@/lib/auth/tokens";
import { createMcpClient } from "@/lib/mcp/client";
import { updateImCart, getImCart, imCheckout, getImOrders } from "@/lib/mcp/instamart";
import { evaluate, blockMessage, recordSpend, getTodaySpend, DEFAULT_GUARD } from "@/lib/guards/spend-cap";
import { markPending, markLanded, getIdempotencyStatus } from "@/lib/guards/idempotency";

const schema = z.object({
  addressId: z.string().min(1),
  items: z.array(z.object({
    spinId: z.string(),
    quantity: z.number().int().min(1),
  })).min(1),
  paymentMethod: z.string().optional(),
  idempotencyKey: z.string().min(1),
  userConfirmed: z.literal(true),
});

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

  const { addressId, items, paymentMethod, idempotencyKey } = parsed.data;

  // Auth
  const db = getServerClient();
  const { data: { user } } = await db.auth.getUser(
    req.headers.get("authorization")?.replace("Bearer ", "") ?? ""
  );
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  // Idempotency
  const existingStatus = await getIdempotencyStatus(idempotencyKey);
  if (existingStatus === "landed") {
    return NextResponse.json({ error: "Order already placed" }, { status: 409 });
  }
  if (existingStatus === "pending") {
    const token = await getToken(user.id, "instamart");
    if (token) {
      const client = await createMcpClient("instamart", token.accessToken);
      const orders = await getImOrders(client, { activeOnly: true });
      return NextResponse.json(
        { error: "Previous checkout timed out. Check your orders before retrying.", orders },
        { status: 409 }
      );
    }
  }

  const token = await getToken(user.id, "instamart");
  if (!token) return NextResponse.json({ error: "Instamart not connected" }, { status: 401 });
  const client = await createMcpClient("instamart", token.accessToken);

  // Send full cart (REPLACES — never partial)
  await updateImCart(client, { selectedAddressId: addressId, items });

  // Verify cart against local model
  const liveCart = await getImCart(client);
  const liveTotal = liveCart.billTotal ?? 0;

  // Spend guard
  const spentToday = await getTodaySpend(user.id);
  const guardState = { ...DEFAULT_GUARD, spentTodayINR: spentToday };
  const guardResult = evaluate(guardState, liveTotal);
  if (guardResult !== "allow") {
    return NextResponse.json(
      { error: blockMessage(guardResult, guardState), liveTotal },
      { status: 422 }
    );
  }

  // Checkout
  await markPending(idempotencyKey);
  let checkoutResult;
  try {
    checkoutResult = await imCheckout(client, { addressId, paymentMethod });
  } catch (err) {
    return NextResponse.json(
      { error: "Checkout failed. Check your orders before retrying.", details: String(err) },
      { status: 500 }
    );
  }
  await markLanded(idempotencyKey);

  await recordSpend(user.id, liveTotal);
  await db.from("write_audit").insert({
    user_id: user.id,
    tool: "instamart_checkout",
    idempotency_key: idempotencyKey,
    confirmed_at: new Date().toISOString(),
    guard_result: "allow",
    spend_inr: liveTotal,
  });

  return NextResponse.json({ order: checkoutResult, cart: liveCart });
}
