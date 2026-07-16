# Swiggy Dineout API Reference

**Endpoint:** `POST mcp.swiggy.com/dineout`  
**Auth:** OAuth 2.1 PKCE, 5-day access tokens  
**Version:** v1.0

## Tools Index

### Find Stage (Read-only)

#### `get_restaurant_details`
Fetch full restaurant info for table booking: ratings, deals, timings, address.
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| restaurantId | string | yes | From search results |
| latitude | number | yes | Same as search coords |
| longitude | number | yes | Same as search coords |

**Agent guidance:** Always use coordinates from search. Response schemas undocumented — validate live.

---

#### `get_saved_locations`
List user's saved addresses (id, addressLine).
| Param | Type | Required |
|-------|------|----------|
| *(none)* | — | — |

**Agent guidance:** When user says "near my home/office/my location", call this first, show numbered list, ask which location. Do NOT use for city/area names (Bangalore, Koramangala) — pass coordinates directly to search instead.

---

#### `search_restaurants_dineout`
Search restaurants for table booking. NOT food delivery. Returns cuisines, ratings, costForTwo, distance, highlights, offers, deals.
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| query | string | yes | Restaurant name, cuisine (Italian, Biryani), locality (Koramangala), category (cafe, pub, bar), descriptors. Do NOT include city/location in query. |
| entityType | string | no | **CRITICAL routing:** "locality" → area search; "CUISINE" → cuisine filter; "RESTAURANT_CATEGORY" → café/pub/bar/brewery/lounge/buffet. Omit for restaurant names. Without it, locality/cuisine queries return generic results instead of filtered results. |
| addressId | string | no | From get_saved_locations. Server resolves to coordinates. Use instead of lat/lng for saved addresses. |
| latitude | number | no | Use for direct city/area searches. Omit if addressId provided. |
| longitude | number | no | Use for direct city/area searches. Omit if addressId provided. |

**entityType routing rules (critical):**
- "Indiranagar" + area search → entityType="locality", lat=12.9784, lng=77.6408
- "Chinese" + cuisine → entityType="CUISINE", lat=12.9716, lng=77.5946
- "café" + category → entityType="RESTAURANT_CATEGORY", lat=12.9352, lng=77.6245
- "Social" (restaurant) → omit entityType

**Common coordinates:** Bangalore center: 12.9716, 77.5946 | Koramangala: 12.9352, 77.6245 | Indiranagar: 12.9784, 77.6408 | Mumbai: 19.0760, 72.8777 | Delhi: 28.6139, 77.2090

---

### Reserve Stage (Mutating)

#### `book_table`
⚠️ **WRITE** — Book table for specific slot. **FREE RESERVATIONS ONLY** (isFree=true, bookingPrice=0). Paid deals rejected. Internally creates cart then checkout.
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| restaurantId | string | yes | — |
| slotId | number | yes | From slot.deals[].slotId |
| itemId | string | yes | From slot.deals[].itemId (format: "restaurantId-ticketId") |
| reservationTime | number | yes | Unix timestamp from slot.reservationTime |
| guestCount | number | yes | 1-20 |
| latitude | number | yes | User address |
| longitude | number | yes | User address |

**Restriction:** Free reservations only. Paid/prime deals (discount/prime) will fail at cart validation.

---

#### `create_cart`
⚠️ **WRITE** — Initialize cart for DEAL_TICKET_PURCHASE (booking) or DINEOUT (bill payment).
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| restaurantId | string | yes | — |
| cartType | enum | yes | "DEAL_TICKET_PURCHASE" or "DINEOUT" |
| latitude | number | yes | — |
| longitude | number | yes | — |
| slotId | number | no | Required for booking cart |
| itemId | string | no | Required for booking cart (format: "restaurantId-ticketId") |
| reservationTime | number | no | Required for booking cart (unix timestamp) |
| guestCount | number | no | Required for booking cart (1-20) |
| billAmount | number | no | Required for bill payment cart (rupees) |
| source | string | no | Bill payment source (default: "direct-payment-cart") |

**Note:** book_table creates cart internally; call separately only for standalone operations. Validates billToPay=0 and skipPayment=true for free reservations.

---

#### `get_available_slots`
List available reservation slots for 7 days from requested date. Shows breakfast/lunch/dinner with availability and deals (both FREE and paid).
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| restaurantId | string | yes | — |
| date | string | yes | YYYY-MM-DD or epoch timestamp (numeric string). Returns 7-day span. |
| latitude | number | yes | User location |
| longitude | number | yes | User location |

**Slot structure:** Each slot has dateStr (YYYY-MM-DD), slotId, reservationTime (epoch), displayTime (e.g., "10:00 AM"), slotGroupName ("Breakfast"/"Lunch"/"Dinner"), deals[]. Each deal: title, bookingPrice, displayFee, discountPercentage, isFree. For booking, use FREE deals only (isFree=true, bookingPrice=0).

---

### Manage Stage (Read-only)

#### `get_booking_status`
Retrieve booking details and status: restaurant name, date, time, guests, deal title, status.
| Param | Type | Required |
|-------|------|----------|
| orderId | string | yes | From booking confirmation |

---

## Response Format (All Tools)

**Success:**
```json
{ "success": true, "data": { /* tool-specific */ }, "message": "optional" }
```

**Failure:**
```json
{ "success": false, "error": { "message": "description", "reportLink": "...", "reportHint": "..." } }
```

See OPERATIONS.md for error classification and retry strategy.

## Key Restrictions & Caveats

- **Free-only bookings:** book_table rejects paid/prime deals. Slot selection must ensure isFree=true.
- **Response schemas undocumented:** Validate live against actual responses; structure may vary.
- **Coordinates required:** search_restaurants_dineout and details fetches require matching lat/lng pairs.
- **entityType critical:** Omitting it for locality/cuisine queries returns wrong results.
- **No refresh tokens in v1.0:** 5-day access tokens only; re-auth after expiry.

---

**Last Updated:** 2026-07-04 | **Endpoint:** POST mcp.swiggy.com/dineout
