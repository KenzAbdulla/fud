/**
 * Cache layer — Upstash Redis with in-memory fallback.
 * Falls back to a simple Map when UPSTASH_REDIS_REST_URL is not set,
 * so the app boots locally without Redis configured.
 *
 * Cache keys:
 *   recipe:dish:<normalized>        → Recipe JSON (permanent)
 *   recipe:reel:<url_hash>          → Recipe JSON (permanent)
 *   sku:<city>:<normalized_ing>     → SkuMatch[] (TTL: 3 days)
 *   idempotency:<key>               → "pending"|"landed" (TTL: 10 min)
 *   comparison:<slug>               → Comparison JSON (TTL: 24h)
 */

let redis: import("@upstash/redis").Redis | null = null;

async function getRedis() {
  if (redis) return redis;
  if (!process.env.UPSTASH_REDIS_REST_URL) return null;

  const { Redis } = await import("@upstash/redis");
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return redis;
}

// ─── In-memory fallback ────────────────────────────────────────────────────────

const memStore = new Map<string, { value: string; expiresAt?: number }>();

function memGet(key: string): string | null {
  const entry = memStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    memStore.delete(key);
    return null;
  }
  return entry.value;
}

function memSet(key: string, value: string, ttlSeconds?: number): void {
  memStore.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = await getRedis();
  if (r) {
    const raw = await r.get<string>(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }
  // fallback
  const raw = memGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const serialized = JSON.stringify(value);
  const r = await getRedis();
  if (r) {
    if (ttlSeconds) {
      await r.set(key, serialized, { ex: ttlSeconds });
    } else {
      await r.set(key, serialized);
    }
    return;
  }
  memSet(key, serialized, ttlSeconds);
}

export async function cacheDel(key: string): Promise<void> {
  const r = await getRedis();
  if (r) {
    await r.del(key);
    return;
  }
  memStore.delete(key);
}
