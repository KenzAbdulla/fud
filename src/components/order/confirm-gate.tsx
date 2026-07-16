"use client";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

interface ConfirmLine {
  label: string;
  value: string;
}

interface Props {
  title: string;
  lines: ConfirmLine[];
  ctaLabel: string;
  ctaVariant: "order" | "cook" | "dineout";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Pre-checkout confirmation screen — GUARDRAILS #1 & #5.
 * Shows exact address, items, total before ANY write call.
 * Amount is in the CTA button label itself (F-32).
 */
export function ConfirmGate({
  title,
  lines,
  ctaLabel,
  ctaVariant,
  isLoading,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <BottomSheet open title={title} onClose={onCancel}>
      <div className="space-y-4">
        {lines.map((line) => (
          <div key={line.label} className="flex justify-between text-sm">
            <span className="text-[#6B7280]">{line.label}</span>
            <span className="font-semibold text-[#1F2937] text-right max-w-[60%]">
              {line.value}
            </span>
          </div>
        ))}

        <div className="border-t border-[#E5E7EB] pt-3 space-y-2">
          <Button
            variant={ctaVariant}
            size="full"
            disabled={isLoading}
            onClick={onConfirm}
          >
            {isLoading ? "Placing..." : ctaLabel}
          </Button>
          <button
            onClick={onCancel}
            className="w-full text-sm text-[#6B7280] py-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
