/**
 * Ingredient → Instamart SKU matcher (LLM-assisted, per-city cache).
 * Returns 2–4 SKU candidates per ingredient with per-serving cost.
 *
 * Pipeline:
 *   1. Check cache (sku:<city>:<ingredient>) — TTL 3 days
 *   2. search_products via Instamart MCP
 *   3. LLM picks best candidates + calculates usesPerPack
 *   4. Cache result
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Ingredient, SkuMatch, SkuCandidate, InstamartProduct } from "@/lib/types";
import { searchProducts } from "@/lib/mcp/instamart";
import { cacheGet, cacheSet } from "@/lib/cache/redis";
import { CACHE_KEYS, TTL } from "@/lib/cache/keys";

export interface MatcherContext {
  imClient: Client;
  addressId: string;
  city: string;
  recipeServings: number;
}

export async function matchIngredient(
  ingredient: Ingredient,
  ctx: MatcherContext
): Promise<SkuMatch> {
  const cacheKey = CACHE_KEYS.skuMatch(ctx.city, ingredient.name);
  const cached = await cacheGet<SkuMatch>(cacheKey);
  if (cached) return cached;

  // Fetch candidates from Instamart
  const products = await searchProducts(ctx.imClient, {
    addressId: ctx.addressId,
    query: ingredient.name,
  });

  if (!products || products.length === 0) {
    const result: SkuMatch = {
      ingredientName: ingredient.name,
      candidates: [],
      cacheKey,
      unavailable: true,
      substituteHint: `${ingredient.name} not available — try a substitute or uncheck this ingredient`,
    };
    await cacheSet(cacheKey, result, TTL.sku);
    return result;
  }

  // Use LLM to pick best candidates and compute usesPerPack
  const candidates = await rankCandidatesWithLLM(ingredient, products, ctx.recipeServings);

  const result: SkuMatch = {
    ingredientName: ingredient.name,
    candidates: candidates.slice(0, 4), // max 4 options per F-23
    cacheKey,
    unavailable: false,
  };

  await cacheSet(cacheKey, result, TTL.sku);
  return result;
}

async function rankCandidatesWithLLM(
  ingredient: Ingredient,
  products: InstamartProduct[],
  recipeServings: number
): Promise<SkuCandidate[]> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    // Fallback: return top products without LLM scoring
    return products.slice(0, 4).map((p) => ({
      productId: p.productId,
      brand: p.brand ?? "",
      packSize: p.packSize ?? "",
      price: p.price,
      perServingCost: p.price / 4, // rough heuristic
      usesPerPack: 4,
      imageUrl: p.imageUrl,
      spinId: p.spinId,
    }));
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  const prompt = `Recipe ingredient: ${ingredient.name}, quantity needed: ${ingredient.quantity}${ingredient.unit} for ${recipeServings} servings.

Available products (JSON):
${JSON.stringify(products.slice(0, 10), null, 2)}

For each suitable product, estimate how many times the pack covers this recipe (usesPerPack) and calculate perServingCost = price / usesPerPack.
Return JSON array (max 4, best match first):
[{ "productId": "...", "brand": "...", "packSize": "...", "price": number, "usesPerPack": number, "perServingCost": number, "spinId": "..." }]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json\n?/g, "").replace(/```/g, "");
    const ranked = JSON.parse(text) as Array<{
      productId: string;
      brand: string;
      packSize: string;
      price: number;
      usesPerPack: number;
      perServingCost: number;
      spinId: string;
    }>;

    return ranked.map((r) => {
      const original = products.find((p) => p.productId === r.productId);
      return {
        productId: r.productId,
        brand: r.brand,
        packSize: r.packSize,
        price: r.price,
        perServingCost: Math.round(r.perServingCost * 10) / 10,
        usesPerPack: r.usesPerPack,
        imageUrl: original?.imageUrl,
        spinId: r.spinId ?? original?.spinId,
      };
    });
  } catch {
    // Fallback to raw products
    return products.slice(0, 4).map((p) => ({
      productId: p.productId,
      brand: p.brand ?? "",
      packSize: p.packSize ?? "",
      price: p.price,
      perServingCost: p.price / 4,
      usesPerPack: 4,
      imageUrl: p.imageUrl,
      spinId: p.spinId,
    }));
  }
}

/** Match all non-pantry ingredients in parallel. */
export async function matchAllIngredients(
  ingredients: Ingredient[],
  ctx: MatcherContext
): Promise<SkuMatch[]> {
  const toMatch = ingredients.filter(
    (ing) => !ing.pantryDefault && !ing.optional
  );
  // Parallel matching
  return Promise.all(toMatch.map((ing) => matchIngredient(ing, ctx)));
}

/** Compute basket total from selected candidates. */
export function computeBasket(
  matches: SkuMatch[],
  selectedCandidates: Map<string, SkuCandidate>,
  pantryUnchecked: Set<string>
): { total: number; perServing: number; servings: number } {
  let total = 0;
  const servings = 1; // caller scales

  for (const match of matches) {
    if (pantryUnchecked.has(match.ingredientName)) continue;
    const selected =
      selectedCandidates.get(match.ingredientName) ?? match.candidates[0];
    if (selected) total += selected.price;
  }

  return { total: Math.round(total), perServing: Math.round(total / servings), servings };
}
