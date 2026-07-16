import crypto from "crypto";
import { normalizeIngredient } from "@/lib/utils";

export const CACHE_KEYS = {
  recipeDish: (dish: string) =>
    `recipe:dish:${dish.toLowerCase().trim().replace(/\s+/g, "_")}`,

  recipeReel: (url: string) =>
    `recipe:reel:${crypto.createHash("sha256").update(url).digest("hex").slice(0, 16)}`,

  skuMatch: (city: string, ingredient: string) =>
    `sku:${city.toLowerCase()}:${normalizeIngredient(ingredient)}`,

  idempotency: (key: string) => `idempotency:${key}`,

  comparison: (slug: string) => `comparison:${slug}`,

  spendDaily: (userId: string, date: string) =>
    `spend:daily:${userId}:${date}`,
} as const;

// TTLs in seconds
export const TTL = {
  recipe: undefined,           // permanent
  sku: 3 * 24 * 60 * 60,      // 3 days
  idempotency: 10 * 60,        // 10 minutes
  comparison: 24 * 60 * 60,   // 24 hours
  spendDaily: 24 * 60 * 60,   // 24 hours
} as const;
