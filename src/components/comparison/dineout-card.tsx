"use client";

import { useState } from "react";
import type { ComparisonLegs, DineoutOption, Recipe } from "@/lib/types";
import { formatINR } from "@/lib/utils";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { DineoutSheet } from "@/components/dineout/dineout-sheet";
import { MapPin, Star } from "lucide-react";

interface Props {
  leg: ComparisonLegs["dineout"];
  recipe: Recipe;
}

export function DineoutCard({ leg, recipe }: Props) {
  const [showDineout, setShowDineout] = useState(false);
  const [selectedRest, setSelectedRest] = useState<DineoutOption | null>(null);

  if (leg.status === "loading") {
    return (
      <div className="bg-white rounded-card shadow-card p-4 border border-[#F43F5E]/20">
        <div className="flex justify-between items-start mb-3">
          <Chip variant="dineout">Go out</Chip>
          <div className="skeleton w-20 h-6" />
        </div>
        <div className="space-y-2">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (leg.status === "empty" || leg.options.length === 0) {
    return (
      <div className="bg-white rounded-card shadow-card p-4 border border-[#E5E7EB]">
        <Chip variant="dineout">Go out</Chip>
        <p className="text-sm text-[#9CA3AF] mt-2">
          No dineout restaurants nearby — Dineout covers 50+ cities
        </p>
      </div>
    );
  }

  if (leg.status === "error") {
    return (
      <div className="bg-white rounded-card shadow-card p-4 border border-[#E5E7EB]">
        <Chip variant="dineout">Go out</Chip>
        <p className="text-sm text-[#9CA3AF] mt-2">Dineout search unavailable</p>
      </div>
    );
  }

  const best = leg.options[0];

  return (
    <>
      <div className="bg-white rounded-card shadow-card p-4 border border-[#F43F5E]/20">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <Chip variant="dineout">Go out</Chip>
          <div className="text-right">
            <div className="text-xl font-bold text-[#1F2937]">
              {formatINR(best.costForTwo)}
              <span className="text-sm font-normal text-[#6B7280]"> for 2</span>
            </div>
            <div className="text-[10px] text-[#9CA3AF]">
              {best.offers.length > 0 ? `${best.offers.length} offer${best.offers.length > 1 ? "s" : ""}` : ""}
            </div>
          </div>
        </div>

        {/* Top options */}
        <div className="space-y-2 mb-4">
          {leg.options.slice(0, 3).map((opt) => (
            <button
              key={opt.restaurantId}
              onClick={() => {
                setSelectedRest(opt);
                setShowDineout(true);
              }}
              className="w-full flex justify-between items-center text-sm text-left py-1"
            >
              <div>
                <div className="text-[#1F2937] font-medium text-xs">{opt.restaurantName}</div>
                <div className="flex items-center gap-2 text-[#6B7280] text-xs mt-0.5">
                  {opt.rating && (
                    <span className="flex items-center gap-0.5">
                      <Star size={10} fill="currentColor" className="text-[#F43F5E]" />
                      {opt.rating}
                    </span>
                  )}
                  {opt.distanceKm && (
                    <span className="flex items-center gap-0.5">
                      <MapPin size={10} />
                      {opt.distanceKm} km
                    </span>
                  )}
                  {opt.offers.length > 0 && (
                    <span className="text-[#F43F5E] font-semibold">
                      {opt.offers[0].title}
                    </span>
                  )}
                </div>
              </div>
              <span className="font-bold text-[#1F2937] text-xs">
                {formatINR(opt.costForTwo)} for 2
              </span>
            </button>
          ))}
        </div>

        <Button
          variant="dineout"
          size="full"
          onClick={() => {
            setSelectedRest(leg.options[0]);
            setShowDineout(true);
          }}
        >
          Go out · {formatINR(best.costForTwo)} for 2
        </Button>
      </div>

      {showDineout && selectedRest && (
        <DineoutSheet
          option={selectedRest}
          allOptions={leg.options}
          recipe={recipe}
          onClose={() => setShowDineout(false)}
        />
      )}
    </>
  );
}
