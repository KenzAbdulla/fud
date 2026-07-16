"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { ConfirmGate } from "@/components/order/confirm-gate";
import type { DineoutOption, DineoutSlot, DineoutDeal, Recipe } from "@/lib/types";
import { formatINR } from "@/lib/utils";
import { useToast } from "@/components/ui/toaster";
import { generateIdempotencyKey } from "@/lib/guards/idempotency";
import { format } from "date-fns";
import { MapPin, Star, Tag } from "lucide-react";

interface Props {
  option: DineoutOption;
  allOptions: DineoutOption[];
  recipe: Recipe;
  onClose: () => void;
}

export function DineoutSheet({ option: initialOption, allOptions, recipe, onClose }: Props) {
  const [selectedOption, setSelectedOption] = useState<DineoutOption>(initialOption);
  const [selectedSlot, setSelectedSlot] = useState<{ slot: DineoutSlot; deal: DineoutDeal } | null>(null);
  const [guestCount, setGuestCount] = useState(2);
  const [showConfirm, setShowConfirm] = useState(false);
  const { toast } = useToast();

  // Fetch slots for selected restaurant
  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ["slots", selectedOption.restaurantId],
    queryFn: async () => {
      const lat = selectedOption.latitude ?? 12.9716;
      const lng = selectedOption.longitude ?? 77.5946;
      const res = await fetch("/api/order/dineout/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: selectedOption.restaurantId,
          date: new Date().toISOString().split("T")[0],
          latitude: lat,
          longitude: lng,
        }),
      });
      if (!res.ok) return [];
      const data = await res.json() as { slots: DineoutSlot[] };
      return data.slots ?? [];
    },
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlot) throw new Error("No slot selected");
      const idempotencyKey = generateIdempotencyKey();
      const res = await fetch("/api/order/dineout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: selectedOption.restaurantId,
          slotId: selectedSlot.deal.slotId,
          itemId: selectedSlot.deal.itemId,
          reservationTime: selectedSlot.slot.reservationTime,
          guestCount,
          latitude: selectedOption.latitude ?? 12.9716,
          longitude: selectedOption.longitude ?? 77.5946,
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
      toast({ title: "Table booked!", description: `${selectedOption.restaurantName} · ${guestCount} guests` });
      setShowConfirm(false);
      onClose();
    },
    onError: (err) => {
      toast({ title: "Booking failed", description: String(err), variant: "error" });
      setShowConfirm(false);
    },
  });

  // Group slots by day
  const slotsByDay = slots.reduce<Record<string, DineoutSlot[]>>((acc, slot) => {
    if (!acc[slot.dateStr]) acc[slot.dateStr] = [];
    acc[slot.dateStr].push(slot);
    return acc;
  }, {});

  return (
    <>
      <BottomSheet open title="Go out" onClose={onClose}>
        <div className="space-y-4">
          {/* Restaurant list */}
          <div className="space-y-1">
            {allOptions.slice(0, 5).map((opt) => (
              <button
                key={opt.restaurantId}
                onClick={() => { setSelectedOption(opt); setSelectedSlot(null); }}
                className={`w-full text-left p-2.5 rounded-card border text-sm transition-colors ${
                  selectedOption.restaurantId === opt.restaurantId
                    ? "border-[#F43F5E] bg-[#F43F5E]/5"
                    : "border-[#E5E7EB]"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-[#1F2937] text-xs">{opt.restaurantName}</div>
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
                    </div>
                    {opt.offers.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Tag size={10} className="text-[#F43F5E]" />
                        <span className="text-xs text-[#F43F5E]">{opt.offers[0].title}</span>
                      </div>
                    )}
                  </div>
                  <span className="font-bold text-[#1F2937] text-xs">
                    {formatINR(opt.costForTwo)} for 2
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Slots for selected restaurant */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                Available slots
              </p>
              {/* Guest count */}
              <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                <span>Guests</span>
                <button
                  onClick={() => setGuestCount((g) => Math.max(1, g - 1))}
                  className="w-6 h-6 rounded-full bg-[#F3F4F6] flex items-center justify-center font-semibold"
                >
                  −
                </button>
                <span className="font-semibold text-[#1F2937] w-4 text-center">{guestCount}</span>
                <button
                  onClick={() => setGuestCount((g) => Math.min(20, g + 1))}
                  className="w-6 h-6 rounded-full bg-[#F43F5E] text-white flex items-center justify-center font-semibold"
                >
                  +
                </button>
              </div>
            </div>

            {slotsLoading ? (
              <div className="space-y-2">
                <div className="skeleton h-8 w-full" />
                <div className="skeleton h-8 w-full" />
              </div>
            ) : Object.keys(slotsByDay).length === 0 ? (
              <p className="text-sm text-[#9CA3AF]">No available slots for the next 7 days</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(slotsByDay).map(([date, daySlots]) => (
                  <div key={date}>
                    <p className="text-xs text-[#6B7280] mb-1.5">
                      {format(new Date(date), "EEE, d MMM")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {daySlots.map((slot) => {
                        const freeDeal = slot.deals.find((d) => d.isFree);
                        if (!freeDeal) return null; // only free slots
                        const isSelected =
                          selectedSlot?.slot.slotId === slot.slotId &&
                          selectedSlot?.deal.slotId === freeDeal.slotId;
                        return (
                          <button
                            key={slot.slotId}
                            onClick={() => setSelectedSlot({ slot, deal: freeDeal })}
                            className={`px-3 py-1.5 rounded-chip text-xs font-semibold border transition-colors ${
                              isSelected
                                ? "bg-[#F43F5E] text-white border-[#F43F5E]"
                                : "bg-white text-[#1F2937] border-[#E5E7EB]"
                            }`}
                          >
                            {slot.displayTime}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            variant="dineout"
            size="full"
            disabled={!selectedSlot}
            onClick={() => setShowConfirm(true)}
          >
            Book table · Free reservation
          </Button>
        </div>
      </BottomSheet>

      {showConfirm && selectedSlot && (
        <ConfirmGate
          title="Confirm table booking"
          lines={[
            { label: "Restaurant", value: selectedOption.restaurantName },
            { label: "Date & time", value: `${format(new Date(selectedSlot.slot.dateStr), "EEE d MMM")} · ${selectedSlot.slot.displayTime}` },
            { label: "Guests", value: `${guestCount}` },
            { label: "Cost for 2", value: formatINR(selectedOption.costForTwo) },
            ...(selectedOption.offers[0] ? [{ label: "Offer", value: selectedOption.offers[0].title }] : []),
            { label: "Booking fee", value: "Free" },
          ]}
          ctaLabel="Confirm booking · Free"
          ctaVariant="dineout"
          isLoading={bookMutation.isPending}
          onConfirm={() => bookMutation.mutate()}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
