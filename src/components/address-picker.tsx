"use client";

import { useQuery } from "@tanstack/react-query";
import { useComparisonStore } from "@/store/comparison";
import type { SwiggyAddress } from "@/lib/types";
import { MapPin } from "lucide-react";

/**
 * Address selector — loads from unified /api/addresses endpoint.
 * GUARDRAILS #5: user must explicitly confirm delivery address before order.
 */
export function AddressPicker() {
  const { addresses, selectedAddressId, setAddresses, setSelectedAddress } =
    useComparisonStore();

  const { isLoading } = useQuery({
    queryKey: ["addresses"],
    queryFn: async () => {
      const res = await fetch("/api/addresses");
      if (!res.ok) return [];
      const data = (await res.json()) as { addresses: SwiggyAddress[] };
      setAddresses(data.addresses ?? []);
      // Auto-select first address
      if (data.addresses?.length && !selectedAddressId) {
        setSelectedAddress(data.addresses[0].id);
      }
      return data.addresses;
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return <div className="skeleton h-8 w-full rounded-[8px]" />;
  }

  if (addresses.length === 0) {
    return (
      <a
        href="/connect"
        className="flex items-center gap-1 text-xs text-[#F97316] font-semibold"
      >
        <MapPin size={12} />
        Connect Swiggy to add address
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <MapPin size={13} className="text-[#9CA3AF] flex-shrink-0" />
      <select
        value={selectedAddressId ?? ""}
        onChange={(e) => setSelectedAddress(e.target.value)}
        className="flex-1 text-sm text-[#1F2937] bg-transparent border-none focus:outline-none truncate"
      >
        {addresses.map((addr) => (
          <option key={addr.id} value={addr.id}>
            {addr.tag ? `${addr.tag} · ` : ""}
            {addr.addressLine}
          </option>
        ))}
      </select>
    </div>
  );
}
