# Craving-to-Plate

**Product:** Craving-to-Plate — craving-to-fulfilment decision engine on Swiggy MCP
**Author:** Vivek Mohan
**Date:** 2026-07-04
**Status:** Draft

---

## 1. Executive Summary

When an Indian consumer craves a specific dish — from memory or from an Instagram food reel — satisfying it means juggling three separate apps and doing mental math across them: check delivery prices on Swiggy, check restaurants and offers on Dineout, and (if cooking) build a grocery list and hunt each ingredient on Instamart. Nobody does this systematically; they default to whatever app is open, usually the most expensive path.

Craving-to-Plate is a web app (PWA) that takes a dish name or a pasted food-reel link, extracts a structured recipe, and presents three fulfilment paths side-by-side: **Order it** (Swiggy Food, price-sorted), **Go out** (Dineout with offers), or **Cook it** (Instamart ingredient basket with per-serving cost and pantry unchecking). Each path shows cost and time/effort, and completes in-app through Swiggy's MCP platform (35 tools, per-user OAuth 2.1).

The defensible asset is the **reel-to-recipe extraction engine**, built as a separable service. The comparison layer rides Swiggy's open MCP platform and is clonable by Swiggy itself; the extraction engine is not on their platform and has standalone B2B licensing value (creators, Zomato, grocery brands).

The project is bootstrapped: LLM usage is restricted to two problems (recipe extraction, ingredient→SKU matching), everything else is deterministic code, and aggressive caching makes repeat dishes cost zero tokens.

## 2. Problem Statement

### 2.1 Current State

A user who watches a butter-chicken reel and wants it today does this manually:

1. Screenshot/save the reel; try to recall the recipe steps later
2. Google the recipe; pick one of ten conflicting versions
3. Open Swiggy; search the dish; scroll 20+ restaurants comparing prices
4. Check coupons separately per restaurant
5. Maybe open Dineout to see if going out is cheaper with a deal
6. If cooking: list ingredients by hand from the recipe
7. Search Instamart for each ingredient individually (8–15 searches)
8. Guess pack sizes vs. required quantities; no idea what the dish actually costs per serving
9. Mentally compare three totals that were never on one screen
10. Give up and order the first acceptable delivery option

**~15–25 minutes across 3 apps, and the comparison never actually happens.** The "cheapest/fastest way to satisfy this craving" question goes unanswered every time.

### 2.2 Use Cases That Exist Today

| Category | Example | Data needed |
|---|---|---|
| Direct dish craving | "I want chole bhature tonight" | Dish→restaurants+prices, dish→recipe→ingredients, nearby dineout |
| Reel-inspired craving | Pastes IG reel of Thai basil chicken | Video→transcript→structured recipe, then all of the above |
| Budget decision | "What's the cheapest way to eat biryani?" | Comparable cost across 3 legs incl. per-serving cook cost |
| Occasion dining | "Is there a deal nearby to eat this out?" | Dineout offers, costForTwo, distance, slots |
| Pantry-aware cooking | "I have rice and onions already" | Ingredient basket minus pantry items, repriced |
| Time-boxed craving | "Fastest option — I'm hungry now" | ETA per leg: delivery ETA, travel time, prep time |

### 2.3 Root Cause

All the data exists inside one company: Swiggy operates Food, Instamart, and Dineout, and now exposes all three through 35 MCP tools with per-user OAuth. What's missing is the glue between a user's intent ("this dish, satisfied cheaply/fast") and the multi-source orchestration required to answer it — plus the one input Swiggy doesn't handle at all: turning a food reel into a structured, shoppable recipe.

## 3. Product Vision

One sentence: **Paste a craving — a dish name or a food reel — and get the three real ways to satisfy it, priced and timed, completable in two taps.**

What it is not:

- **Not an auto-ordering agent.** No write call (order, checkout, booking) ever executes without explicit user confirmation.
- **Not an Instagram scraper.** Reel ingestion is user-pasted links / user uploads only — permanent scope, not an MVP shortcut.
- **Not a recipe content site.** Recipes exist to power the comparison and the basket, not for browsing.
- **Not a Swiggy replacement.** All fulfilment happens on Swiggy rails under the user's own account.
- **Not multi-marketplace (v1).** Zomato/Blinkit/Zepto comparison is out of scope until the Swiggy loop works.
- **No paid Dineout deal purchases** — Swiggy MCP `book_table` supports free reservations only.

## 4. User Personas

### 4.1 The Reel-Inspired Urbanite (Primary)
22–32, metro India, Instagram-heavy, cooks occasionally, mildly guilty about food spend. Saves food reels weekly but almost never converts them into meals or orders. Wants the reel→plate gap closed with near-zero effort. **Primary.**

### 4.2 The Budget Optimizer (Secondary)
Student / early-career, order frequency limited by budget. Suspects cooking is cheaper but can't see by how much, so defaults to ordering. Wants the per-serving math done and the cheapest path made obvious. **Secondary.**

### 4.3 The Occasion Diner (Secondary)
Couples/small groups deciding "order in or go out?" on weekends. Wants dineout offers and table availability weighed against delivery for the same craving. **Secondary.**

### 4.4 The Creator (Power user, future)
Food-reel creator who wants their recipe to be one-tap shoppable for followers. Not served in v1; drives the Phase-4 B2B/affiliate path for the extraction engine. **Power user (future).**

## 5. User Journeys

### Journey 1 — Dish name to three-way comparison

> "Paneer butter masala"

```
[1] User types dish name; selects saved Swiggy address (get_addresses)
[2] Recipe Service: dish-name cache HIT → structured recipe JSON (0 tokens)
[3] Orchestrator fans out in parallel:
      Food:     search_menu("paneer butter masala", addressId) → price-sorted list
      Dineout:  search_restaurants_dineout(query, entityType=CUISINE, addressId)
      Instamart: search_products() per recipe ingredient → SKU candidates
[4] Ingredient Matcher prices the cook basket; computes per-serving cost
[5] UI renders 3 cards: Order ₹289+ (excl. fees) | Go out ₹650 costForTwo, 2 offers,
    1.2km | Cook ₹96/serving (basket ₹412), 45 min prep
RESULT: One screen, all three real options, ~8s, before the user has opened any app.
```

### Journey 2 — Reel to recipe to comparison

> User pastes an Instagram reel link of a Thai basil chicken recipe

```
[1] Reel-URL cache MISS → Recipe Service pipeline runs:
      fetch user-provided link content → transcribe audio + on-screen text
      → cheap-model extraction → confidence 0.91 → structured recipe JSON
[2] Recipe card shown for user confirmation ("Is this the dish? Edit servings/ingredients")
[3] Same fan-out as Journey 1 from the confirmed recipe
[4] Reel-URL → recipe cached permanently; the next user pasting this reel pays 0 tokens
RESULT: A reel becomes a priced, three-way actionable plan in under 30s.
```

### Journey 3 — Cook path with pantry check to Instamart cart

> User taps "Cook it" on the comparison screen

```
[1] Ingredient checklist rendered; each row has 2–4 SKU options (brand/pack-size)
    with price and pack-vs-needed quantity shown
[2] User unchecks rice, onions, oil ("have at home") → basket reprices live
[3] User taps "Build my cart" → CONFIRMATION SCREEN: items, quantities, address,
    basket total ₹268 (per-serving ₹74 shown alongside)
[4] On explicit confirm: update_cart(FULL cart state) → get_cart verified against
    local model → user taps through to checkout with second confirmation
RESULT: Recipe becomes a verified Instamart cart; user confirmed twice before any
money moved.
```

### Journey 4 — Order path with price filter and coupon

> User taps "Order it", filters price low→high

```
[1] search_menu results re-sorted client-side (deterministic, no LLM)
[2] User picks a restaurant option → item + variant added via update_food_cart
[3] fetch_food_coupons → best applicable coupon surfaced → apply_food_coupon on user tap
[4] get_food_cart shows final bill incl. fees (fees appear at cart stage even if
    absent in search — validate live); ₹1000 order cap checked pre-confirmation
[5] Explicit confirm → place_food_order (idempotency key) → track_food_order
RESULT: Cheapest delivery option ordered with coupon, tracked in-app.
```

### Journey 5 — Dineout booking

> User taps "Go out" on a Friday evening

```
[1] Dineout card list: costForTwo, distance, rating, offers/bank deals per restaurant
[2] User picks one → get_restaurant_details + get_available_slots (7-day window)
[3] User selects slot + party size → confirmation screen → book_table (free
    reservation) → get_booking_status confirmation shown
RESULT: Table booked; deal terms shown for use at the venue.
```

## 6. Functional Requirements

### 6.1 Input & Recipe Extraction

| ID | Requirement |
|---|---|
| F-01 | Accept a dish name (free text) as primary input; autocomplete from cached dish list |
| F-02 | Accept a user-pasted reel/video link; ingestion of user-provided content only — no server-side Instagram crawling or scraping |
| F-03 | Accept a user-uploaded video/screen-recording as alternative reel input |
| F-04 | Recipe Service returns structured recipe JSON: dish, servings, ingredients (qty+unit), steps, prep_time, confidence |
| F-05 | Show extracted recipe for user confirmation/edit (servings, ingredients) before fan-out |
| F-06 | Extraction pipeline: cache lookup → cheap model → large-model fallback when confidence < threshold |
| F-07 | Recipe Service exposed as an internal API with its own contract (separable for future B2B licensing) |

### 6.2 Comparison Engine

| ID | Requirement |
|---|---|
| F-08 | Fan out to all three legs in parallel; render cards progressively as each resolves |
| F-09 | Each card shows: cost (leg-appropriate), time estimate, and top 3 options within the leg |
| F-10 | Cost displays carry inline "excludes delivery fees & taxes" disclaimer until live validation confirms fee fields in search payloads |
| F-11 | Cook leg headline is per-serving cost; basket total always shown at cart handoff (never hidden) |
| F-12 | Time estimates: delivery ETA (if payload provides), distance-derived travel time (dineout), recipe prep_time (cook); omit rather than guess when data absent |
| F-13 | All sorting/filtering (price low→high, distance, rating) is client-side deterministic code |

### 6.3 Order Leg (Swiggy Food)

| ID | Requirement |
|---|---|
| F-14 | Cross-restaurant dish search via search_menu with price sort and veg filter (veg-only supported; non-veg-only not available upstream — communicate this) |
| F-15 | Handle variants/variantsV2 duality per item; use the same format returned when adding to cart |
| F-16 | Validate addons against cart response valid_addons before offering them |
| F-17 | Surface applicable coupons (fetch_food_coupons) before checkout; apply only on user tap |
| F-18 | Enforce ₹1000 Swiggy food-order cap pre-confirmation with clear messaging |

### 6.4 Dine-out Leg (Dineout)

| ID | Requirement |
|---|---|
| F-19 | Search with correct entityType routing (CUISINE / locality / RESTAURANT_CATEGORY / name) |
| F-20 | Card shows costForTwo, distance, rating+count, offers and bank offers |
| F-21 | Slot selection from get_available_slots (7-day window); free reservations only via book_table |
| F-22 | Post-booking status via get_booking_status; deal terms displayed for venue use |

### 6.5 Cook Leg (Instamart)

| ID | Requirement |
|---|---|
| F-23 | Ingredient→SKU matching returns 2–4 candidates per ingredient (brand/pack-size options) with prices |
| F-24 | Pack-vs-needed quantity shown per ingredient; per-serving cost = pack price ÷ uses-per-pack heuristic |
| F-25 | Pantry checklist: uncheck owned items; basket reprices live; pantry list persisted per user locally |
| F-26 | Client-side cart model is source of truth; every mutation resends FULL cart (update_cart replaces, never merges) |
| F-27 | Post-write cart verification: get_cart response diffed against local model; mismatch blocks checkout |
| F-28 | Substitute suggestions when an ingredient has no serviceable SKU (e.g., "basil unavailable — nearest: Italian seasoning") |

### 6.6 Guardrails & Safety

| ID | Requirement |
|---|---|
| F-29 | Explicit user-confirmation gate before every write call (order, checkout, booking, coupon apply); no autonomous write path exists |
| F-30 | Idempotency key per checkout/booking attempt; on timeout, query order/booking status before permitting retry |
| F-31 | User-configurable spend caps (default ₹1000/order, ₹2500/day) enforced before the MCP call |
| F-32 | Pre-checkout screen re-confirms: address (explicitly named), items, total; dineout re-confirms slot + party size |
| F-33 | OAuth tokens encrypted at rest; never logged; PII stripped from logs |
| F-34 | Mid-flow token expiry (5-day tokens, no refresh in Swiggy v1.0): preserve comparison/cart state, prompt re-auth, resume |

### 6.7 Caching & Token Economy

| ID | Requirement |
|---|---|
| F-35 | Permanent caches: reel-URL→recipe and dish-name→recipe (separate; dish-name hits skip extraction entirely) |
| F-36 | Ingredient→SKU match cache per city with multi-day TTL |
| F-37 | Top ~200 Indian dishes precomputed offline (one-time seeding cost) |
| F-38 | MCP responses stripped to required fields before entering any LLM prompt or the UI layer |
| F-39 | Cache hit rate and tokens-per-comparison instrumented from day one as primary cost metrics |

### 6.8 Accounts & Platform

| ID | Requirement |
|---|---|
| F-40 | Per-user Swiggy OAuth 2.1 PKCE across all three MCP servers; single linked-account UX |
| F-41 | Installable PWA; mobile-first layout; works as plain web app without install |
| F-42 | Every comparison shareable via URL (drives organic distribution) |

## 7. System / LLM Design

### Architecture

```
┌─ Web PWA ──────────────────────────────────────────────┐
│  input box │ recipe confirm │ 3-card compare │ confirm  │
│            │                │                │ gates    │
└──────┬─────────────────────────────────────────────────┘
       │
┌──────▼──────────── Orchestrator (deterministic TS) ─────┐
│  parallel fan-out │ cart models (full-state) │ spend    │
│  idempotency keys │ MCP response stripper    │ caps     │
└──┬───────────┬───────────┬───────────────┬─────────────┘
   │           │           │               │
┌──▼───┐  ┌───▼────┐  ┌───▼─────┐  ┌──────▼───────────┐
│ Food │  │Dineout │  │Instamart│  │ Recipe Service ★ │
│ MCP  │  │  MCP   │  │   MCP   │  │ (separable API)  │
└──────┘  └────────┘  └────┬────┘  │ link/video→JSON  │
                           │       └──────┬───────────┘
                    ┌──────▼──────┐ ┌─────▼─────┐
                    │ Ingredient  │ │  Caches   │
                    │ Matcher(LLM)│ │ reel/dish/│
                    └─────────────┘ │ SKU/top200│
                                    └───────────┘
```

### LLM usage (exactly two touchpoints)

| Problem | Model tier | Trigger | Cache |
|---|---|---|---|
| Recipe extraction (video/transcript → recipe JSON) | Cheap model; large-model fallback on confidence < 0.8 | Cache miss only | reel-URL + dish-name, permanent |
| Ingredient → Instamart SKU matching | Cheap model with structured output | Cache miss only | per-city, TTL days |

Everything else — search orchestration, sorting, price math, comparison assembly, cart building — is deterministic code. A cached dish costs **zero tokens** end-to-end.

### Source-of-truth mapping

| Datum | Source |
|---|---|
| Dish availability & price (delivery) | Food `search_menu` |
| Fees/taxes on delivery | Food `get_food_cart` (validate live — likely absent in search) |
| Dineout cost, distance, offers | `search_restaurants_dineout` |
| Grocery SKUs, pack sizes, prices | Instamart `search_products` |
| Recipe, servings, prep time | Recipe Service (owned) |
| Cart truth (Instamart) | Local cart model, verified against `get_cart` |

## 8. Data Models

```typescript
interface Recipe {
  id: string;
  dish: string;
  source: { type: "dish_name" | "reel_link" | "upload"; url?: string };
  servings: number;
  prepTimeMin: number;
  ingredients: Ingredient[];
  steps: string[];
  confidence: number;          // extraction confidence 0..1
  extractedBy: "cache" | "small_model" | "large_model" | "precomputed";
}

interface Ingredient {
  name: string;
  quantity: number;
  unit: "g" | "kg" | "ml" | "l" | "tsp" | "tbsp" | "pc" | "cup";
  optional: boolean;
  pantryDefault: boolean;      // commonly-owned staple (salt, oil)
}

interface SkuMatch {
  ingredientName: string;
  candidates: Array<{
    productId: string; brand: string; packSize: string;
    price: number; perServingCost: number; usesPerPack: number;
  }>;
  cacheKey: string;            // city + normalized ingredient
}

interface Comparison {
  recipeId: string;
  addressId: string;
  legs: {
    order:  { options: FoodOption[];    headlineCost: number; feeDisclaimer: boolean; etaMin?: number };
    dineout:{ options: DineoutOption[]; costForTwo: number;  distanceKm: number; offers: Offer[] };
    cook:   { basketTotal: number; perServing: number; prepTimeMin: number; matches: SkuMatch[] };
  };
  createdAt: string;
  shareSlug: string;
}

interface CartState {                    // client-side source of truth
  vertical: "food" | "instamart";
  items: CartItem[];                     // FULL state, resent whole on every mutation
  lastVerifiedAt?: string;              // last successful get_cart diff
  idempotencyKey: string;               // rotated per checkout attempt
}

interface SpendGuard {
  perOrderCapINR: number;               // default 1000
  dailyCapINR: number;                  // default 2500
  spentTodayINR: number;
  evaluate(total: number): "allow" | "block_per_order" | "block_daily";
}
```

## 9. Integration / Dependencies

| Dependency | Nature | Risk/note |
|---|---|---|
| Swiggy Food MCP (`mcp.swiggy.com/food`) | 14 tools, per-user OAuth | Response schemas undocumented — live validation pending |
| Swiggy Instamart MCP (`/im`) | 13 tools | `update_cart` replace semantics; checkout spends money |
| Swiggy Dineout MCP (`/dineout`) | 8 tools | Free reservations only; 50+ cities coverage |
| Swiggy production access | Application + demo video, timeline unknown | **Start at end of Phase 1, in parallel** — gates launch |
| Swiggy auth | OAuth 2.1 PKCE, 5-day tokens, no refresh (v1.0) | Mid-flow re-auth UX required (F-34) |
| LLM provider | Extraction + matching only | Check region routing vs. DPDP residency (India/Singapore) |
| Instagram | None (deliberately) | User-pasted content only; no API, no scraping |
| Rate limits | Planned 120 req/min/user, unenforced; failures = generic UPSTREAM_ERROR | Backoff on reads; never blind-retry writes |

## 10. Shared Knowledge Base / References

Repo docs pack (source of truth for Claude Code development):

- `CLAUDE.md` — project router, invariants, dev conventions
- `swiggy-mcp-docs/FOOD_API.md`, `INSTAMART_API.md`, `DINEOUT_API.md` — per-server tool references
- `swiggy-mcp-docs/OPERATIONS.md` — auth, rate limits, errors, DPDP compliance, go-live checklist
- `GUARDRAILS.md` — production guardrails (11 items, priority-ordered)
- `ARCHITECTURE.md` — components, token-economy rules, build order, live-validation checklist
- `TECH_STACK.md` — framework/hosting/DB/LLM decisions
- `DESIGN_RULES.md` — design tokens, component rules, trade-dress DO-NOTs
- Swiggy Builders docs: https://mcp.swiggy.com/builders/docs/

## 11. Edge Cases

11.1 **Reel has no real recipe** (ASMR/plating-only video): extraction confidence low → fall back to dish-name identification → offer the standard recipe with "recipe inferred, not from the reel" label.

11.2 **Address out of serviceability** for one leg: render the other legs; show explicit "Instamart doesn't serve this address" rather than an empty card.

11.3 **Dish not on any nearby menu** (niche reel dish): Order card shows nearest-match dishes with "closest matches" label; Cook card becomes the hero.

11.4 **Pack-size distortion** (₹15 of turmeric needs a ₹90 pack): per-serving math handles the headline; basket total honesty (F-11) handles checkout; "pantry staple?" hint reduces basket shock.

11.5 **Checkout timeout / UPSTREAM_ERROR after write**: never blind-retry — query get_orders/get_booking_status with the idempotency context; if landed, resume tracking; if not, offer retry (F-30).

11.6 **Token expiry mid-flow**: state preserved, re-auth prompt, resume at the same screen (F-34).

11.7 **Cart drift** (Instamart cart edited in the Swiggy app concurrently): get_cart diff fails against local model → block checkout, show diff, ask user to reconcile (F-27).

11.8 **Order total exceeds ₹1000 cap**: pre-confirmation block with message; suggest splitting or removing items (F-18).

11.9 **Veg-only user, non-veg dish**: veg filter passthrough on Food; recipe offers veg variant if one exists in cache; never silently substitute.

11.10 **Dineout city not covered** (50+ cities only): hide the leg with a note, don't show empty results as "no restaurants".

11.11 **Same reel, different city**: recipe cache hits globally; SKU/price data re-resolved per city (cache key includes city).

## 12. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Latency | Cached dish → full comparison < 10s p50; reel extraction < 30s p50; cards render progressively |
| Cost | < ₹1 median LLM cost per new-dish comparison; ~₹0 for cached dishes; cache hit rate > 60% by Phase 2 exit |
| Accuracy | No fabricated numbers: omit fields the API doesn't return; all prices labeled with fee-exclusion status; recipe confidence surfaced |
| Safety | Zero write calls without explicit confirmation (F-29); spend caps on by default; idempotent writes |
| Security | Tokens encrypted at rest, never logged; HTTPS only; no PII in analytics |
| Compliance | DPDP 2023 data-processor posture for Swiggy data; India/Singapore processing only; no training/analytics on Swiggy data without consent + DPA; Instagram content processed only when user-provided |
| Availability | Read-path degradation: if one leg fails, others still render; Swiggy SLA 99.9% upstream |
| Auditability | Every write call logged with idempotency key, confirmation timestamp, and pre-call guard results |

## 13. Phased Rollout

**Phase 1 — Dish-name loop + live validation (weeks 1–3)**
Dish-name input → precomputed/LLM recipe → 3-card comparison → Food ordering end-to-end with all guardrails (confirm gates, spend caps, idempotency). Run the live-validation checklist (ARCHITECTURE.md) against real MCP responses; update docs pack; resolve the fee/ETA question and adjust F-10/F-12. Record demo video, **submit Swiggy production access application**.
*Goal: real end-to-end order placed safely; production application in Swiggy's queue.*

**Phase 2 — Cook leg (weeks 3–6)**
Ingredient Matcher, pantry checklist, per-serving pricing, Instamart cart with full-state model and verification, caches live (dish, SKU, top-200 seed).
*Goal: recipe→verified Instamart cart conversion working; cache hit rate instrumented.*

**Phase 3 — Reel engine (weeks 6–10)**
Recipe Service handles pasted links + uploads: transcription, extraction, confidence routing, reel-URL cache. Recipe confirm/edit UX. Dineout leg completed (slots + free booking).
*Goal: the moat exists — reel→comparison under 30s; full three-leg product.*

**Phase 4 — Launch + distribution (weeks 10–14)**
Production credentials go-live, shareable comparison URLs, PWA polish, creator outreach (reels that link to their shoppable recipe). Explore monetization: Swiggy affiliate terms, Recipe Service B2B API.
*Goal: public launch; first organic loop via shared comparisons/creator links.*

## 14. Success Metrics

| Metric | Phase 1 target | Phase 3 target | Phase 4 target |
|---|---|---|---|
| Craving → comparison completion rate | 70% (internal) | 80% | 85% |
| Comparison → action rate (any leg started) | — | 25% | 35% |
| Cook-leg share of actions (validates the thesis) | — | ≥15% | ≥20% |
| Reel extraction success (usable recipe, no edit) | — | 75% | 85% |
| Cache hit rate (recipe) | 40% | 60% | 75% |
| Median LLM cost per comparison | < ₹2 | < ₹1 | < ₹0.5 |
| Double-order / wrong-address incidents | 0 | 0 | 0 |
| Comparisons shared (viral loop) | — | — | 10% of comparisons |

---

## Appendix A — Decisions log

| Decision | Choice | Rationale |
|---|---|---|
| MVP scope | Full flow (reel + 3-way + effort/time) | Founder call; complete vision for demo video; council preferred narrower wedge — risk accepted |
| Platform | Web app / PWA | Fastest to ship; mobile app and WhatsApp deferred; Claude-skill route has distribution problem |
| Intent | Real startup | Moat = Recipe Service as separable API; comparison layer accepted as clonable |
| Cook-leg pricing | Per-serving headline + basket total at cart handoff | Per-serving alone is a trust risk (₹140/serving vs ₹580 checkout) |
| Reel ingestion | Paste-link/upload only, permanent | Instagram ToS; no server-side scraping ever |
| Live API validation | Deferred to Phase 1 (device constraint) | Docs don't document response payloads; F-10/F-12 written defensively pending validation |
| Token economy | LLM only for extraction + SKU matching; two-tier models; permanent caches | Bootstrapped; cached dishes must cost ~zero |
| Tech stack | Next.js/Vercel bom1/Supabase Mumbai/Upstash/official MCP SDK/Groq Whisper/cheap-tier LLMs | Council decision — see TECH_STACK.md |
| Design language | Swiggy-adjacent tokens (shifted hexes), Sora font, cards+bottom sheets; 4 trade-dress DO-NOTs | Must pass Swiggy's own review — see DESIGN_RULES.md |

## Appendix B — Open items (blocking PRD → Approved)

1. Live validation of response payloads (fee/ETA/distance fields) — checklist in ARCHITECTURE.md
2. Swiggy affiliate/commission terms for MCP builders — unclear from docs; ask builders@swiggy.in
3. LLM provider region routing vs. DPDP residency requirement
4. Swiggy production review criteria/timeline — surfaces after demo-video submission
