// ─── Core domain types — directly from PRD §8 ────────────────────────────────

export interface Recipe {
  id: string;
  dish: string;
  source: { type: "dish_name" | "reel_link" | "upload"; url?: string };
  servings: number;
  prepTimeMin: number;
  ingredients: Ingredient[];
  steps: string[];
  confidence: number; // 0..1
  extractedBy: "cache" | "small_model" | "large_model" | "precomputed";
}

export interface Ingredient {
  name: string;
  quantity: number;
  unit: "g" | "kg" | "ml" | "l" | "tsp" | "tbsp" | "pc" | "cup";
  optional: boolean;
  pantryDefault: boolean; // salt, oil, etc.
}

export interface SkuCandidate {
  productId: string;
  brand: string;
  packSize: string;
  price: number;
  perServingCost: number;
  usesPerPack: number;
  imageUrl?: string;
  spinId?: string; // required for update_cart
}

export interface SkuMatch {
  ingredientName: string;
  candidates: SkuCandidate[];
  cacheKey: string; // city + normalized ingredient
  unavailable: boolean;
  substituteHint?: string; // e.g. "basil unavailable — nearest: Italian seasoning"
}

export interface FoodOption {
  restaurantId: string;
  restaurantName: string;
  dishName: string;
  price: number;
  isVeg: boolean;
  rating?: number;
  ratingCount?: number;
  deliveryEtaMin?: number;
  distanceKm?: number;
  imageUrl?: string;
  /** Raw item from search_menu — preserved for cart calls */
  rawItem: FoodSearchItem;
}

export interface DineoutOption {
  restaurantId: string;
  restaurantName: string;
  costForTwo: number;
  distanceKm?: number;
  rating?: number;
  ratingCount?: number;
  offers: DineoutOffer[];
  cuisines: string[];
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
}

export interface DineoutOffer {
  title: string;
  description?: string;
}

export interface ComparisonLegs {
  order: {
    options: FoodOption[];
    headlineCost: number; // lowest price across options
    feeDisclaimer: true; // always true until live validation
    etaMin?: number;
    status: "loading" | "ready" | "error" | "empty";
    error?: string;
  };
  dineout: {
    options: DineoutOption[];
    status: "loading" | "ready" | "error" | "empty";
    error?: string;
  };
  cook: {
    basketTotal: number;
    perServing: number;
    prepTimeMin: number;
    matches: SkuMatch[];
    status: "loading" | "ready" | "error" | "empty";
    error?: string;
  };
}

export interface Comparison {
  id: string;
  recipeId: string;
  recipe: Recipe;
  addressId: string;
  legs: ComparisonLegs;
  createdAt: string;
  shareSlug: string;
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  variant?: string;
  addons?: string[];
  // Food-specific
  variations?: unknown;
  variantsV2?: unknown;
  restaurantId?: string;
  // Instamart-specific
  spinId?: string;
  packSize?: string;
}

export interface CartState {
  vertical: "food" | "instamart";
  items: CartItem[];
  restaurantId?: string; // food only
  addressId: string;
  lastVerifiedAt?: string;
  idempotencyKey: string;
  total?: number;
  fees?: number;
}

// ─── Spend guard ──────────────────────────────────────────────────────────────

export interface SpendGuardState {
  perOrderCapINR: number;   // default 1000
  dailyCapINR: number;      // default 2500
  spentTodayINR: number;
}

export type SpendGuardResult = "allow" | "block_per_order" | "block_daily";

// ─── MCP raw response types (validated live; marked where unverified) ─────────

export interface SwiggyAddress {
  id: string;
  addressLine: string;
  city?: string;
  tag?: string;
  [key: string]: unknown;
}

/** Raw item from search_menu — has EITHER variations OR variantsV2 */
export interface FoodSearchItem {
  itemId: string;
  name: string;
  price: number;
  isVeg?: boolean;
  rating?: number;
  ratingCount?: number;
  imageUrl?: string;
  restaurantId: string;
  restaurantName: string;
  deliveryEtaMin?: number;
  distanceKm?: number;
  hasVariants?: boolean;
  hasAddons?: boolean;
  /** Legacy variant format */
  variations?: unknown;
  /** New variant format */
  variantsV2?: unknown;
  [key: string]: unknown;
}

export interface InstamartProduct {
  productId: string;
  name: string;
  brand?: string;
  packSize?: string;
  price: number;
  mrp?: number;
  imageUrl?: string;
  spinId: string;
  inStock: boolean;
  [key: string]: unknown;
}

export interface DineoutRestaurant {
  restaurantId: string;
  name: string;
  costForTwo?: number;
  rating?: number;
  ratingCount?: number;
  distanceKm?: number;
  cuisines?: string[];
  imageUrl?: string;
  offers?: Array<{ title: string; description?: string }>;
  latitude?: number;
  longitude?: number;
  [key: string]: unknown;
}

export interface DineoutSlot {
  dateStr: string;       // YYYY-MM-DD
  slotId: number;
  reservationTime: number; // unix epoch
  displayTime: string;   // "10:00 AM"
  slotGroupName: string; // "Breakfast" | "Lunch" | "Dinner"
  deals: DineoutDeal[];
}

export interface DineoutDeal {
  title: string;
  bookingPrice: number;
  displayFee: string;
  discountPercentage?: number;
  isFree: boolean;
  slotId: number;
  itemId: string;         // "restaurantId-ticketId"
}

// ─── API route payloads ───────────────────────────────────────────────────────

export interface CompareRequest {
  dish: string;
  addressId: string;
  servings?: number;
  vegOnly?: boolean;
  reelUrl?: string;
}

export interface CompareResponse {
  comparison: Comparison;
}

export interface RecipeRequest {
  dish?: string;
  reelUrl?: string;
  upload?: boolean;
}

export interface OrderFoodRequest {
  addressId: string;
  cartItems: CartItem[];
  restaurantId: string;
  restaurantName?: string;
  couponCode?: string;
  paymentMethod?: string;
  idempotencyKey: string;
}

export interface InstamartCartRequest {
  addressId: string;
  items: Array<{ spinId: string; quantity: number }>;
  idempotencyKey: string;
}

export interface DineoutBookRequest {
  restaurantId: string;
  slotId: number;
  itemId: string;
  reservationTime: number;
  guestCount: number;
  latitude: number;
  longitude: number;
  idempotencyKey: string;
}
