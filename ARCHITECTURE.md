# Architecture

## Components

```
┌─ Web PWA (comparison UI, confirm gates, pantry checklist)
│
├─ Orchestrator (deterministic TypeScript, no LLM)
│   ├─ runs 3 legs in parallel per craving:
│   │   Food: search_menu → price-sort → coupons
│   │   Dineout: search_restaurants_dineout → offers/distance
│   │   Instamart: N × search_products (one per ingredient)
│   ├─ client-side cart models (Food + Instamart, full-state)
│   ├─ idempotency + spend-cap enforcement
│   └─ MCP response stripper (trim to needed fields BEFORE any LLM/UI)
│
├─ Recipe Service  ★ THE MOAT — build as a separable service, own API
│   ├─ input: dish name | reel link (user-pasted) | uploaded video
│   ├─ output: structured recipe JSON {dish, servings, ingredients[qty,unit], steps, prep_time}
│   └─ pipeline: cache lookup → cheap-model extraction → big-model fallback on low confidence
│
├─ Ingredient Matcher (LLM-assisted, cached)
│   ├─ recipe qty/unit → Instamart SKU/pack-size candidates (multiple per ingredient)
│   ├─ per-serving cost = pack price ÷ uses-per-pack heuristic
│   └─ pantry-uncheck list (stored locally per user)
│
└─ Caches (the token-economy backbone)
    ├─ reel-URL → recipe JSON        (permanent; same reel = zero extraction cost)
    ├─ dish-name → recipe JSON       (permanent; skips extraction entirely)
    ├─ ingredient → SKU-match        (per-city, TTL days)
    └─ common-dishes precompute      (top ~200 Indian dishes seeded offline, one-time cost)
```

## Token economy rules (product)

1. LLM touches exactly two problems: recipe extraction, ingredient→SKU matching. Everything else — sorting, price math, comparison, cart building — is deterministic code.
2. Check caches before every LLM call. Cache hit rate is the primary cost metric; instrument it from day one.
3. Strip MCP payloads to needed fields before they enter any prompt (search responses are large).
4. Cheap model first (extraction is mostly transcription+structuring); escalate on low confidence only.
5. No LLM in the request path for cached dishes — a returning "paneer butter masala" query costs zero tokens.

## Comparison output per leg

| Leg | Cost shown | Time shown | Source |
|---|---|---|---|
| Order | dish price + "excl. fees" | delivery ETA if payload has it, else omit | search_menu (validate live) |
| Dine out | costForTwo + offers | distance-based estimate | search_restaurants_dineout |
| Cook | per-serving headline, basket total at handoff | prep_time from recipe JSON | Instamart + Recipe Service |

## Build order

1. **Swiggy orchestration + dish-name flow** — de-risked, demoable in days; log real response payloads and update `swiggy-mcp-docs/*` "validate live" notes.
2. **Ingredient Matcher + Instamart cart** — the hard correctness work (pack sizes, cart-replace semantics).
3. **Recipe Service with reel input** — the moat; separable API from day one (B2B licensing fallback).
4. **Comparison UX polish + demo video** → submit Swiggy production application (start application prep at step 1 completion).

## Live-validation checklist (do before PRD freeze)

Log real payloads for each and record findings in the md docs:
- [ ] `search_menu`: does response include delivery fee / ETA / restaurant distance?
- [ ] `search_products`: variant/pack-size structure, price fields, availability
- [ ] `search_restaurants_dineout`: offer/deal shape, distance units
- [ ] `get_food_cart`: fee/tax breakdown fields (fees may appear here even if absent in search)
- [ ] `get_cart` (Instamart): bill breakdown shape
- [ ] Coupon application effect on totals
- [ ] Error shapes on invalid addressId / out-of-serviceability
