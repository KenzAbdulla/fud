/**
 * Idempotency key manager — GUARDRAILS #3.
 * Every checkout attempt gets a unique key. On timeout, query order status
 * BEFORE retrying — never blind-retry a write.
 *
 * Key lifecycle:
 *   generated → "pending" (set at pre-call)
 *   confirmed → "landed"  (set post-success or on status-check confirmation)
 *   TTL: 10 minutes (gives time to check status then retry if needed)
 */

import { nanoid } from "nanoid";
import { cacheGet, cacheSet } from "@/lib/cache/redis";
import { CACHE_KEYS, TTL } from "@/lib/cache/keys";

export type IdempotencyStatus = "pending" | "landed" | null;

/** Generate a fresh idempotency key for an order attempt. */
export function generateIdempotencyKey(): string {
  return `idem_${nanoid(21)}`;
}

/** Mark a key as "pending" — call this just before the write MCP call. */
export async function markPending(key: string): Promise<void> {
  await cacheSet(CACHE_KEYS.idempotency(key), "pending", TTL.idempotency);
}

/** Mark a key as "landed" — call this after confirmed order/booking. */
export async function markLanded(key: string): Promise<void> {
  await cacheSet(CACHE_KEYS.idempotency(key), "landed", TTL.idempotency);
}

/** Check current status of an idempotency key. */
export async function getIdempotencyStatus(key: string): Promise<IdempotencyStatus> {
  const status = await cacheGet<string>(CACHE_KEYS.idempotency(key));
  return (status as IdempotencyStatus) ?? null;
}

/** Safe retry helper: returns true only if it's safe to retry the write. */
export async function isSafeToRetry(key: string): Promise<boolean> {
  const status = await getIdempotencyStatus(key);
  // null = key expired or never set — safe to retry
  // "pending" = previous call timed out — MUST check order status first
  return status === null;
}
