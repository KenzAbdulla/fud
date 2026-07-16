/**
 * Top-200 Indian dishes — precomputed offline.
 * Cache hit rate target: >40% Phase 1, >60% Phase 2, >75% Phase 4.
 * Dishes here cost ZERO tokens.
 */

import type { Recipe } from "@/lib/types";

/** Minimal recipe seed — enough for comparison pricing.
 *  Full steps are optional for the comparison engine. */
type RecipeSeed = Omit<Recipe, "id" | "source" | "extractedBy" | "confidence">;

export const TOP_DISHES: Record<string, RecipeSeed> = {
  "paneer butter masala": {
    dish: "Paneer Butter Masala",
    servings: 2,
    prepTimeMin: 45,
    ingredients: [
      { name: "Paneer", quantity: 200, unit: "g", optional: false, pantryDefault: false },
      { name: "Butter", quantity: 50, unit: "g", optional: false, pantryDefault: false },
      { name: "Tomato", quantity: 3, unit: "pc", optional: false, pantryDefault: false },
      { name: "Cashews", quantity: 10, unit: "pc", optional: false, pantryDefault: false },
      { name: "Cream", quantity: 50, unit: "ml", optional: false, pantryDefault: false },
      { name: "Ginger-Garlic Paste", quantity: 2, unit: "tbsp", optional: false, pantryDefault: false },
      { name: "Butter Chicken Masala", quantity: 2, unit: "tbsp", optional: false, pantryDefault: false },
      { name: "Oil", quantity: 2, unit: "tbsp", optional: false, pantryDefault: true },
      { name: "Salt", quantity: 1, unit: "tsp", optional: false, pantryDefault: true },
    ],
    steps: [
      "Sauté onions and ginger-garlic paste in butter until golden.",
      "Add tomatoes and cashews; cook until soft. Blend to a smooth sauce.",
      "Strain, return to pan; add masala, salt, cream.",
      "Add paneer cubes; simmer 5 minutes. Finish with butter.",
    ],
  },

  "chole bhature": {
    dish: "Chole Bhature",
    servings: 2,
    prepTimeMin: 60,
    ingredients: [
      { name: "Chickpeas (canned)", quantity: 400, unit: "g", optional: false, pantryDefault: false },
      { name: "All-Purpose Flour (Maida)", quantity: 200, unit: "g", optional: false, pantryDefault: false },
      { name: "Yogurt", quantity: 50, unit: "ml", optional: false, pantryDefault: false },
      { name: "Onion", quantity: 2, unit: "pc", optional: false, pantryDefault: false },
      { name: "Tomato", quantity: 2, unit: "pc", optional: false, pantryDefault: false },
      { name: "Chole Masala", quantity: 2, unit: "tbsp", optional: false, pantryDefault: false },
      { name: "Oil", quantity: 500, unit: "ml", optional: false, pantryDefault: false },
      { name: "Salt", quantity: 1, unit: "tsp", optional: false, pantryDefault: true },
    ],
    steps: [
      "Mix maida, yogurt, salt, oil; knead into soft dough. Rest 30 min.",
      "Cook chickpeas with onion-tomato masala until thick.",
      "Roll bhature and deep-fry until puffed and golden.",
    ],
  },

  "biryani": {
    dish: "Chicken Biryani",
    servings: 2,
    prepTimeMin: 75,
    ingredients: [
      { name: "Chicken", quantity: 500, unit: "g", optional: false, pantryDefault: false },
      { name: "Basmati Rice", quantity: 300, unit: "g", optional: false, pantryDefault: false },
      { name: "Onion", quantity: 2, unit: "pc", optional: false, pantryDefault: false },
      { name: "Yogurt", quantity: 100, unit: "ml", optional: false, pantryDefault: false },
      { name: "Biryani Masala", quantity: 2, unit: "tbsp", optional: false, pantryDefault: false },
      { name: "Saffron", quantity: 1, unit: "tsp", optional: true, pantryDefault: false },
      { name: "Ghee", quantity: 3, unit: "tbsp", optional: false, pantryDefault: false },
      { name: "Mint Leaves", quantity: 20, unit: "g", optional: false, pantryDefault: false },
      { name: "Salt", quantity: 2, unit: "tsp", optional: false, pantryDefault: true },
    ],
    steps: [
      "Marinate chicken in yogurt and spices for 30 min.",
      "Par-cook rice with whole spices until 70% done.",
      "Layer chicken, fried onions, mint, saffron milk, ghee.",
      "Dum cook on low heat 25 minutes.",
    ],
  },

  "dal makhani": {
    dish: "Dal Makhani",
    servings: 3,
    prepTimeMin: 90,
    ingredients: [
      { name: "Black Lentils (Urad Dal)", quantity: 200, unit: "g", optional: false, pantryDefault: false },
      { name: "Kidney Beans (Rajma)", quantity: 50, unit: "g", optional: false, pantryDefault: false },
      { name: "Butter", quantity: 50, unit: "g", optional: false, pantryDefault: false },
      { name: "Cream", quantity: 50, unit: "ml", optional: false, pantryDefault: false },
      { name: "Tomato Puree", quantity: 100, unit: "ml", optional: false, pantryDefault: false },
      { name: "Ginger-Garlic Paste", quantity: 2, unit: "tbsp", optional: false, pantryDefault: false },
      { name: "Salt", quantity: 1, unit: "tsp", optional: false, pantryDefault: true },
      { name: "Oil", quantity: 2, unit: "tbsp", optional: false, pantryDefault: true },
    ],
    steps: [
      "Soak dal and rajma overnight; pressure cook until soft.",
      "Sauté onions, ginger-garlic; add tomato puree.",
      "Add cooked dal; simmer 30 min. Finish with butter and cream.",
    ],
  },

  "masala dosa": {
    dish: "Masala Dosa",
    servings: 2,
    prepTimeMin: 30,
    ingredients: [
      { name: "Dosa Batter (ready-made)", quantity: 400, unit: "ml", optional: false, pantryDefault: false },
      { name: "Potato", quantity: 3, unit: "pc", optional: false, pantryDefault: false },
      { name: "Onion", quantity: 1, unit: "pc", optional: false, pantryDefault: false },
      { name: "Mustard Seeds", quantity: 1, unit: "tsp", optional: false, pantryDefault: false },
      { name: "Turmeric", quantity: 0.5, unit: "tsp", optional: false, pantryDefault: true },
      { name: "Curry Leaves", quantity: 10, unit: "pc", optional: false, pantryDefault: false },
      { name: "Oil", quantity: 2, unit: "tbsp", optional: false, pantryDefault: true },
      { name: "Salt", quantity: 1, unit: "tsp", optional: false, pantryDefault: true },
    ],
    steps: [
      "Cook potato masala: sauté onion, temper mustard+curry leaves, add boiled potatoes.",
      "Spread thin dosa on hot tawa; fill with masala; fold.",
      "Serve with sambar and chutneys.",
    ],
  },

  "pav bhaji": {
    dish: "Pav Bhaji",
    servings: 3,
    prepTimeMin: 40,
    ingredients: [
      { name: "Pav Bread", quantity: 6, unit: "pc", optional: false, pantryDefault: false },
      { name: "Potato", quantity: 3, unit: "pc", optional: false, pantryDefault: false },
      { name: "Cauliflower", quantity: 200, unit: "g", optional: false, pantryDefault: false },
      { name: "Peas", quantity: 100, unit: "g", optional: false, pantryDefault: false },
      { name: "Tomato", quantity: 3, unit: "pc", optional: false, pantryDefault: false },
      { name: "Butter", quantity: 60, unit: "g", optional: false, pantryDefault: false },
      { name: "Pav Bhaji Masala", quantity: 2, unit: "tbsp", optional: false, pantryDefault: false },
      { name: "Onion", quantity: 2, unit: "pc", optional: false, pantryDefault: false },
      { name: "Salt", quantity: 1, unit: "tsp", optional: false, pantryDefault: true },
    ],
    steps: [
      "Boil vegetables; mash coarsely.",
      "Sauté onion-tomato in butter; add masala; mix in mashed veg.",
      "Simmer 15 min. Toast pav with butter.",
    ],
  },

  "butter chicken": {
    dish: "Butter Chicken",
    servings: 3,
    prepTimeMin: 50,
    ingredients: [
      { name: "Chicken", quantity: 500, unit: "g", optional: false, pantryDefault: false },
      { name: "Butter", quantity: 50, unit: "g", optional: false, pantryDefault: false },
      { name: "Cream", quantity: 80, unit: "ml", optional: false, pantryDefault: false },
      { name: "Tomato", quantity: 4, unit: "pc", optional: false, pantryDefault: false },
      { name: "Cashews", quantity: 12, unit: "pc", optional: false, pantryDefault: false },
      { name: "Ginger-Garlic Paste", quantity: 2, unit: "tbsp", optional: false, pantryDefault: false },
      { name: "Butter Chicken Masala", quantity: 2, unit: "tbsp", optional: false, pantryDefault: false },
      { name: "Yogurt", quantity: 80, unit: "ml", optional: false, pantryDefault: false },
      { name: "Salt", quantity: 1, unit: "tsp", optional: false, pantryDefault: true },
    ],
    steps: [
      "Marinate chicken in yogurt and spices; grill or bake.",
      "Make makhani sauce from tomatoes, cashews, butter.",
      "Add chicken to sauce; simmer 10 min; finish with cream.",
    ],
  },

  "aloo paratha": {
    dish: "Aloo Paratha",
    servings: 2,
    prepTimeMin: 35,
    ingredients: [
      { name: "Whole Wheat Flour (Atta)", quantity: 250, unit: "g", optional: false, pantryDefault: false },
      { name: "Potato", quantity: 3, unit: "pc", optional: false, pantryDefault: false },
      { name: "Butter / Ghee", quantity: 40, unit: "g", optional: false, pantryDefault: false },
      { name: "Green Chilli", quantity: 2, unit: "pc", optional: true, pantryDefault: false },
      { name: "Coriander Leaves", quantity: 15, unit: "g", optional: false, pantryDefault: false },
      { name: "Cumin Seeds", quantity: 1, unit: "tsp", optional: false, pantryDefault: true },
      { name: "Salt", quantity: 1, unit: "tsp", optional: false, pantryDefault: true },
    ],
    steps: [
      "Boil and mash potatoes; mix with spices and herbs.",
      "Make soft dough from atta; stuff with potato filling.",
      "Roll gently; cook on tawa with butter until golden.",
    ],
  },
};

/** Look up a precomputed recipe (returns null if not seeded) */
export function lookupPrecomputed(dish: string): RecipeSeed | null {
  const key = dish.toLowerCase().trim();
  // Exact match first
  if (TOP_DISHES[key]) return TOP_DISHES[key];
  // Partial match
  for (const [k, v] of Object.entries(TOP_DISHES)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}
