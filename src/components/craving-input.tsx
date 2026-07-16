"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useComparisonStore } from "@/store/comparison";
import { Button } from "@/components/ui/button";
import { ComparisonGrid } from "@/components/comparison/comparison-grid";
import { RecipeConfirm } from "@/components/recipe-confirm";
import { ReelInput } from "@/components/reel-input";
import type { Comparison, Recipe } from "@/lib/types";
import { AddressPicker } from "@/components/address-picker";
import { Search, Link2 } from "lucide-react";

type InputMode = "dish" | "reel";

export function CravingInput() {
  const [mode, setMode] = useState<InputMode>("dish");
  const [input, setInput] = useState("");
  const [servings, setServings] = useState(2);
  const [vegOnly, setVegOnly] = useState(false);
  const [showRecipeConfirm, setShowRecipeConfirm] = useState(false);

  const {
    recipe,
    recipeConfirmed,
    comparison,
    isLoading,
    error,
    setRecipe,
    confirmRecipe,
    setComparison,
    setLoading,
    setError,
  } = useComparisonStore();

  // Recipe fetch
  const recipeMutation = useMutation({
    mutationFn: async (): Promise<Recipe> => {
      const res = await fetch("/api/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "dish"
            ? { dish: input, servings }
            : { reelUrl: input, servings }
        ),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { recipe: Recipe };
      return data.recipe;
    },
    onSuccess: (recipe) => {
      setRecipe(recipe);
      setShowRecipeConfirm(true);
    },
    onError: (err) => setError(String(err)),
  });

  // Comparison fetch (after recipe confirmed)
  const compareMutation = useMutation({
    mutationFn: async (confirmedRecipe: Recipe): Promise<Comparison> => {
      setLoading(true);
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dish: confirmedRecipe.dish,
          addressId: "addr_home_001", // TODO: address picker
          servings: confirmedRecipe.servings,
          vegOnly,
          city: "bengaluru",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { comparison: Comparison };
      return data.comparison;
    },
    onSuccess: (comparison) => setComparison(comparison),
    onError: (err) => setError(String(err)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setError(null);
    recipeMutation.mutate();
  };

  const handleRecipeConfirmed = () => {
    setShowRecipeConfirm(false);
    confirmRecipe();
    if (recipe) compareMutation.mutate(recipe);
  };

  if (comparison && recipeConfirmed) {
    return <ComparisonGrid comparison={comparison} />;
  }

  return (
    <div>
      {/* Mode switcher */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("dish")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-chip text-sm font-semibold transition-colors ${
            mode === "dish"
              ? "bg-[#F97316] text-white"
              : "bg-white text-[#6B7280] border border-[#E5E7EB]"
          }`}
        >
          <Search size={14} />
          Dish name
        </button>
        <button
          onClick={() => setMode("reel")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-chip text-sm font-semibold transition-colors ${
            mode === "reel"
              ? "bg-[#F97316] text-white"
              : "bg-white text-[#6B7280] border border-[#E5E7EB]"
          }`}
        >
          <Link2 size={14} />
          Paste reel
        </button>
      </div>

      {/* Options row — shared between modes */}
      <div className="flex items-center gap-3 mb-3">
        <select
          value={servings}
          onChange={(e) => setServings(Number(e.target.value))}
          className="h-8 px-2 rounded-[8px] border border-[#E5E7EB] bg-white text-sm text-[#1F2937] focus:outline-none"
        >
          {[1, 2, 3, 4, 6, 8].map((n) => (
            <option key={n} value={n}>
              {n} serving{n > 1 ? "s" : ""}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-[#6B7280] cursor-pointer">
          <input
            type="checkbox"
            checked={vegOnly}
            onChange={(e) => setVegOnly(e.target.checked)}
            className="w-4 h-4 rounded accent-[#008000]"
          />
          Veg only
        </label>
      </div>

      {mode === "dish" ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="paneer butter masala, biryani, chole bhature..."
            className="w-full h-12 px-4 rounded-card border border-[#E5E7EB] bg-white text-[#1F2937] text-base placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30"
            autoFocus
          />
          <Button
            type="submit"
            variant="order"
            size="full"
            disabled={!input.trim() || recipeMutation.isPending || compareMutation.isPending}
          >
            {recipeMutation.isPending
              ? "Getting recipe..."
              : compareMutation.isPending
              ? "Comparing options..."
              : "Find me options →"}
          </Button>
        </form>
      ) : (
        <ReelInput
          onRecipeExtracted={(recipe) => {
            setRecipe(recipe);
            setShowRecipeConfirm(true);
          }}
        />
      )}

      {error && (
        <p className="mt-3 text-sm text-[#F43F5E] bg-[#F43F5E]/10 rounded-card px-3 py-2">
          {error}
        </p>
      )}

      {/* Recipe confirm sheet */}
      {showRecipeConfirm && recipe && (
        <RecipeConfirm
          recipe={recipe}
          onConfirm={handleRecipeConfirmed}
          onClose={() => setShowRecipeConfirm(false)}
        />
      )}
    </div>
  );
}
