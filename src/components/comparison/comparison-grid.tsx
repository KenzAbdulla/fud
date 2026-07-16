"use client";

import { useState } from "react";
import type { Comparison } from "@/lib/types";
import { OrderCard } from "./order-card";
import { CookCard } from "./cook-card";
import { DineoutCard } from "./dineout-card";
import { Share2, ArrowLeft } from "lucide-react";
import { useComparisonStore } from "@/store/comparison";

interface Props {
  comparison: Comparison;
}

/** 3-card progressive layout — each leg renders independently (F-08) */
export function ComparisonGrid({ comparison }: Props) {
  const { reset } = useComparisonStore();
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/compare/${comparison.shareSlug}`;
    if (navigator.share) {
      await navigator.share({ title: `How to get ${comparison.recipe.dish}`, url });
    } else {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={reset}
          className="flex items-center gap-1 text-sm text-[#6B7280]"
        >
          <ArrowLeft size={16} />
          New craving
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-1 text-sm text-[#F97316] font-semibold"
        >
          <Share2 size={16} />
          {shared ? "Copied!" : "Share"}
        </button>
      </div>

      {/* Dish title */}
      <div>
        <h2 className="text-xl font-semibold text-[#1F2937]">
          {comparison.recipe.dish}
        </h2>
        <p className="text-xs text-[#6B7280]">
          {comparison.recipe.servings} serving{comparison.recipe.servings > 1 ? "s" : ""} ·{" "}
          {comparison.recipe.prepTimeMin} min prep
        </p>
      </div>

      {/* 3 cards — renders progressively as each status resolves */}
      <OrderCard leg={comparison.legs.order} recipe={comparison.recipe} />
      <CookCard leg={comparison.legs.cook} recipe={comparison.recipe} />
      <DineoutCard leg={comparison.legs.dineout} recipe={comparison.recipe} />

      <p className="text-xs text-[#9CA3AF] text-center pb-4">
        Prices are indicative · excludes delivery fees & taxes where noted
      </p>
    </div>
  );
}
