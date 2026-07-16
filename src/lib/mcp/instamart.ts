/**
 * Instamart MCP wrapper — typed calls for all 13 tools.
 * CRITICAL: update_cart REPLACES the entire cart (never merges).
 * Caller must always send the full cart state.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { callTool } from "./client";
import type { SwiggyAddress, InstamartProduct } from "@/lib/types";
import { loadFixture } from "./fixtures";

const USE_FIXTURES = process.env.USE_MCP_FIXTURES === "true";

// ─── Discover ─────────────────────────────────────────────────────────────────

export async function imGetAddresses(client: Client): Promise<SwiggyAddress[]> {
  if (USE_FIXTURES) return loadFixture("im-addresses");
  const data = await callTool(client, "get_addresses", {});
  // VALIDATE_LIVE: response schema undocumented
  return (data as { addresses?: SwiggyAddress[] })?.addresses
    ?? (data as unknown as SwiggyAddress[])
    ?? [];
}

export interface SearchProductsParams {
  addressId: string;
  query: string;
  offset?: number;
}

export async function searchProducts(
  client: Client,
  params: SearchProductsParams
): Promise<InstamartProduct[]> {
  if (USE_FIXTURES) return loadFixture<InstamartProduct[]>("im-products");
  const data = await callTool(client, "search_products", params as unknown as Record<string, unknown>);
  // VALIDATE_LIVE: product array key may differ
  return (data as { products?: InstamartProduct[] })?.products
    ?? (data as unknown as InstamartProduct[])
    ?? [];
}

export async function yourGoToItems(
  client: Client,
  params: { addressId: string; offset?: number }
): Promise<InstamartProduct[]> {
  const data = await callTool(client, "your_go_to_items", params);
  return (data as { products?: InstamartProduct[] })?.products
    ?? (data as unknown as InstamartProduct[])
    ?? [];
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface ImCart {
  items: Array<{ spinId: string; quantity: number; name?: string; price?: number }>;
  billTotal?: number;
  availablePaymentMethods?: string[];
  [key: string]: unknown;
}

export async function getImCart(client: Client): Promise<ImCart> {
  if (USE_FIXTURES) return loadFixture("im-cart");
  const data = await callTool<ImCart>(client, "get_cart", {});
  return data ?? { items: [] };
}

/**
 * CRITICAL: Sends the COMPLETE cart — this REPLACES, not appends.
 * Caller is responsible for maintaining the full cart state.
 */
export async function updateImCart(
  client: Client,
  params: {
    selectedAddressId: string;
    items: Array<{ spinId: string; quantity: number }>;
  }
): Promise<ImCart> {
  // GUARDRAILS: write call — caller must have confirmed with user
  const data = await callTool<ImCart>(client, "update_cart", params);
  return data ?? { items: [] };
}

export async function clearImCart(client: Client): Promise<void> {
  // GUARDRAILS: destructive — caller must confirm with user
  await callTool(client, "clear_cart", {});
}

// ─── Order ────────────────────────────────────────────────────────────────────

export interface ImCheckoutResult {
  orderId: string | string[];
  message: string;
  [key: string]: unknown;
}

export async function imCheckout(
  client: Client,
  params: { addressId: string; paymentMethod?: string }
): Promise<ImCheckoutResult> {
  // GUARDRAILS: 💸 SPENDS MONEY — single operation (place+confirm)
  // Caller must enforce confirm gate + spend cap
  return callTool<ImCheckoutResult>(client, "checkout", params);
}

export async function getImOrders(
  client: Client,
  params: { count?: number; orderType?: string; activeOnly?: boolean }
): Promise<unknown> {
  return callTool(client, "get_orders", params);
}

export async function getImOrderDetails(
  client: Client,
  params: { orderId: string }
): Promise<unknown> {
  return callTool(client, "get_order_details", params);
}

export async function trackImOrder(
  client: Client,
  params: { orderId: string; lat: number; lng: number }
): Promise<unknown> {
  return callTool(client, "track_order", params);
}

// ─── Address management ───────────────────────────────────────────────────────

export async function createImAddress(
  client: Client,
  params: {
    fullAddress: string;
    addressLine: string;
    addressLine2: string;
    city: string;
    postalCode: string;
    latitude: number;
    longitude: number;
    addressCategory: "HOME" | "WORK" | "OFFICE" | "FRIENDS_AND_FAMILY" | "OTHER";
    userName: string;
    userPhone: string;
    locality?: string;
    addressTag?: string;
    receiverName?: string;
    receiverPhone?: string;
  }
): Promise<SwiggyAddress> {
  return callTool<SwiggyAddress>(client, "create_address", params);
}
