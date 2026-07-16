# Swiggy Instamart MCP API Reference

**Base:** `POST mcp.swiggy.com/im`  
**Auth:** Session-based (auto-injected via authenticated MCP client)  
**Response Format:** `{ success: bool, data: {...}, message?: string }` on success; `{ success: false, error: { message } }` on failure

---

## Tool Index

| Tool | Purpose | Type | Cost |
|------|---------|------|------|
| create_address | Add delivery address | ⚠️ WRITE | — |
| delete_address | Remove address | ⚠️ WRITE | — |
| get_addresses | List saved addresses (no coords) | READ | — |
| search_products | Find products by query+addressId | READ | — |
| your_go_to_items | Frequently ordered items | READ | — |
| clear_cart | Nuke entire cart | ⚠️ WRITE | — |
| get_cart | Current cart + bill + payment methods | READ | — |
| update_cart | ⚠️ **REPLACES entire cart** | ⚠️ WRITE | — |
| checkout | 💸 Place+confirm order | 💸 SPENDS MONEY | — |
| get_order_details | Detailed order breakdown | READ | — |
| get_orders | Order history (last 15d) | READ | — |
| track_order | Real-time tracking (ETA, partner location) | READ | — |

---

## DISCOVER: Addresses

### create_address
**Purpose:** Add new delivery address for authenticated user.

**Parameters:**
| Field | Type | Req | Notes |
|-------|------|-----|-------|
| fullAddress | string | ✓ | Complete address from user |
| addressLine | string | ✓ | Street/building/house no. (agent: extract from fullAddress) |
| addressLine2 | string | ✓ | Apt/floor/wing (agent: extract; use "" if missing) |
| locality | string | — | Area/neighborhood (optional) |
| city | string | ✓ | City name (agent: extract from fullAddress) |
| postalCode | string | ✓ | ZIP code (agent: extract from fullAddress) |
| latitude | number | ✓ | Decimal latitude |
| longitude | number | ✓ | Decimal longitude |
| addressCategory | enum | ✓ | HOME, WORK, OFFICE, FRIENDS_AND_FAMILY, OTHER |
| addressTag | string | — | Friendly label (e.g., "My Home") |
| userName | string | ✓ | Account holder name |
| userPhone | string | ✓ | Account holder phone |
| receiverName | string | — | Recipient if different from user |
| receiverPhone | string | — | Recipient phone if different |

**Agent Guidance:**
- DO NOT ask user for addressLine/addressLine2/city/postalCode separately—**agent parses fullAddress**.
- Ask for: full address, lat, lng, name, phone, type, optional tag, receiver details (if applicable).

---

### delete_address
**Purpose:** Permanently delete saved address.

**Parameters:**
| Field | Type | Req | Notes |
|-------|------|-----|-------|
| addressId | string | ✓ | From get_addresses response |

**Agent Guidance:**
- Call get_addresses first; show user list.
- **WARNING:** Permanent, cannot undo—confirm before calling.

---

### get_addresses
**Purpose:** Fetch all saved addresses (no lat/lng returned for privacy).

**Parameters:** None (authenticated user implicit).

**Response Schema:** not documented—validate live.

**Agent Guidance:**
- Always call first in workflow; stop and let user pick address before proceeding.
- If no addresses returned, tell user to add one.

---

### search_products
**Purpose:** Find products available at selected address; includes variants (sizes, quantities).

**Parameters:**
| Field | Type | Req | Notes |
|-------|------|-----|-------|
| addressId | string | ✓ | From get_addresses |
| query | string | ✓ | Product name/category/brand |
| offset | number | — | Pagination (default: 0) |

**Agent Guidance:**
- ALWAYS search before adding to cart.
- Show variants; ask user which variant before update_cart.

---

### your_go_to_items
**Purpose:** Frequently/recently ordered items for address.

**Parameters:**
| Field | Type | Req | Notes |
|-------|------|-----|-------|
| addressId | string | ✓ | From get_addresses |
| offset | number | — | Pagination (default: 0) |

**Agent Guidance:**
- Returns products with variants; use spinId from chosen variant when adding to cart.

---

## CART: Manage

### get_cart
**Purpose:** Fetch current cart (items + bill + available payment methods for checkout).

**Parameters:** None (authenticated user implicit).

**Response Schema:** not documented—validate live.

**Agent Guidance:**
- Call before checkout to show bill summary + available payment methods.
- Display ONLY payment methods returned in response—do not assume others.

---

### update_cart
**Purpose:** ⚠️ **CRITICAL: Replaces entire cart** (destructive; not append).

**Parameters:**
| Field | Type | Req | Notes |
|-------|------|-----|-------|
| selectedAddressId | string | ✓ | From get_addresses |
| items | object[] | ✓ | Array of {spinId, quantity} |

**Agent Guidance:**
- CRITICAL: This is **full replacement**, not delta update.
- Always get current cart first if preserving existing items.
- Use spinId from search_products or your_go_to_items response.

---

### clear_cart
**Purpose:** Remove all items from cart.

**Parameters:** None.

**Agent Guidance:**
- Destructive operation—confirm user intent first.

---

## ORDER: Checkout & Track

### checkout
**Purpose:** 💸 Place + confirm Instamart order (single operation; payment included).

**Parameters:**
| Field | Type | Req | Notes |
|-------|------|-----|-------|
| addressId | string | ✓ | Delivery address (user must select) |
| paymentMethod | string | — | From availablePaymentMethods in get_cart; auto-defaults if omitted |

**Agent Guidance:**
- CRITICAL: **Always get explicit user confirmation before calling.**
- Workflow: get_cart → show bill+payment methods+address → ask confirmation → call.
- Multi-store orders: system auto-handles, returns separate order results per store.
- Restriction: Cart total must be <1000 INR; larger orders → use Swiggy app.
- Use message from response as-is (includes Swiggy Instamart branding).
- Cancellation: User calls Swiggy support (080-67466729)—do NOT call tool.

---

### get_orders
**Purpose:** Fetch order history (last 15 days) + past/active orders.

**Parameters:**
| Field | Type | Req | Notes |
|-------|------|-----|-------|
| count | number | — | Orders to fetch (default: 10, max: 20) |
| orderType | string | — | Filter: "DASH", "INSTAMART", etc. (default: "DASH") |
| activeOnly | boolean | — | true = ongoing/pending only; false = all (default: false) |

**Agent Guidance:**
- Use first when user asks: "show my orders", "order history", "what did I order", "reorder".
- activeOnly=true for: "active orders", "current delivery", "orders on the way".
- Returns orderId + basic details + delivery address coords (use for track_order).

---

### get_order_details
**Purpose:** Detailed breakdown for specific order (items, bill, status, refunds).

**Parameters:**
| Field | Type | Req | Notes |
|-------|------|-----|-------|
| orderId | string | ✓ | From get_orders |

**Agent Guidance:**
- Use when user wants itemized bill, total, or full order recap.
- Provides more detail than get_orders; NOT for real-time tracking (use track_order).

---

### track_order
**Purpose:** Real-time order tracking (status, ETA, delivery partner location, store info).

**Parameters:**
| Field | Type | Req | Notes |
|-------|------|-----|-------|
| orderId | string | ✓ | From get_orders |
| lat | number | ✓ | Delivery address latitude |
| lng | number | ✓ | Delivery address longitude |

**Agent Guidance:**
- PRIMARY tool for "where is my order", "track order", "ETA", "order status".
- If user doesn't provide orderId, call get_orders first.
- Coordinates required (available from get_orders response).

---

## CRITICAL SEMANTICS

1. **update_cart is destructive**: Always fetch current cart if you need to preserve items—it replaces wholesale.
2. **Addresses hide coordinates**: get_addresses returns no lat/lng for privacy; user must provide during address creation.
3. **Checkout is final**: Single operation (place + confirm payment). No intermediate steps.
4. **Response payloads undocumented**: Validate live for all tools except cart (items, addresses, orders) which have stable schema.
5. **Multi-store support**: checkout handles carts with items from multiple stores; returns per-store results.
6. **Payment method**: Must come from availablePaymentMethods in get_cart response—do not assume other methods exist.
