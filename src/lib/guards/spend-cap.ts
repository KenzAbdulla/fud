/**
 * SpendGuard — enforces per-order and daily spend caps before any write call.
 * Defaults: ₹1000/order, ₹2500/day (user-configurable, stored in Supabase).
 *
 * GUARDRAILS #4: enforced client-side AND server-side before MCP call.
 * Platform hard cap: ₹1000/order for Swiggy MCP beta (F-18 + FOOD_API.md).
 */

import type { SpendGuardResult, SpendGuardState } from "@/lib/types";
import { cacheGet, cacheSet } from "@/lib/cache/redis";
import { CACHE_KEYS, TTL } from "@/lib/cache/keys";

const PLATFORM_CAP_INR = 1000; // Swiggy MCP beta hard limit

export const DEFAULT_GUARD: SpendGuardState = {
  perOrderCapINR: 1000,
  dailyCapINR: 2500,
  spentTodayINR: 0,
};

/** Evaluate whether a proposed spend is within caps. */
export function evaluate(
  state: SpendGuardState,
  proposedINR: number
): SpendGuardResult {
  if (proposedINR > PLATFORM_CAP_INR) return "block_per_order";
  if (proposedINR > state.perOrderCapINR) return "block_per_order";
  if (state.spentTodayINR + proposedINR > state.dailyCapINR) return "block_daily";
  return "allow";
}

/** Friendly error message for a blocked spend. */
export function blockMessage(result: SpendGuardResult, state: SpendGuardState): string {
  if (result === "block_per_order") {
    return `Order total exceeds your ₹${state.perOrderCapINR} per-order cap. Use the Swiggy app for larger orders.`;
  }
  const remaining = state.dailyCapINR - state.spentTodayINR;
  return `Daily spend cap reached (₹${state.dailyCapINR}/day). Remaining today: ₹${remaining}.`;
}

/** Record a completed spend against the daily total. */
export async function recordSpend(userId: string, amountINR: number): Promise<void> {
  const date = new Date().toISOString().split("T")[0];
  const key = CACHE_KEYS.spendDaily(userId, date);
  const current = (await cacheGet<number>(key)) ?? 0;
  await cacheSet(key, current + amountINR, TTL.spendDaily);
}

/** Get today's spend total for a user. */
export async function getTodaySpend(userId: string): Promise<number> {
  const date = new Date().toISOString().split("T")[0];
  const key = CACHE_KEYS.spendDaily(userId, date);
  return (await cacheGet<number>(key)) ?? 0;
}
