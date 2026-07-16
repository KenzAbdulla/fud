# Design rules

Goal: look **at home next to Swiggy** — warm, rounded, card-and-bottom-sheet Indian food-app language — while staying legally distinct. This app goes through Swiggy's own production review; pixel-level distinctiveness is the legal safety margin. The four DO-NOT rules at the bottom are hard gates.

## Design tokens

### Colors

```css
:root {
  /* Leg accents — Swiggy-adjacent, deliberately NOT their exact hexes */
  --leg-order:   #F97316;  /* orange-500. Swiggy Food is #FC8019 — do not use exactly */
  --leg-cook:    #2563EB;  /* blue-600. Instamart rebranded to blue (2025) */
  --leg-dineout: #F43F5E;  /* rose-500. Dineout is #FA5754 — do not use exactly */

  --surface:        #F8F7F5;  /* warm off-white, never stark white page bg */
  --card:           #FFFFFF;
  --text-primary:   #1F2937;
  --text-secondary: #6B7280;

  /* FSSAI-mandated food-type markers (regulatory, use exactly) */
  --veg:    #008000;  /* green square + circle */
  --nonveg: #963A2F;  /* brown square + triangle */
}
```

Primary brand color = `--leg-order` orange. Each comparison card and its CTA tints to its leg accent — the 3-way screen reads orange / blue / rose at a glance.

### Typography

```css
font-family: "Sora", "Poppins", system-ui, sans-serif;
```

Sora (free, Google Fonts) has the geometric-sans, rounded-terminal character of Swiggy's modified-Futura wordmark without being a clone. Weights: 400 body, 600 titles/buttons, 700 prices only. Sizes: 12/14/16/20/24 — nothing bigger; food apps are dense.

### Spacing, radius, shadow

| Token | Value |
|---|---|
| Spacing scale | 4px base: 4 / 8 / 12 / 16 / 24 / 32 / 48 (Tailwind defaults) |
| Radius — cards | 16px |
| Radius — buttons/CTAs | 12px |
| Radius — bottom sheets | 24px top corners only |
| Radius — chips/tags | 999px (pill) |
| Shadow — cards | `0 2px 8px rgba(0,0,0,0.08)` (flat-ish, subtle lift) |
| Shadow — bottom sheets | `0 -4px 16px rgba(0,0,0,0.12)` |

No multi-layer or heavy shadows. Swiggy's surfaces are soft and flat.

## Component rules

**Comparison cards (the core screen).** Three stacked cards, mobile-first, one per leg, tinted borders/CTAs in leg accent. Layout inside a card: leg label chip top-left, headline cost bottom-right (bold 700), meta row (time, distance, rating) in `--text-secondary` 14px. Cost caveats ("excl. fees", "per serving · basket ₹412") render inline next to the number at 12px — never in a footer (GUARDRAILS.md #6).

**Bottom sheets, not modals.** All choice/checkout flows (SKU options per ingredient, slot picker, confirmation gates) are bottom sheets with 24px top radius and a drag handle. This is the dominant Indian food-app interaction pattern.

**CTAs.** Full-width on mobile, solid fill in leg accent, white 600-weight label, 12px radius, 48px min height. One primary CTA per screen. Confirmation-gate CTAs (anything that spends money) state the amount in the label: "Place order · ₹412".

**Price display.** `₹` + bold; struck-through MRP in `--text-secondary` beside discounted price; savings as a pill chip in leg accent at 10% tint background.

**Veg/non-veg markers.** FSSAI Labelling & Display Regulations 2020: green-bordered square with green filled circle (veg), brown square with brown triangle (non-veg). Use exactly — regulatory, not stylistic — on every dish and SKU row. Instant "real Indian food app" credibility.

**Pantry checklist (cook leg).** Ingredient rows: checkbox → name + needed qty → SKU dropdown (2–4 options, pack size + price each) → row price. Unchecking strikes the row and live-reprices the basket total, animated.

**Imagery.** Food photos on cards: square or 16:9, 12px radius, object-fit cover. No illustrations of food where a real photo exists (Swiggy is photo-forward). Empty/error states may use flat illustrations.

**Motion.** 150–200ms ease-out on sheets and reprice animations. Skeleton shimmer for the progressive card loading (legs resolve in parallel, cards fill in as they land — never block all three on the slowest).

## DO-NOT rules (hard gates before Swiggy review)

1. **Never use Swiggy's exact hexes** — `#FC8019` (Food) or `#FA5754` (Dineout) — as any token. Our shifted values must stay distinguishable side-by-side.
2. **No Swiggy marks** — no S-pin, bird/arrow icon shapes, or any wordmark lockup resembling Swiggy/Instamart/Dineout logos, even redrawn or recolored.
3. **No confusable naming** — app name and in-app leg labels must not be phonetically or visually close to "Swiggy", "Instamart", or "Dineout". Leg labels are "Order it / Cook it / Go out" — attribution appears only as plain text ("via Swiggy", "fulfilled on Instamart") where factually required.
4. **No 1:1 skin** — approximate the category language (rounded cards, bottom sheets, warm orange-family CTAs), never replicate Swiggy's exact radius+shadow+font combination pixel-for-pixel.
