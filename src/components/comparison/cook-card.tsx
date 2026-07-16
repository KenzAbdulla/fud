"use client";

import { useState } from "react";
import type { ComparisonLegs, Recipe } from "@/lib/types";
import { formatINR } from "@/lib/utils";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { PantryChecklist } from "@/components/cook/pantry-checklist";
import { Clock } from "lucide-react";

interface Props {
  leg: ComparisonLegs["cook"];
  recipe: Recipe;
}

export function CookCard({ leg, recipe }: Props) {
  const [showCook, setShowCook] = useState(false);

  if (leg.status === "loading") {
    return (
      <div className="bg-white rounded-card shadow-card p-4 border border-[#2563EB]/20">
        <div className="flex justify-between items-start mb-3">
          <Chip variant="cook">Cook it</Chip>
          <div className="skeleton w-20 h-6" />
        </div>
        <div className="space-y-2">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (leg.status === "error" || leg.matches.length === 0) {
    return (
      <div className="bg-white rounded-card shadow-card p-4 border border-[#E5E7EB]">
        <Chip variant="cook">Cook it</Chip>
        <p className="text-sm text-[#9CA3AF] mt-2">
          Ingredient pricing unavailable for your area
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-card shadow-card p-4 border border-[#2563EB]/20">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <Chip variant="cook">Cook it</Chip>
          <div className="text-right">
            <div className="text-xl font-bold text-[#1F2937]">
              {formatINR(leg.perServing)}
              <span className="text-sm font-normal text-[#6B7280]">/serving</span>
            </div>
            <div className="text-[10px] text-[#9CA3AF]">
              basket {formatINR(leg.basketTotal)}
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="flex gap-3 text-xs text-[#6B7280] mb-3">
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {leg.prepTimeMin} min prep
          </span>
          <span>{leg.matches.length} ingredients to buy</span>
        </div>

        {/* Ingredient summary */}
        <div className="space-y-1 mb-4">
          {leg.matches.slice(0, 4).map((match) => {
            const cheapest = match.candidates.sort((a, b) => a.price - b.price)[0];
            return (
              <div key={match.ingredientName} className="flex justify-between text-xs">
                <span className="text-[#6B7280]">{match.ingredientName}</span>
                <span className="text-[#1F2937]">
                  {match.unavailable ? (
                    <span className="text-[#F43F5E]">Unavailable</span>
                  ) : (
                    cheapest ? formatINR(cheapest.price) : "—"
                  )}
                </span>
              </div>
            );
          })}
          {leg.matches.length > 4 && (
            <p className="text-xs text-[#9CA3AF]">
              +{leg.matches.length - 4} more ingredients
            </p>
          )}
        </div>

        <Button variant="cook" size="full" onClick={() => setShowCook(true)}>
          Cook it · {formatINR(leg.perServing)}/serving
        </Button>
      </div>

      {showCook && (
        <PantryChecklist
          leg={leg}
          recipe={recipe}
          onClose={() => setShowCook(false)}
        />
      )}
    </>
  );
}
