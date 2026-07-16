/**
 * Recipe Service — the internal API.
 * Exposed via /api/recipe; separable for future B2B licensing (PRD F-07).
 *
 * Pipeline:
 *   1. Check dish-name cache (Redis key: recipe:dish:<normalized>)
 *   2. Check precomputed top-200 seeds
 *   3. LLM extraction (cheap model → large-model fallback on confidence < 0.8)
 *   4. Write to cache; instrument tier + confidence
 */

import crypto from "crypto";
import type { Recipe } from "@/lib/types";
import { cacheGet, cacheSet } from "@/lib/cache/redis";
import { CACHE_KEYS } from "@/lib/cache/keys";
import { lookupPrecomputed } from "./precomputed";
import { extractRecipe } from "./extractor";

export interface RecipeServiceInput {
  dishName?: string;
  reelUrl?: string;
  transcript?: string; // pre-computed by Whisper
  servings?: number;
}

export interface RecipeServiceResult {
  recipe: Recipe;
  cacheHit: boolean;
  tier: Recipe["extractedBy"];
}

export async function getRecipe(input: RecipeServiceInput): Promise<RecipeServiceResult> {
  const { dishName, reelUrl, transcript, servings } = input;

  // ── 1. Cache lookup ──────────────────────────────────────────────────────
  if (dishName) {
    const key = CACHE_KEYS.recipeDish(dishName);
    const cached = await cacheGet<Recipe>(key);
    if (cached) {
      const recipe = servings ? { ...cached, servings } : cached;
      return { recipe, cacheHit: true, tier: cached.extractedBy };
    }
  }

  if (reelUrl) {
    const key = CACHE_KEYS.recipeReel(reelUrl);
    const cached = await cacheGet<Recipe>(key);
    if (cached) {
      const recipe = servings ? { ...cached, servings } : cached;
      return { recipe, cacheHit: true, tier: cached.extractedBy };
    }
  }

  // ── 2. Precomputed seeds ─────────────────────────────────────────────────
  if (dishName) {
    const seed = lookupPrecomputed(dishName);
    if (seed) {
      const recipe: Recipe = {
        id: crypto.randomUUID(),
        source: { type: "dish_name" },
        extractedBy: "precomputed",
        confidence: 1.0,
        ...seed,
        servings: servings ?? seed.servings,
      };
      await cacheSet(CACHE_KEYS.recipeDish(dishName), recipe);
      return { recipe, cacheHit: false, tier: "precomputed" };
    }
  }

  // ── 3. LLM extraction ────────────────────────────────────────────────────
  if (!dishName && !transcript) {
    throw new Error("RecipeService: must provide dishName or transcript");
  }

  const { recipe: extracted, tier } = await extractRecipe({
    dishName,
    transcript,
  });

  const recipe: Recipe = {
    id: crypto.randomUUID(),
    source: reelUrl
      ? { type: "reel_link", url: reelUrl }
      : { type: "dish_name" },
    extractedBy: tier,
    confidence: extracted.confidence,
    dish: extracted.dish,
    servings: servings ?? extracted.servings,
    prepTimeMin: extracted.prepTimeMin,
    ingredients: extracted.ingredients,
    steps: extracted.steps,
  };

  // Persist to cache
  if (dishName) {
    await cacheSet(CACHE_KEYS.recipeDish(dishName), recipe);
  }
  if (reelUrl) {
    await cacheSet(CACHE_KEYS.recipeReel(reelUrl), recipe);
  }

  return { recipe, cacheHit: false, tier };
}

/** Adjust recipe for a different serving count (scales ingredient quantities) */
export function scaleRecipe(recipe: Recipe, newServings: number): Recipe {
  const factor = newServings / recipe.servings;
  return {
    ...recipe,
    servings: newServings,
    ingredients: recipe.ingredients.map((ing) => ({
      ...ing,
      quantity: Math.round(ing.quantity * factor * 10) / 10,
    })),
  };
}
