# Production guardrails

Council-prioritized. This app spends real money and books real tables via the user's Swiggy OAuth. Nothing below is optional polish.

## 1. Confirmation gate on every write (P0)

No tool that mutates state or spends money executes without an explicit user confirmation in the same session: `place_food_order`, Instamart `checkout`, `book_table`, `apply_food_coupon` (cart mutation), all cart updates that precede checkout. UI shows exact items, quantities, address, and total before the confirm button. No "agent decides to order" path exists, even behind a flag. Food orders also have a ₹1000 platform limit — surface this before checkout, not as an error after.

## 2. Client-side cart as source of truth (P0)

Instamart `update_cart` REPLACES the entire cart (replace-not-merge). Maintain a full local cart model; every mutation rebuilds and resends the complete cart. Retrofitting this later is a rewrite, not a patch. Same discipline on Food cart: verify `valid_addons` from cart response before adding addons (addon validity depends on variant selection).

## 3. Idempotency / double-order protection (P0)

Client-generated idempotency key per checkout attempt. On timeout or `UPSTREAM_ERROR` after a write call: query `get_orders` / `get_booking_status` to check whether the write landed BEFORE any retry. Never blind-retry a write.

## 4. Spend caps (P0)

User-configurable per-order and daily caps, enforced client- and server-side before the MCP call is made. Sensible defaults on (e.g., ₹1000/order, ₹2500/day).

## 5. Pre-checkout confirmation screen (P1)

Every checkout re-confirms: delivery address (users have multiple saved addresses — wrong-address orders are the top support nightmare), serving size on the cook leg, party size + slot on the dine-out leg.

## 6. Price-accuracy honesty (P1)

Until live validation confirms fee/ETA fields in search payloads, every comparison shows "excludes delivery fees & taxes" inline — not in a footer. If the headline number is wrong, users screenshot it and the product is dead. Cook leg shows per-serving headline AND basket total at cart handoff.

## 7. Reel ingestion: paste-link/upload only (P1, permanent)

No server-side Instagram scraping — Meta ToS. User pastes a link or uploads a screen recording; extraction runs on user-provided content. This is permanent scope, not an MVP shortcut.

## 8. Auth & session hygiene (P1)

- OAuth tokens: 5-day expiry, NO refresh tokens in Swiggy MCP v1.0. Detect expiry mid-flow, preserve state (cart, comparison), prompt re-auth, resume.
- Store tokens encrypted at rest; never log tokens or full payloads containing PII.

## 9. Data compliance — DPDP 2023 (P1, before launch)

- You are a data **processor** for Swiggy data. No using Swiggy order/user data for analytics or model training without explicit user consent + DPA.
- Data residency: India/Singapore only. If any processing (including LLM calls) leaves region, you need a DPA. Check your LLM provider's region routing.
- Store the minimum: recipe cache and pantry preferences are yours; Swiggy addresses/orders stay ephemeral.

## 10. Swiggy production review (P0 for timeline)

Prod access requires an application with a demo video and has an unspecified review timeline. Start the application as soon as the dish-name flow demos end-to-end locally — in parallel with the rest of the build, not after. Review the go-live checklist in `swiggy-mcp-docs/OPERATIONS.md` and design to it from day one.

## 11. Rate limits & degradation (P2)

Planned 120 req/min/user, unenforced today (failures = generic `UPSTREAM_ERROR`, no 429s). Budget MCP calls per comparison (3 searches + N ingredient lookups adds up on the cook leg — batch/parallelize, cache aggressively). Exponential backoff on reads; writes follow rule 3.
