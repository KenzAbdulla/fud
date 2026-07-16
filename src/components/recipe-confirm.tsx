"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import type { Recipe } from "@/lib/types";
import { scaleRecipe } from "@/lib/recipe/service";

interface Props {
  recipe: Recipe;
  onConfirm: (recipe: Recipe) => void;
  onClose: () => void;
}

/** F-05: Show extracted recipe for user confirmation/edit before fan-out */
export function RecipeConfirm({ recipe, onConfirm, onClose }: Props) {
  const [servings, setServings] = useState(recipe.servings);
  const scaled = servings !== recipe.servings ? scaleRecipe(recipe, servings) : recipe;

  return (
    <BottomSheet open title="Is this the right recipe?" onClose={onClose}>
      <div className="space-y-4">
        {/* Confidence indicator */}
        {recipe.confidence < 0.8 && (
          <p className="text-xs text-[#F43F5E] bg-[#F43F5E]/10 rounded-card px-3 py-2">
            Recipe inferred — not from the reel directly. Confidence: {Math.round(recipe.confidence * 100)}%
          </p>
        )}

        <div>
          <h2 className="text-xl font-semibold text-[#1F2937]">{scaled.dish}</h2>
          <p className="text-sm text-[#6B7280]">
            {scaled.prepTimeMin} min prep · {scaled.ingredients.length} ingredients
          </p>
        </div>

        {/* Serving adjuster */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#6B7280]">Servings</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setServings((s) => Math.max(1, s - 1))}
              className="w-7 h-7 rounded-full bg-[#F3F4F6] text-[#1F2937] font-semibold text-sm flex items-center justify-center"
            >
              −
            </button>
            <span className="w-5 text-center font-semibold text-[#1F2937]">{servings}</span>
            <button
              onClick={() => setServings((s) => Math.min(20, s + 1))}
              className="w-7 h-7 rounded-full bg-[#F3F4F6] text-[#1F2937] font-semibold text-sm flex items-center justify-center"
            >
              +
            </button>
          </div>
        </div>

        {/* Ingredients list */}
        <div>
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">
            Ingredients
          </p>
          <ul className="space-y-1.5">
            {scaled.ingredients.map((ing) => (
              <li
                key={ing.name}
                className="flex justify-between text-sm text-[#1F2937]"
              >
                <span>
                  {ing.name}
                  {ing.optional && (
                    <span className="text-xs text-[#9CA3AF] ml-1">(optional)</span>
                  )}
                </span>
                <span className="text-[#6B7280]">
                  {ing.quantity} {ing.unit}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <Button
          variant="order"
          size="full"
          onClick={() => onConfirm(scaled)}
        >
          Yes, compare options →
        </Button>
        <button
          onClick={onClose}
          className="w-full text-sm text-[#6B7280] py-2"
        >
          Enter a different dish
        </button>
      </div>
    </BottomSheet>
  );
}
