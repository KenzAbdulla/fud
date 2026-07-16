/**
 * POST /api/order/food
 * Place a food order. Enforces all GUARDRAILS before the write call.
 *
 * Required: explicit user confirmation flag in the request body (client must
 * set this only after showing the pre-checkout confirmation screen).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerClient } from "@/lib/db/supabase";
import { getToken } from "@/lib/auth/tokens";
import { createMcpClient } from "@/lib/mcp/client";
import {
  updateFoodCart,
  applyFoodCoupon,
  getFoodCart,
  placeFoodOrder,
  getFoodOrders,
} from "@/lib/mcp/food";
import {
  evaluate,
  blockMessage,
  recordSpend,
  getTodaySpend,
  DEFAULT_GUARD,
} from "@/lib/guards/spend-cap";
import {
  markPending,
  markLanded,
  getIdempotencyStatus,
} from "@/lib/guards/idempotency";

const schema = z.object({
  addressId: z.string().min(1),
  restaurantId: z.string().min(1),
  restaurantName: z.string().optional(),
  cartItems: z.array(z.object({
    productId: z.string(),
    name: z.string(),
    quantity: z.number().int().min(1),
    price: z.number(),
    variant: z.string().optional(),
    addons: z.array(z.string()).optional(),
    variations: z.unknown().optional(),
    variantsV2: z.unknown().optional(),
  })),
  couponCode: z.string().optional(),
  paymentMethod: z.string().optional(),
  idempotencyKey: z.string().min(1),
  /** Client sets this to true only AFTER showing the confirmation screen */
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

  const {
    addressId,
    restaurantId,
    restaurantName,
    cartItems,
    couponCode,
    paymentMethod,
    idempotencyKey,
  } = parsed.data;

  // ─── Auth ─────────────────────────────────────────────────────────────────
  const db = getServerClient();
  const { data: { user } } = await db.auth.getUser(
    req.headers.get("authorization")?.replace("Bearer ", "") ?? ""
  );
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  // ─── Idempotency check ────────────────────────────────────────────────────
  const existingStatus = await getIdempotencyStatus(idempotencyKey);
  if (existingStatus === "landed") {
    return NextResponse.json({ error: "Order already placed with this key" }, { status: 409 });
  }
  if (existingStatus === "pending") {
    // Previous call timed out — check order status before allowing retry
    const token = await getToken(user.id, "food");
    if (token) {
      const client = await createMcpClient("food", token.accessToken);
      const orders = await getFoodOrders(client, { addressId });
      return NextResponse.json(
        { error: "Previous order attempt timed out. Check your orders.", orders },
        { status: 409 }
      );
    }
  }

  // ─── Spend guard ──────────────────────────────────────────────────────────
  const orderTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const spentToday = await getTodaySpend(user.id);
  const guardState = { ...DEFAULT_GUARD, spentTodayINR: spentToday };
  const guardResult = evaluate(guardState, orderTotal);

  if (guardResult !== "allow") {
    return NextResponse.json(
      { error: blockMessage(guardResult, guardState), guardResult },
      { status: 422 }
    );
  }

  // ─── Get MCP client ───────────────────────────────────────────────────────
  const token = await getToken(user.id, "food");
  if (!token) return NextResponse.json({ error: "Swiggy Food not connected" }, { status: 401 });

  const client = await createMcpClient("food", token.accessToken);

  // ─── Build cart ───────────────────────────────────────────────────────────
  await updateFoodCart(client, {
    restaurantId,
    restaurantName,
    addressId,
    cartItems: cartItems as Parameters<typeof updateFoodCart>[1]["cartItems"],
  });

  // ─── Verify cart ──────────────────────────────────────────────────────────
  const verifiedCart = await getFoodCart(client, { addressId, restaurantName });
  const liveTotal = verifiedCart.total ?? 0;

  // Re-check spend guard with live total (fees may be higher than dish price)
  const liveGuard = evaluate(guardState, liveTotal);
  if (liveGuard !== "allow") {
    return NextResponse.json(
      { error: blockMessage(liveGuard, guardState) + ` (including fees: ₹${liveTotal})`, liveTotal },
      { status: 422 }
    );
  }

  // ─── Apply coupon ─────────────────────────────────────────────────────────
  if (couponCode) {
    await applyFoodCoupon(client, { couponCode, addressId });
  }

  // ─── Place order ──────────────────────────────────────────────────────────
  await markPending(idempotencyKey);

  let orderResult;
  try {
    orderResult = await placeFoodOrder(client, { addressId, paymentMethod });
  } catch (err) {
    // Do NOT retry — client must check order status
    return NextResponse.json(
      { error: "Order placement failed. Check your orders before retrying.", details: String(err) },
      { status: 500 }
    );
  }

  await markLanded(idempotencyKey);

  // ─── Record spend + audit log ─────────────────────────────────────────────
  await recordSpend(user.id, liveTotal);
  await db.from("write_audit").insert({
    user_id: user.id,
    tool: "place_food_order",
    idempotency_key: idempotencyKey,
    confirmed_at: new Date().toISOString(),
    guard_result: "allow",
    spend_inr: liveTotal,
  });

  return NextResponse.json({ order: orderResult, cart: verifiedCart });
}
