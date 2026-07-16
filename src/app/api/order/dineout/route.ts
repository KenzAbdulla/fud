/**
 * POST /api/order/dineout
 * Book a table. Free reservations only (isFree=true slots).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerClient } from "@/lib/db/supabase";
import { getToken } from "@/lib/auth/tokens";
import { createMcpClient } from "@/lib/mcp/client";
import { bookTable, getBookingStatus } from "@/lib/mcp/dineout";
import { markPending, markLanded, getIdempotencyStatus } from "@/lib/guards/idempotency";

const schema = z.object({
  restaurantId: z.string().min(1),
  slotId: z.number().int(),
  itemId: z.string().min(1),
  reservationTime: z.number().int(),
  guestCount: z.number().int().min(1).max(20),
  latitude: z.number(),
  longitude: z.number(),
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

  const { restaurantId, slotId, itemId, reservationTime, guestCount, latitude, longitude, idempotencyKey } = parsed.data;

  const db = getServerClient();
  const { data: { user } } = await db.auth.getUser(
    req.headers.get("authorization")?.replace("Bearer ", "") ?? ""
  );
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  // Idempotency — for booking, check status if pending
  const existingStatus = await getIdempotencyStatus(idempotencyKey);
  if (existingStatus === "landed") {
    return NextResponse.json({ error: "Booking already placed" }, { status: 409 });
  }
  if (existingStatus === "pending") {
    const token = await getToken(user.id, "dineout");
    if (token) {
      const client = await createMcpClient("dineout", token.accessToken);
      // Try to find the booking status — we need an orderId
      // Since we don't have it, return a helpful message
      return NextResponse.json(
        { error: "Previous booking attempt timed out. Check your Swiggy app for booking status." },
        { status: 409 }
      );
    }
  }

  const token = await getToken(user.id, "dineout");
  if (!token) return NextResponse.json({ error: "Dineout not connected" }, { status: 401 });
  const client = await createMcpClient("dineout", token.accessToken);

  await markPending(idempotencyKey);
  let bookingResult;
  try {
    bookingResult = await bookTable(client, {
      restaurantId,
      slotId,
      itemId,
      reservationTime,
      guestCount,
      latitude,
      longitude,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Booking failed. Check the Swiggy app for status.", details: String(err) },
      { status: 500 }
    );
  }
  await markLanded(idempotencyKey);

  // Fetch confirmed booking status
  let bookingStatus;
  try {
    bookingStatus = await getBookingStatus(client, { orderId: bookingResult.orderId });
  } catch {
    bookingStatus = null;
  }

  await db.from("write_audit").insert({
    user_id: user.id,
    tool: "book_table",
    idempotency_key: idempotencyKey,
    confirmed_at: new Date().toISOString(),
    guard_result: "allow",
    spend_inr: 0, // free reservation
  });

  return NextResponse.json({ booking: bookingResult, status: bookingStatus });
}
