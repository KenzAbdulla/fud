"use client";

import { useState } from "react";
import type { ComparisonLegs, FoodOption, Recipe } from "@/lib/types";
import { formatINR } from "@/lib/utils";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { FoodOrderSheet } from "@/components/order/food-order-sheet";
import { Clock, Star } from "lucide-react";

interface Props {
  leg: ComparisonLegs["order"];
  recipe: Recipe;
}

export function OrderCard({ leg, recipe }: Props) {
  const [showOrder, setShowOrder] = useState(false);
  const [selectedOption, setSelectedOption] = useState<FoodOption | null>(null);

  if (leg.status === "loading") {
    return (
      <div className="bg-white rounded-card shadow-card p-4 border border-[#F97316]/20">
        <div className="flex justify-between items-start mb-3">
          <Chip variant="order">Order it</Chip>
          <div className="skeleton w-16 h-6" />
        </div>
        <div className="space-y-2">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-4 w-1/2" />
          <div className="skeleton h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (leg.status === "error") {
    return (
      <div className="bg-white rounded-card shadow-card p-4 border border-[#E5E7EB]">
        <Chip variant="order">Order it</Chip>
        <p className="text-sm text-[#9CA3AF] mt-2">Delivery options unavailable</p>
      </div>
    );
  }

  if (leg.status === "empty" || leg.options.length === 0) {
    return (
      <div className="bg-white rounded-card shadow-card p-4 border border-[#E5E7EB]">
        <Chip variant="order">Order it</Chip>
        <p className="text-sm text-[#9CA3AF] mt-2">
          No nearby restaurants delivering {recipe.dish}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-card shadow-card p-4 border border-[#F97316]/20">
        {/* Header row */}
        <div className="flex justify-between items-start mb-3">
          <Chip variant="order">Order it</Chip>
          <div className="text-right">
            <div className="text-xl font-bold text-[#1F2937]">
              {formatINR(leg.headlineCost)}+
            </div>
            <div className="text-[10px] text-[#9CA3AF]">excl. fees & taxes</div>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex gap-3 text-xs text-[#6B7280] mb-3">
          {leg.etaMin && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {leg.etaMin} min
            </span>
          )}
          <span>{leg.options.length} restaurant{leg.options.length > 1 ? "s" : ""} nearby</span>
        </div>

        {/* Top 3 options */}
        <div className="space-y-2 mb-4">
          {leg.options.slice(0, 3).map((opt) => (
            <button
              key={opt.restaurantId + opt.dishName}
              onClick={() => {
                setSelectedOption(opt);
                setShowOrder(true);
              }}
              className="w-full flex justify-between items-center py-1.5 px-0 text-sm text-left"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  {opt.isVeg ? (
                    <span className="veg-marker" />
                  ) : (
                    <span className="nonveg-marker" />
                  )}
                  <span className="text-[#1F2937] font-medium text-xs">
                    {opt.restaurantName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[#6B7280] text-xs mt-0.5 ml-5">
                  {opt.rating && (
                    <span className="flex items-center gap-0.5">
                      <Star size={10} fill="currentColor" className="text-[#F97316]" />
                      {opt.rating}
                    </span>
                  )}
                  {opt.distanceKm && <span>{opt.distanceKm} km</span>}
                  {opt.deliveryEtaMin && <span>{opt.deliveryEtaMin} min</span>}
                </div>
              </div>
              <span className="font-bold text-[#1F2937]">{formatINR(opt.price)}</span>
            </button>
          ))}
        </div>

        <Button
          variant="order"
          size="full"
          onClick={() => {
            setSelectedOption(leg.options[0]);
            setShowOrder(true);
          }}
        >
          Order it · from {formatINR(leg.headlineCost)}
        </Button>
      </div>

      {showOrder && selectedOption && (
        <FoodOrderSheet
          option={selectedOption}
          recipe={recipe}
          onClose={() => setShowOrder(false)}
        />
      )}
    </>
  );
}
