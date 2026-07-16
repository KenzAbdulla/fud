import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format INR price for display */
export function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

/** Strip a Swiggy MCP response to only the fields we need.
 *  Called before any LLM prompt or UI state — keeps context small. */
export function stripMcpResponse<T extends object>(
  raw: unknown,
  keys: (keyof T)[]
): Partial<T> {
  if (!raw || typeof raw !== "object") return {};
  const result: Partial<T> = {};
  for (const key of keys) {
    if (key in (raw as object)) {
      result[key] = (raw as T)[key];
    }
  }
  return result;
}

/** Normalize ingredient name for cache keys */
export function normalizeIngredient(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "_");
}

/** Generate a URL-safe slug */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Safe JSON parse with fallback */
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
