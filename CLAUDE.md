# Craving-to-Plate — Claude Code project guide

Web app (PWA, India): user names a dish or pastes a food-reel link → structured recipe → 3-way comparison: **order** (Swiggy Food), **dine out** (Dineout), or **cook** (Instamart ingredient basket). Built on Swiggy MCP (OAuth 2.1 PKCE, per-user).

## Docs index — read on demand, never all at once

| File | When to read |
|---|---|
| `swiggy-mcp-docs/FOOD_API.md` | Working on the order/delivery leg |
| `swiggy-mcp-docs/INSTAMART_API.md` | Working on the cook/grocery leg |
| `swiggy-mcp-docs/DINEOUT_API.md` | Working on the dine-out leg |
| `swiggy-mcp-docs/OPERATIONS.md` | Auth, rate limits, errors, compliance, go-live |
| `GUARDRAILS.md` | Before writing ANY code that calls a write/order tool |
| `ARCHITECTURE.md` | Component boundaries, caching, token-economy rules |
| `TECH_STACK.md` | Framework/hosting/DB/LLM choices — do not deviate without updating it |
| `DESIGN_RULES.md` | Design tokens + component rules; 4 hard DO-NOT gates re Swiggy trade dress |
| `PRD_CravingToPlate.md` | Requirements (F-01…F-42), journeys, edge cases, phases |

## Non-negotiable invariants (full detail in GUARDRAILS.md)

1. **Never auto-execute a write call.** Every `place_food_order`, `checkout`, `book_table`, cart mutation behind an explicit user confirmation gate.
2. **Instamart `update_cart` REPLACES the whole cart.** Client-side cart object is the source of truth; always resend full cart.
3. **Idempotency keys on every order/booking call.** A timeout must never become a double order.
4. **Spend caps enforced pre-call** (per-order + daily, user-configurable).
5. **Reel ingestion is paste-link/upload only.** No server-side Instagram scraping, ever.
6. **Price displays carry an "excl. fees" disclaimer** until live validation confirms fee fields.

## Dev conventions (token economy)

- Deterministic code first; LLM only for recipe extraction and ingredient→SKU matching.
- Strip MCP responses to needed fields before any LLM prompt sees them.
- Two caches: reel-URL→recipe and dish-name→recipe (dish-name hits skip extraction entirely).
- Small/cheap model first, big-model fallback on low confidence.
- Don't re-fetch Swiggy docs — everything needed is in `swiggy-mcp-docs/`. Response schemas marked "validate live" are unverified; log real payloads during dev and update the md files.

## Environment notes

- Local dev works without Swiggy approval; prod credentials need an application + demo video (start this in parallel with the build, see OPERATIONS.md).
- Access tokens last 5 days, **no refresh tokens in v1.0** — handle mid-flow expiry (re-auth prompt, resumable state).
- Planned rate limit 120 req/min/user; not enforced yet, failures surface as generic `UPSTREAM_ERROR`. Retry with backoff, never retry writes without idempotency check.
