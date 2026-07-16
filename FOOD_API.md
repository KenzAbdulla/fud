# Swiggy Food MCP API Reference

**Endpoint:** `POST mcp.swiggy.com/food`  
**Auth:** OAuth 2.1 PKCE (session-supplied)  
**Response Format:** `{ "success": bool, "data": {...}, "message": "..." }` (or `{ "success": false, "error": {...} }`)

---

## Tool Index

| Tool | Purpose | Behaviour | Stage |
|------|---------|-----------|-------|
| `get_addresses` | List user's saved delivery addresses (no coords, privacy) | READ | Discover |
| `search_restaurants` | Search restaurants by name/cuisine at address | READ | Discover |
| `get_restaurant_menu` | Browse paginated menu categories for a restaurant | READ | Discover |
| `search_menu` | Find dishes across restaurants (variants/addons included) | READ | Discover |
| `get_food_cart` | View current cart with items, pricing, payment methods | READ | Cart |
| `update_food_cart` | ⚠️ WRITE — Add items, customize with variants/addons | WRITE | Cart |
| `fetch_food_coupons` | List available coupons for restaurant (COD-only recommended) | READ | Cart |
| `apply_food_coupon` | ⚠️ WRITE — Apply coupon code to cart | WRITE | Cart |
| `flush_food_cart` | ⚠️ WRITE — Clear all items from cart | WRITE | Cart |
| `place_food_order` | 💸 SPENDS MONEY — Place order (max ₹1000 beta limit) | WRITE | Order |
| `get_food_orders` | List active orders with status & actions | READ | Track |
| `get_food_order_details` | Full details for one order (items, variants, pricing) | READ | Track |
| `track_food_order` | Order status & ETA for active/specific order | READ | Track |

---

## Discover Stage

### `get_addresses`
**Purpose:** Fetch all saved delivery addresses (no lat/lng, privacy-protected).

| Param | Type | Req | Notes |
|-------|------|-----|-------|
| *(none)* | — | — | Auth-supplied session only |

**Agent Guidance:**
- STOP and show address list to user
- Ask: "Which address would you like to use for delivery?"
- DO NOT proceed without user selection
- Save `addressId` for all downstream calls
- If no addresses, tell user to add one first

---

### `search_restaurants`
**Purpose:** Find restaurants by name or cuisine type.

| Param | Type | Req | Notes |
|-------|------|-----|-------|
| `addressId` | string | yes | From `get_addresses` |
| `query` | string | yes | Restaurant name or cuisine (e.g. "biryani", "pizza") |
| `offset` | number | no | Pagination; use `nextOffset` from response for more |

**Agent Guidance:**
- Check `availabilityStatus` (OPEN/CLOSED/UNAVAILABLE) — only recommend OPEN
- Results sorted by distance, rating, relevance
- Mention `distanceKm` for far restaurants; estimate delivery time
- Let user pick restaurant before calling `search_menu` or `get_restaurant_menu`
- For generic queries ("best food", "popular"), use broad terms (biryani, thali, pizza) based on meal time

---

### `get_restaurant_menu`
**Purpose:** Browse restaurant menu paginated by category (compact view: names, prices, flags).

| Param | Type | Req | Notes |
|-------|------|-----|-------|
| `addressId` | string | yes | From `get_addresses` |
| `restaurantId` | string | yes | From `search_restaurants` |
| `page` | number | no | Default 1 |
| `pageSize` | number | no | Default 5, max 8 categories |

**Notes:** Returns compact view (hasVariants, hasAddons flags). For order details, use `search_menu`.

---

### `search_menu`
**Purpose:** Search dishes across all or specific restaurant (returns customization details).

| Param | Type | Req | Notes |
|-------|------|-----|-------|
| `addressId` | string | yes | From `get_addresses` |
| `query` | string | yes | Dish name (e.g. "biryani") |
| `restaurantIdOfAddedItem` | string | no | Scope search to one restaurant |
| `vegFilter` | number | no | 1=veg-only, 0 or omit=all (no non-veg-only available) |
| `offset` | number | no | Pagination; use `nextOffset` for more |

**Critical:** Items have EITHER `variations` (legacy) OR `variantsV2` (new) — use matching format in cart calls.  
**Addon Logic:** All possible addons returned, but validity depends on variant selection. After adding item, check cart response for `valid_addons`.  
**Agent Guidance:**
- If no results in current restaurant, search without `restaurantIdOfAddedItem` to find at other restaurants
- Use `nextOffset` to paginate same query; different queries need new `search_menu` call
- Present addons from response before user orders — do NOT call again for addon details

---

## Cart Stage

### `get_food_cart`
**Purpose:** View current cart contents, pricing breakdown, payment options.

| Param | Type | Req | Notes |
|-------|------|-----|-------|
| `addressId` | string | yes | Needed for accurate delivery charge |
| `restaurantName` | string | no | Pass from search results (API may not return it) |

**Response includes:** `valid_addons` per item (based on variant selection), `availablePaymentMethods`, coupon status.  
**Agent Guidance:**
- `coupon_applied` with `coupon_discount=0` = auto-suggested, not applied. Only show savings if discount > 0.
- Display payment methods only from `availablePaymentMethods` (do not assume options).

---

### `update_food_cart`
**Purpose:** ⚠️ WRITE — Add items with variants/addons, update customizations.

| Param | Type | Req | Notes |
|-------|------|-----|-------|
| `restaurantId` | string | yes | Cart restaurant |
| `cartItems` | object[] | yes | Array of items (name, qty, variants, addons) |
| `addressId` | string | yes | For delivery charges |
| `restaurantName` | string | no | Pass from search results |

**Critical:** Use SAME variant format (variations or variantsV2) as returned by `search_menu`. Check cart response for `valid_addons` after variant selection.  
**Agent Guidance:**
- NO widget rendered. MUST call `get_food_cart` immediately after to show updated cart.
- For quantity changes on customized items: ASK user if they want same addons for new qty, suggest available addons.
- For non-customized items, apply qty changes directly.
- Keep text response brief ("Added 2x Chicken Biryani to your cart"), then call `get_food_cart`.

---

### `fetch_food_coupons`
**Purpose:** List available coupons/offers for restaurant.

| Param | Type | Req | Notes |
|-------|------|-----|-------|
| `restaurantId` | string | yes | From search |
| `addressId` | string | yes | Coordinates fetched automatically |
| `couponCode` | string | no | Check applicability of specific code |

**Agent Guidance:**
- Only recommend coupons valid for Cash on Delivery (COD)
- Filter out card-only offers
- Response schema: not documented — validate live (discount amounts, terms unclear in docs)

---

### `apply_food_coupon`
**Purpose:** ⚠️ WRITE — Apply coupon code to cart.

| Param | Type | Req | Notes |
|-------|------|-----|-------|
| `couponCode` | string | yes | Promo/discount code |
| `addressId` | string | yes | Coords auto-fetched |
| `cartId` | string | no | Optional |

**Returns:** Updated cart with new pricing, discounts, savings.

---

### `flush_food_cart`
**Purpose:** ⚠️ WRITE — Empty all items from cart.

| Param | Type | Req | Notes |
|-------|------|-----|-------|
| *(none)* | — | — | Auth-supplied session only |

---

## Order Stage

### `place_food_order`
**Purpose:** 💸 SPENDS MONEY — Submit order for delivery.

| Param | Type | Req | Notes |
|-------|------|-----|-------|
| `addressId` | string | yes | Delivery address (coords auto-fetched) |
| `paymentMethod` | string | no | From `availablePaymentMethods` of cart; auto-defaults if omitted |

**CRITICAL RESTRICTIONS:**
- **₹1000 MAX ORDER LIMIT** (beta testing only). Inform user to use Swiggy app for larger orders.
- **ALWAYS get explicit user confirmation** before calling:
  1. Call `get_food_cart` first — show items, costs, payment methods, delivery address
  2. Verify cart total < ₹1000
  3. State: "Your order will be delivered to: [address]"
  4. Ask: "Do you want to proceed?"
  5. Wait for clear yes/confirm/proceed
  6. Only then call `place_food_order`

**Agent Guidance:**
- Show payment method from cart `availablePaymentMethods` only (do not assume any option)
- Use tool response message as-is for success (includes Swiggy branding)
- Do NOT rephrase to "Order placed" — show "Swiggy order placed successfully"
- If user asks to cancel: Tell them "To cancel your order, please call Swiggy customer care at 080-67466729" (do NOT call any tool)

---

## Track Stage

### `get_food_orders`
**Purpose:** List active food orders with status and available actions.

| Param | Type | Req | Notes |
|-------|------|-----|-------|
| `addressId` | string | yes | From `get_addresses` |
| `orderCount` | number | no | Default 5, max 20 |

**Response schema: not documented** — order structure, available actions unclear.  
**Agent Guidance:**
- For past/order history: direct user to Swiggy app
- If user asks to cancel: "Call Swiggy customer care at 080-67466729" (do NOT call tool)

---

### `get_food_order_details`
**Purpose:** Full details for a specific order (items, variants, pricing, status).

| Param | Type | Req | Notes |
|-------|------|-----|-------|
| `orderId` | string | yes | From `get_food_orders` |

**Response schema: not documented** — field structure (ETA, delivery fee, etc.) not specified in docs. Validate live.

---

### `track_food_order`
**Purpose:** Track order status, ETA, delivery progress.

| Param | Type | Req | Notes |
|-------|------|-----|-------|
| `orderId` | string | no | If omitted, returns all active orders |

**Response schema: not documented** — status values, ETA format, progress fields not specified. Validate live.

---

## Notes

- **Auth:** All tools auto-receive session credentials (user identity, token) — never pass in calls
- **Response envelope:** All tools wrap response in standard JSON structure; see top of page
- **Error codes:** See https://mcp.swiggy.com/builders/docs/reference/errors/
- **Privacy:** Addresses returned WITHOUT lat/lng; coordinates auto-fetched server-side where needed
- **Addon validation:** Always check `valid_addons` in cart response after variant selection before offering more addons
- **Variant format:** Respect legacy `variations` vs new `variantsV2` — never mix in same call
