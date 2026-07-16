/**
 * Pantry store — locally persisted ingredient checklist (F-25).
 * Unchecked = "I have this at home". Basket live-reprices on change.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PantryStore {
  /** Set of ingredient names the user owns (unchecked from basket) */
  ownedIngredients: Set<string>;

  /** Selected SKU candidate per ingredient (spinId) */
  selectedSkus: Record<string, string>; // ingredientName → spinId

  addToOwned: (name: string) => void;
  removeFromOwned: (name: string) => void;
  toggleOwned: (name: string) => void;
  isOwned: (name: string) => boolean;

  setSelectedSku: (ingredientName: string, spinId: string) => void;
  getSelectedSku: (ingredientName: string) => string | null;

  clearOwned: () => void;
}

export const usePantryStore = create<PantryStore>()(
  persist(
    (set, get) => ({
      ownedIngredients: new Set<string>(),
      selectedSkus: {},

      addToOwned: (name) =>
        set((s) => {
          const next = new Set(s.ownedIngredients);
          next.add(name.toLowerCase());
          return { ownedIngredients: next };
        }),

      removeFromOwned: (name) =>
        set((s) => {
          const next = new Set(s.ownedIngredients);
          next.delete(name.toLowerCase());
          return { ownedIngredients: next };
        }),

      toggleOwned: (name) => {
        const lower = name.toLowerCase();
        if (get().ownedIngredients.has(lower)) {
          get().removeFromOwned(name);
        } else {
          get().addToOwned(name);
        }
      },

      isOwned: (name) => get().ownedIngredients.has(name.toLowerCase()),

      setSelectedSku: (ingredientName, spinId) =>
        set((s) => ({
          selectedSkus: { ...s.selectedSkus, [ingredientName.toLowerCase()]: spinId },
        })),

      getSelectedSku: (ingredientName) =>
        get().selectedSkus[ingredientName.toLowerCase()] ?? null,

      clearOwned: () => set({ ownedIngredients: new Set() }),
    }),
    {
      name: "ctp-pantry",
      // Zustand persist doesn't handle Set by default — serialize manually
      storage: {
        getItem: (key) => {
          const raw = localStorage.getItem(key);
          if (!raw) return null;
          const parsed = JSON.parse(raw) as { state: { ownedIngredients: string[]; selectedSkus: Record<string, string> } };
          return {
            state: {
              ...parsed.state,
              ownedIngredients: new Set(parsed.state.ownedIngredients),
            },
          };
        },
        setItem: (key, value) => {
          const data = value as { state: { ownedIngredients: Set<string>; selectedSkus: Record<string, string> } };
          localStorage.setItem(
            key,
            JSON.stringify({
              state: {
                ...data.state,
                ownedIngredients: Array.from(data.state.ownedIngredients),
              },
            })
          );
        },
        removeItem: (key) => localStorage.removeItem(key),
      },
    }
  )
);
