/**
 * /compare/[slug] — Shareable comparison URL (F-42).
 * Fetches the cached comparison and renders the full 3-card grid.
 * Strips user PII: addressId is [redacted] in stored payload.
 */

import { cacheGet } from "@/lib/cache/redis";
import { CACHE_KEYS } from "@/lib/cache/keys";
import { ComparisonGrid } from "@/components/comparison/comparison-grid";
import type { Comparison } from "@/lib/types";
import type { Metadata } from "next";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const comparison = await getComparison(params.slug);
  if (!comparison) {
    return { title: "Comparison not found — Craving to Plate" };
  }
  return {
    title: `${comparison.recipe.dish} — Craving to Plate`,
    description: `3 ways to satisfy this craving: order, cook, or dine out. Priced and timed.`,
    openGraph: {
      title: `How to get ${comparison.recipe.dish}`,
      description: `Order from ₹${comparison.legs.order.headlineCost}+ · Cook ₹${comparison.legs.cook.perServing}/serving · Dine out ₹${comparison.legs.dineout.options[0]?.costForTwo ?? "?"} for 2`,
    },
  };
}

async function getComparison(slug: string): Promise<Comparison | null> {
  return cacheGet<Comparison>(CACHE_KEYS.comparison(slug));
}

export default async function SharedComparisonPage({ params }: Props) {
  const comparison = await getComparison(params.slug);

  if (!comparison) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <h1 className="text-xl font-bold text-[#1F2937]">Comparison not found</h1>
        <p className="text-sm text-[#6B7280] mt-2">
          This link may have expired (comparisons last 24 hours).
        </p>
        <a
          href="/"
          className="mt-4 text-sm font-semibold text-[#F97316]"
        >
          Start a new comparison →
        </a>
      </div>
    );
  }

  return (
    <div className="pt-8">
      <div className="mb-4 flex items-center justify-between">
        <a href="/" className="text-sm text-[#6B7280]">← Try your own craving</a>
      </div>
      <ComparisonGrid comparison={comparison} />
    </div>
  );
}
