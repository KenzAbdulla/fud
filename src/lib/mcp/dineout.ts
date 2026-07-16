/**
 * Dineout MCP wrapper — typed calls for all 8 tools.
 * Free reservations only: book_table rejects paid/prime deals.
 * Coordinates required for most calls — sourced from get_saved_locations.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { callTool } from "./client";
import type { DineoutRestaurant, DineoutSlot } from "@/lib/types";
import { loadFixture } from "./fixtures";

const USE_FIXTURES = process.env.USE_MCP_FIXTURES === "true";

export interface SearchDineoutParams {
  query: string;
  entityType?: "locality" | "CUISINE" | "RESTAURANT_CATEGORY";
  addressId?: string;
  latitude?: number;
  longitude?: number;
}

export async function searchDineout(
  client: Client,
  params: SearchDineoutParams
): Promise<DineoutRestaurant[]> {
  if (USE_FIXTURES) return loadFixture<DineoutRestaurant[]>("dineout-search");
  const data = await callTool(client, "search_restaurants_dineout", params as unknown as Record<string, unknown>);
  // VALIDATE_LIVE: response shape undocumented
  return (data as { restaurants?: DineoutRestaurant[] })?.restaurants
    ?? (data as unknown as DineoutRestaurant[])
    ?? [];
}

export async function getDineoutSavedLocations(client: Client): Promise<
  Array<{ id: string; addressLine: string; latitude?: number; longitude?: number }>
> {
  if (USE_FIXTURES) return loadFixture("dineout-locations");
  const data = await callTool(client, "get_saved_locations", {});
  const locations = (data as { locations?: Array<{ id: string; addressLine: string; latitude?: number; longitude?: number }> })?.locations
    ?? (data as unknown as Array<{ id: string; addressLine: string; latitude?: number; longitude?: number }>)
    ?? [];
  return locations;
}

export async function getRestaurantDetails(
  client: Client,
  params: { restaurantId: string; latitude: number; longitude: number }
): Promise<DineoutRestaurant> {
  if (USE_FIXTURES) return loadFixture("dineout-details");
  return callTool<DineoutRestaurant>(client, "get_restaurant_details", params);
}

export async function getAvailableSlots(
  client: Client,
  params: {
    restaurantId: string;
    date: string;  // YYYY-MM-DD
    latitude: number;
    longitude: number;
  }
): Promise<DineoutSlot[]> {
  if (USE_FIXTURES) return loadFixture<DineoutSlot[]>("dineout-slots");
  const data = await callTool(client, "get_available_slots", params);
  return (data as { slots?: DineoutSlot[] })?.slots
    ?? (data as unknown as DineoutSlot[])
    ?? [];
}

export interface BookTableParams {
  restaurantId: string;
  slotId: number;
  itemId: string;          // "restaurantId-ticketId"
  reservationTime: number; // unix epoch
  guestCount: number;      // 1-20
  latitude: number;
  longitude: number;
}

export interface BookingResult {
  orderId: string;
  message: string;
  [key: string]: unknown;
}

export async function bookTable(
  client: Client,
  params: BookTableParams
): Promise<BookingResult> {
  // GUARDRAILS: ⚠️ WRITE — caller must enforce confirm gate
  // Only passes isFree=true deals; paid deals will fail at cart validation
  return callTool<BookingResult>(client, "book_table", params as unknown as Record<string, unknown>);
}

export async function getBookingStatus(
  client: Client,
  params: { orderId: string }
): Promise<unknown> {
  return callTool(client, "get_booking_status", params);
}
