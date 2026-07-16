"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ConfirmGate } from "./confirm-gate";
import type { FoodOption, Recipe } from "@/lib/types";
import { formatINR } from "@/lib/utils";
import { useCartStore } from "@/store/cart";
import { generateIdempotencyKey } from "@/lib/guards/idempotency";
import { useToast } from "@/components/ui/toaster";
import { Star, Clock } from "lucide-react";

interface Props {
  option: FoodOption;
  recipe: Recipe;
  onClose: () => void;
}

export function FoodOrderSheet({ option, recipe, onClose }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedCoupon, setSelectedCoupon] = useState<string | null>(null);
  const { food, initFoodCart, addFoodItem } = useCartStore();
  const { toast } = useToast();

  // Fetch coupons
  const { data: coupons = [] } = useQuery({
    queryKey: ["coupons", option.restaurantId],
    queryFn: async () => {
      const res = await fetch("/api/cart/food/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: option.restaurantId,
          addressId: "addr_home_001",
        }),
      });
      if (!res.ok) return [];
      const data = await res.json() as { coupons: Array<{ code: string; description: string; discount: number }> };
      return data.coupons ?? [];
    },
  });

  const orderTotal = option.price * quantity;

  const placeMutation = useMutation({
    mutationFn: async () => {
      const idempotencyKey = generateIdempotencyKey();
      const res = await fetch("/api/order/food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId: "addr_home_001",
          restaurantId: option.restaurantId,
          restaurantName: option.restaurantName,
          cartItems: [
            {
              productId: option.rawItem.itemId,
              name: option.dishName,
              quantity,
              price: option.price,
              ...(option.rawItem.variations ? { variations: option.rawItem.variations } : {}),
              ...(option.rawItem.variantsV2 ? { variantsV2: option.rawItem.variantsV2 } : {}),
            },
          ],
          couponCode: selectedCoupon ?? undefined,
          idempotencyKey,
          userConfirmed: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Order placed!", description: `${option.dishName} from ${option.restaurantName}` });
      setShowConfirm(false);
      onClose();
    },
    onError: (err) => {
      toast({ title: "Order failed", description: String(err), variant: "error" });
      setShowConfirm(false);
    },
  });

  return (
    <>
      <BottomSheet open title="Order it" onClose={onClose}>
        <div className="space-y-4">
          {/* Restaurant info */}
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                {option.isVeg ? <span className="veg-marker" /> : <span className="nonveg-marker" />}
                <h3 className="font-semibold text-[#1F2937]">{option.restaurantName}</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#6B7280] mt-1 ml-5">
                {option.rating && (
                  <span className="flex items-center gap-0.5">
                    <Star size={11} fill="currentColor" className="text-[#F97316]" />
                    {option.rating} ({option.ratingCount?.toLocaleString()})
                  </span>
                )}
                {option.deliveryEtaMin && (
                  <span className="flex items-center gap-0.5">
                    <Clock size={11} />
                    {option.deliveryEtaMin} min
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Dish + quantity */}
          <div className="bg-[#F8F7F5] rounded-card p-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-[#1F2937] text-sm">{option.dishName}</p>
                <p className="text-xs text-[#6B7280]">{formatINR(option.price)} each</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-7 h-7 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#1F2937] font-semibold"
                >
                  −
                </button>
                <span className="w-5 text-center font-semibold text-[#1F2937]">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-7 h-7 rounded-full bg-[#F97316] text-white flex items-center justify-center font-semibold"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Coupons (COD-friendly only) */}
          {coupons.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">
                Available offers
              </p>
              <div className="space-y-2">
                {coupons.map((c: { code: string; description: string; discount: number }) => (
                  <button
                    key={c.code}
                    onClick={() =>
                      setSelectedCoupon(selectedCoupon === c.code ? null : c.code)
                    }
                    className={`w-full text-left p-2.5 rounded-card border text-sm transition-colors ${
                      selectedCoupon === c.code
                        ? "border-[#F97316] bg-[#F97316]/5"
                        : "border-[#E5E7EB]"
                    }`}
                  >
                    <div className="flex justify-between">
                      <span className="font-semibold text-[#F97316]">{c.code}</span>
                      {selectedCoupon === c.code && (
                        <Chip variant="order">Applied</Chip>
                      )}
                    </div>
                    <p className="text-xs text-[#6B7280] mt-0.5">{c.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price summary */}
          <div className="border-t border-[#E5E7EB] pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#6B7280]">Item total</span>
              <span className="font-semibold text-[#1F2937]">{formatINR(orderTotal)}</span>
            </div>
            <p className="text-xs text-[#9CA3AF] mt-1">
              Delivery fee & taxes shown at checkout · excl. above
            </p>
          </div>

          <Button
            variant="order"
            size="full"
            onClick={() => setShowConfirm(true)}
          >
            Place order · {formatINR(orderTotal)}
          </Button>
        </div>
      </BottomSheet>

      {/* Confirmation gate — GUARDRAILS #1 & #5 */}
      {showConfirm && (
        <ConfirmGate
          title="Confirm your order"
          lines={[
            { label: "Restaurant", value: option.restaurantName },
            { label: "Item", value: `${quantity}× ${option.dishName}` },
            { label: "Address", value: "Home · 12, MG Road, Bengaluru" },
            { label: "Amount", value: `${formatINR(orderTotal)} (excl. fees)` },
            ...(selectedCoupon ? [{ label: "Coupon", value: selectedCoupon }] : []),
          ]}
          ctaLabel={`Place order · ${formatINR(orderTotal)}`}
          ctaVariant="order"
          isLoading={placeMutation.isPending}
          onConfirm={() => placeMutation.mutate()}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
