/**
 * Food MCP wrapper — typed calls for all 14 tools.
 * Response schemas marked VALIDATE_LIVE are unverified; log real payloads
 * during dev and update FOOD_API.md accordingly.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { callTool } from "./client";
import type {
  SwiggyAddress,
  FoodSearchItem,
  CartItem,
} from "@/lib/types";
import { loadFixture } from "./fixtures";

const USE_FIXTURES = process.env.USE_MCP_FIXTURES === "true";

// ─── Discover ─────────────────────────────────────────────────────────────────

export async function getAddresses(client: Client): Promise<SwiggyAddress[]> {
  if (USE_FIXTURES) return loadFixture("food-addresses");
  const data = await callTool<{ addresses: SwiggyAddress[] }>(client, "get_addresses", {});
  // VALIDATE_LIVE: actual response shape may differ
  return data?.addresses ?? (data as unknown as SwiggyAddress[]) ?? [];
}

export interface SearchMenuParams {
  addressId: string;
  query: string;
  restaurantIdOfAddedItem?: string;
  vegFilter?: 0 | 1;
  offset?: number;
}

export interface SearchMenuResult {
  items: FoodSearchItem[];
  nextOffset?: number;
}

export async function searchMenu(
  client: Client,
  params: SearchMenuParams
): Promise<SearchMenuResult> {
  if (USE_FIXTURES) {
    const items = loadFixture<FoodSearchItem[]>("food-search");
    return { items };
  }
  const data = await callTool<SearchMenuResult>(client, "search_menu", {
    addressId: params.addressId,
    query: params.query,
    ...(params.restaurantIdOfAddedItem
      ? { restaurantIdOfAddedItem: params.restaurantIdOfAddedItem }
      : {}),
    ...(params.vegFilter !== undefined ? { vegFilter: params.vegFilter } : {}),
    ...(params.offset !== undefined ? { offset: params.offset } : {}),
  });
  // VALIDATE_LIVE: items array key may differ
  return {
    items: (data as unknown as { items?: FoodSearchItem[] })?.items ?? (data as unknown as FoodSearchItem[]) ?? [],
    nextOffset: (data as unknown as { nextOffset?: number })?.nextOffset,
  };
}

export async function searchRestaurants(
  client: Client,
  params: { addressId: string; query: string; offset?: number }
): Promise<{ restaurants: unknown[]; nextOffset?: number }> {
  if (USE_FIXTURES) return { restaurants: loadFixture("food-restaurants") };
  return callTool(client, "search_restaurants", params);
}

export async function getRestaurantMenu(
  client: Client,
  params: { addressId: string; restaurantId: string; page?: number; pageSize?: number }
): Promise<unknown> {
  if (USE_FIXTURES) return loadFixture("food-menu");
  return callTool(client, "get_restaurant_menu", params);
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface FoodCart {
  items: CartItem[];
  total?: number;
  fees?: number;
  validAddons?: Record<string, unknown>;
  availablePaymentMethods?: string[];
  couponApplied?: boolean;
  couponDiscount?: number;
  [key: string]: unknown;
}

export async function getFoodCart(
  client: Client,
  params: { addressId: string; restaurantName?: string }
): Promise<FoodCart> {
  if (USE_FIXTURES) return loadFixture("food-cart");
  const data = await callTool<FoodCart>(client, "get_food_cart", params);
  return data ?? {};
}

export async function updateFoodCart(
  client: Client,
  params: {
    restaurantId: string;
    cartItems: CartItem[];
    addressId: string;
    restaurantName?: string;
  }
): Promise<FoodCart> {
  // GUARDRAILS: write call — caller must have confirmed with user
  const data = await callTool<FoodCart>(client, "update_food_cart", params);
  return data ?? {};
}

export async function fetchFoodCoupons(
  client: Client,
  params: { restaurantId: string; addressId: string; couponCode?: string }
): Promise<unknown[]> {
  if (USE_FIXTURES) return loadFixture("food-coupons");
  const data = await callTool(client, "fetch_food_coupons", params);
  // VALIDATE_LIVE: coupon response shape unknown
  return Array.isArray(data) ? data : (data as { coupons?: unknown[] })?.coupons ?? [];
}

export async function applyFoodCoupon(
  client: Client,
  params: { couponCode: string; addressId: string; cartId?: string }
): Promise<FoodCart> {
  // GUARDRAILS: write call
  return callTool<FoodCart>(client, "apply_food_coupon", params);
}

export async function flushFoodCart(client: Client): Promise<void> {
  // GUARDRAILS: write call
  await callTool(client, "flush_food_cart", {});
}

// ─── Order ────────────────────────────────────────────────────────────────────

export interface PlaceOrderResult {
  orderId: string;
  message: string;
  [key: string]: unknown;
}

export async function placeFoodOrder(
  client: Client,
  params: { addressId: string; paymentMethod?: string }
): Promise<PlaceOrderResult> {
  // GUARDRAILS: 💸 SPENDS MONEY — caller must enforce confirm gate + spend cap
  return callTool<PlaceOrderResult>(client, "place_food_order", params);
}

export async function getFoodOrders(
  client: Client,
  params: { addressId: string; orderCount?: number }
): Promise<unknown> {
  // VALIDATE_LIVE: response schema undocumented
  return callTool(client, "get_food_orders", params);
}

export async function getFoodOrderDetails(
  client: Client,
  params: { orderId: string }
): Promise<unknown> {
  // VALIDATE_LIVE: response schema undocumented
  return callTool(client, "get_food_order_details", params);
}

export async function trackFoodOrder(
  client: Client,
  params: { orderId?: string }
): Promise<unknown> {
  // VALIDATE_LIVE: status values, ETA format not specified
  return callTool(client, "track_food_order", params);
}
