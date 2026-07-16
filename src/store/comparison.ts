/**
 * Comparison store — craving input, recipe, comparison results, address.
 */

import { create } from "zustand";
import type { Comparison, Recipe, SwiggyAddress } from "@/lib/types";

interface ComparisonState {
  // Input
  dish: string;
  reelUrl: string;
  servings: number;
  vegOnly: boolean;

  // Address
  addresses: SwiggyAddress[];
  selectedAddressId: string | null;

  // Recipe (confirmed by user, F-05)
  recipe: Recipe | null;
  recipeConfirmed: boolean;

  // Comparison result
  comparison: Comparison | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setDish: (dish: string) => void;
  setReelUrl: (url: string) => void;
  setServings: (n: number) => void;
  setVegOnly: (v: boolean) => void;
  setAddresses: (addresses: SwiggyAddress[]) => void;
  setSelectedAddress: (id: string) => void;
  setRecipe: (recipe: Recipe) => void;
  confirmRecipe: () => void;
  setComparison: (c: Comparison) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  reset: () => void;
}

const initial = {
  dish: "",
  reelUrl: "",
  servings: 2,
  vegOnly: false,
  addresses: [],
  selectedAddressId: null,
  recipe: null,
  recipeConfirmed: false,
  comparison: null,
  isLoading: false,
  error: null,
};

export const useComparisonStore = create<ComparisonState>((set) => ({
  ...initial,

  setDish: (dish) => set({ dish }),
  setReelUrl: (reelUrl) => set({ reelUrl }),
  setServings: (servings) => set({ servings }),
  setVegOnly: (vegOnly) => set({ vegOnly }),
  setAddresses: (addresses) => set({ addresses }),
  setSelectedAddress: (selectedAddressId) => set({ selectedAddressId }),
  setRecipe: (recipe) => set({ recipe }),
  confirmRecipe: () => set({ recipeConfirmed: true }),
  setComparison: (comparison) => set({ comparison, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  reset: () => set(initial),
}));
