/**
 * Cart store — client-side source of truth (GUARDRAILS #2).
 * Full state sent on every mutation; never partial updates.
 * Tracks Instamart and Food carts separately.
 */

import { create } from "zustand";
import type { CartState, CartItem } from "@/lib/types";
import { nanoid } from "nanoid";

interface CartStore {
  food: CartState | null;
  instamart: CartState | null;
  lastCartVerified: boolean; // false if get_cart diff failed

  // Food cart actions
  initFoodCart: (restaurantId: string, addressId: string) => void;
  addFoodItem: (item: CartItem) => void;
  updateFoodItem: (productId: string, quantity: number) => void;
  removeFoodItem: (productId: string) => void;
  clearFoodCart: () => void;
  markFoodCartVerified: () => void;
  markFoodCartDrifted: () => void;

  // Instamart cart actions (full-state replace)
  setInstamartCart: (items: CartItem[], addressId: string) => void;
  updateInstamartItem: (spinId: string, quantity: number) => void;
  removeInstamartItem: (spinId: string) => void;
  clearInstamartCart: () => void;
  markInstamartVerified: () => void;
  markInstamartDrifted: () => void;

  rotateIdempotencyKey: (vertical: "food" | "instamart") => void;
}

export const useCartStore = create<CartStore>((set, get) => ({
  food: null,
  instamart: null,
  lastCartVerified: true,

  // ─── Food ────────────────────────────────────────────────────────────────
  initFoodCart: (restaurantId, addressId) =>
    set({
      food: {
        vertical: "food",
        items: [],
        restaurantId,
        addressId,
        idempotencyKey: nanoid(),
      },
    }),

  addFoodItem: (item) =>
    set((s) => {
      if (!s.food) return s;
      const existing = s.food.items.find((i) => i.productId === item.productId);
      const items = existing
        ? s.food.items.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          )
        : [...s.food.items, item];
      return { food: { ...s.food, items } };
    }),

  updateFoodItem: (productId, quantity) =>
    set((s) => {
      if (!s.food) return s;
      const items =
        quantity <= 0
          ? s.food.items.filter((i) => i.productId !== productId)
          : s.food.items.map((i) =>
              i.productId === productId ? { ...i, quantity } : i
            );
      return { food: { ...s.food, items } };
    }),

  removeFoodItem: (productId) =>
    set((s) => {
      if (!s.food) return s;
      return { food: { ...s.food, items: s.food.items.filter((i) => i.productId !== productId) } };
    }),

  clearFoodCart: () => set({ food: null }),
  markFoodCartVerified: () =>
    set((s) => ({
      food: s.food ? { ...s.food, lastVerifiedAt: new Date().toISOString() } : null,
      lastCartVerified: true,
    })),
  markFoodCartDrifted: () => set({ lastCartVerified: false }),

  // ─── Instamart (full-state replace) ─────────────────────────────────────
  setInstamartCart: (items, addressId) =>
    set({
      instamart: {
        vertical: "instamart",
        items,
        addressId,
        idempotencyKey: get().instamart?.idempotencyKey ?? nanoid(),
      },
    }),

  updateInstamartItem: (spinId, quantity) =>
    set((s) => {
      if (!s.instamart) return s;
      const items =
        quantity <= 0
          ? s.instamart.items.filter((i) => i.spinId !== spinId)
          : s.instamart.items.map((i) =>
              i.spinId === spinId ? { ...i, quantity } : i
            );
      return { instamart: { ...s.instamart, items } };
    }),

  removeInstamartItem: (spinId) =>
    set((s) => {
      if (!s.instamart) return s;
      return {
        instamart: {
          ...s.instamart,
          items: s.instamart.items.filter((i) => i.spinId !== spinId),
        },
      };
    }),

  clearInstamartCart: () => set({ instamart: null }),
  markInstamartVerified: () =>
    set((s) => ({
      instamart: s.instamart
        ? { ...s.instamart, lastVerifiedAt: new Date().toISOString() }
        : null,
      lastCartVerified: true,
    })),
  markInstamartDrifted: () => set({ lastCartVerified: false }),

  rotateIdempotencyKey: (vertical) =>
    set((s) => {
      if (vertical === "food" && s.food) {
        return { food: { ...s.food, idempotencyKey: nanoid() } };
      }
      if (vertical === "instamart" && s.instamart) {
        return { instamart: { ...s.instamart, idempotencyKey: nanoid() } };
      }
      return s;
    }),
}));
