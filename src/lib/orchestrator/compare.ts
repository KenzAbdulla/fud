/**
 * Comparison orchestrator — fans out to all 3 legs in parallel.
 * Deterministic code only; no LLM here.
 *
 * Each leg resolves independently — a failure in one leg never blocks others.
 * Results are streamed progressively to the UI (via server-sent events).
 */

import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type {
  Recipe,
  Comparison,
  ComparisonLegs,
  FoodOption,
  DineoutOption,
} from "@/lib/types";
import { searchMenu } from "@/lib/mcp/food";
import { searchDineout } from "@/lib/mcp/dineout";
import { matchAllIngredients } from "@/lib/matching/ingredient-matcher";
import { nanoid } from "nanoid";
import { slugify } from "@/lib/utils";

interface OrchestatorClients {
  foodClient: Client;
  imClient: Client;
  dineoutClient: Client;
}

interface OrchestatorParams {
  recipe: Recipe;
  addressId: string;
  city: string;
  vegOnly?: boolean;
  dineoutLat?: number;
  dineoutLng?: number;
  dineoutAddressId?: string;
}

/** Run all 3 legs; reject only propagates individually. */
export async function runComparison(
  clients: OrchestatorClients,
  params: OrchestatorParams
): Promise<Comparison> {
  const { recipe, addressId, city, vegOnly } = params;

  const [orderResult, dineoutResult, cookResult] = await Promise.allSettled([
    runOrderLeg(clients.foodClient, recipe, addressId, vegOnly),
    runDineoutLeg(clients.dineoutClient, recipe, params.dineoutLat, params.dineoutLng, params.dineoutAddressId),
    runCookLeg(clients.imClient, recipe, addressId, city),
  ]);

  const legs: ComparisonLegs = {
    order:
      orderResult.status === "fulfilled"
        ? orderResult.value
        : { options: [], headlineCost: 0, feeDisclaimer: true, status: "error", error: String(orderResult.reason) },
    dineout:
      dineoutResult.status === "fulfilled"
        ? dineoutResult.value
        : { options: [], status: "error", error: String(dineoutResult.reason) },
    cook:
      cookResult.status === "fulfilled"
        ? cookResult.value
        : { basketTotal: 0, perServing: 0, prepTimeMin: recipe.prepTimeMin, matches: [], status: "error", error: String(cookResult.reason) },
  };

  const slug = `${slugify(recipe.dish)}-${nanoid(6)}`;

  return {
    id: nanoid(),
    recipeId: recipe.id,
    recipe,
    addressId,
    legs,
    createdAt: new Date().toISOString(),
    shareSlug: slug,
  };
}

// ─── Order leg ────────────────────────────────────────────────────────────────

async function runOrderLeg(
  client: Client,
  recipe: Recipe,
  addressId: string,
  vegOnly?: boolean
): Promise<ComparisonLegs["order"]> {
  const { items } = await searchMenu(client, {
    addressId,
    query: recipe.dish,
    vegFilter: vegOnly ? 1 : 0,
  });

  if (!items || items.length === 0) {
    return { options: [], headlineCost: 0, feeDisclaimer: true, status: "empty" };
  }

  // Strip to needed fields before UI
  const options: FoodOption[] = items.map((item) => ({
    restaurantId: item.restaurantId,
    restaurantName: item.restaurantName,
    dishName: item.name,
    price: item.price,
    isVeg: item.isVeg ?? true,
    rating: item.rating,
    ratingCount: item.ratingCount,
    deliveryEtaMin: item.deliveryEtaMin,
    distanceKm: item.distanceKm,
    imageUrl: item.imageUrl,
    rawItem: item,
  }));

  // Sort by price ascending (client-side, deterministic, F-13)
  options.sort((a, b) => a.price - b.price);

  const headlineCost = options[0]?.price ?? 0;
  const etaMin = options[0]?.deliveryEtaMin;

  return {
    options: options.slice(0, 10), // cap for UI
    headlineCost,
    feeDisclaimer: true, // always until live validation
    etaMin,
    status: "ready",
  };
}

// ─── Dineout leg ──────────────────────────────────────────────────────────────

async function runDineoutLeg(
  client: Client,
  recipe: Recipe,
  lat?: number,
  lng?: number,
  addressId?: string
): Promise<ComparisonLegs["dineout"]> {
  const params: Parameters<typeof searchDineout>[1] = {
    query: recipe.dish,
    entityType: "CUISINE",
    ...(addressId ? { addressId } : {}),
    ...(lat !== undefined && lng !== undefined ? { latitude: lat, longitude: lng } : {}),
  };

  const restaurants = await searchDineout(client, params);

  if (!restaurants || restaurants.length === 0) {
    return { options: [], status: "empty" };
  }

  const options: DineoutOption[] = restaurants.map((r) => ({
    restaurantId: r.restaurantId,
    restaurantName: r.name,
    costForTwo: r.costForTwo ?? 0,
    distanceKm: r.distanceKm,
    rating: r.rating,
    ratingCount: r.ratingCount,
    offers: r.offers ?? [],
    cuisines: r.cuisines ?? [],
    imageUrl: r.imageUrl,
    latitude: r.latitude,
    longitude: r.longitude,
  }));

  // Sort by costForTwo ascending
  options.sort((a, b) => a.costForTwo - b.costForTwo);

  return { options: options.slice(0, 5), status: "ready" };
}

// ─── Cook leg ─────────────────────────────────────────────────────────────────

async function runCookLeg(
  client: Client,
  recipe: Recipe,
  addressId: string,
  city: string
): Promise<ComparisonLegs["cook"]> {
  const matches = await matchAllIngredients(recipe.ingredients, {
    imClient: client,
    addressId,
    city,
    recipeServings: recipe.servings,
  });

  const basketTotal = matches.reduce((sum, m) => {
    const cheapest = m.candidates.sort((a, b) => a.price - b.price)[0];
    return sum + (cheapest?.price ?? 0);
  }, 0);

  const perServing = Math.round(basketTotal / recipe.servings);

  return {
    basketTotal,
    perServing,
    prepTimeMin: recipe.prepTimeMin,
    matches,
    status: "ready",
  };
}
