"use client";

import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { ConfirmGate } from "@/components/order/confirm-gate";
import type { ComparisonLegs, SkuMatch, SkuCandidate, Recipe } from "@/lib/types";
import { formatINR } from "@/lib/utils";
import { usePantryStore } from "@/store/pantry";
import { useToast } from "@/components/ui/toaster";
import { generateIdempotencyKey } from "@/lib/guards/idempotency";

interface Props {
  leg: ComparisonLegs["cook"];
  recipe: Recipe;
  onClose: () => void;
}

/** F-25, F-26, F-27, F-28 — Cook leg: pantry check → basket → Instamart cart */
export function PantryChecklist({ leg, recipe, onClose }: Props) {
  const { isOwned, toggleOwned } = usePantryStore();
  const { toast } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);

  // Selected SKU per ingredient (default = cheapest)
  const [localSkus, setLocalSkus] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const match of leg.matches) {
      const cheapest = [...match.candidates].sort((a, b) => a.price - b.price)[0];
      if (cheapest?.spinId) init[match.ingredientName] = cheapest.spinId;
    }
    return init;
  });

  // Live basket computation (F-25: uncheck → reprice live)
  const basketItems = useMemo(() => {
    return leg.matches
      .filter((m) => !isOwned(m.ingredientName) && !m.unavailable)
      .map((m) => {
        const spinId = localSkus[m.ingredientName];
        const sku = m.candidates.find((c) => c.spinId === spinId) ?? m.candidates[0];
        return { match: m, sku };
      })
      .filter((x) => x.sku);
  }, [leg.matches, localSkus, isOwned]);

  const basketTotal = useMemo(
    () => basketItems.reduce((sum, { sku }) => sum + (sku?.price ?? 0), 0),
    [basketItems]
  );
  const perServing = Math.round(basketTotal / recipe.servings);

  // Instamart cart checkout
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const idempotencyKey = generateIdempotencyKey();
      const res = await fetch("/api/order/instamart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId: "addr_home_001",
          items: basketItems.map(({ sku }) => ({
            spinId: sku!.spinId,
            quantity: 1,
          })),
          idempotencyKey,
          userConfirmed: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Instamart order placed!", description: `${basketItems.length} items · ${formatINR(basketTotal)}` });
      setShowConfirm(false);
      onClose();
    },
    onError: (err) => {
      toast({ title: "Checkout failed", description: String(err), variant: "error" });
      setShowConfirm(false);
    },
  });

  return (
    <>
      <BottomSheet open title={`Cook ${recipe.dish}`} onClose={onClose}>
        <div className="space-y-4">
          {/* Instructions */}
          <p className="text-xs text-[#6B7280]">
            Uncheck ingredients you already have. Basket reprices live.
          </p>

          {/* Ingredient rows */}
          <div className="space-y-3">
            {leg.matches.map((match) => (
              <IngredientRow
                key={match.ingredientName}
                match={match}
                owned={isOwned(match.ingredientName)}
                selectedSpinId={localSkus[match.ingredientName] ?? null}
                onToggle={() => toggleOwned(match.ingredientName)}
                onSkuChange={(spinId) =>
                  setLocalSkus((prev) => ({ ...prev, [match.ingredientName]: spinId }))
                }
              />
            ))}
          </div>

          {/* Basket summary (F-11: per-serving headline + basket total always shown) */}
          <div className="border-t border-[#E5E7EB] pt-3 space-y-1.5 reprice-transition">
            <div className="flex justify-between text-sm">
              <span className="text-[#6B7280]">Basket total</span>
              <span className="font-bold text-[#1F2937]">{formatINR(basketTotal)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#6B7280]">Per serving</span>
              <span className="text-[#2563EB] font-semibold">{formatINR(perServing)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#6B7280]">Prep time</span>
              <span className="text-[#6B7280]">{recipe.prepTimeMin} min</span>
            </div>
          </div>

          <Button
            variant="cook"
            size="full"
            disabled={basketItems.length === 0}
            onClick={() => setShowConfirm(true)}
          >
            Build my cart · {formatINR(basketTotal)}
          </Button>
        </div>
      </BottomSheet>

      {showConfirm && (
        <ConfirmGate
          title="Confirm Instamart order"
          lines={[
            { label: "Items", value: `${basketItems.length} ingredients` },
            { label: "Address", value: "Home · 12, MG Road, Bengaluru" },
            { label: "Per serving", value: formatINR(perServing) },
            { label: "Basket total", value: formatINR(basketTotal) },
          ]}
          ctaLabel={`Place order · ${formatINR(basketTotal)}`}
          ctaVariant="cook"
          isLoading={checkoutMutation.isPending}
          onConfirm={() => checkoutMutation.mutate()}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}

// ─── Ingredient row ────────────────────────────────────────────────────────────

function IngredientRow({
  match,
  owned,
  selectedSpinId,
  onToggle,
  onSkuChange,
}: {
  match: SkuMatch;
  owned: boolean;
  selectedSpinId: string | null;
  onToggle: () => void;
  onSkuChange: (spinId: string) => void;
}) {
  const selectedSku = match.candidates.find((c) => c.spinId === selectedSpinId) ?? match.candidates[0];

  return (
    <div className={`reprice-transition ${owned ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={!owned}
          onChange={onToggle}
          className="mt-0.5 w-4 h-4 rounded accent-[#2563EB] flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline">
            <span className={`text-sm font-medium text-[#1F2937] ${owned ? "line-through" : ""}`}>
              {match.ingredientName}
            </span>
            {!owned && selectedSku && (
              <span className="font-bold text-[#1F2937] text-sm">
                {formatINR(selectedSku.price)}
              </span>
            )}
          </div>

          {match.unavailable && (
            <p className="text-xs text-[#F43F5E] mt-0.5">
              {match.substituteHint ?? "Unavailable — check Swiggy app"}
            </p>
          )}

          {/* SKU selector (2-4 options, F-23) */}
          {!owned && !match.unavailable && match.candidates.length > 0 && (
            <select
              value={selectedSpinId ?? ""}
              onChange={(e) => onSkuChange(e.target.value)}
              className="mt-1 w-full text-xs text-[#6B7280] border border-[#E5E7EB] rounded-[8px] px-2 py-1 bg-white focus:outline-none"
            >
              {match.candidates.map((c) => (
                <option key={c.spinId} value={c.spinId ?? ""}>
                  {c.brand} · {c.packSize} · {formatINR(c.price)}
                  {c.usesPerPack > 1 ? ` (≈${c.usesPerPack} uses)` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}

