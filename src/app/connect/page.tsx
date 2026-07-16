"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";

type SwiggyServer = "food" | "instamart" | "dineout";

const SERVER_LABELS: Record<SwiggyServer, string> = {
  food: "Swiggy Food",
  instamart: "Swiggy Instamart",
  dineout: "Swiggy Dineout",
};

const SERVER_COLORS: Record<SwiggyServer, string> = {
  food: "order",
  instamart: "cook",
  dineout: "dineout",
};

/**
 * /connect — Connect Swiggy accounts (OAuth PKCE per server).
 * Handles mid-flow re-auth: shows context-aware prompt (F-34).
 */
export default function ConnectPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { connected, setConnected, pendingResumeState } = useAuthStore();
  const [connecting, setConnecting] = useState<SwiggyServer | null>(null);

  // Handle ?connected=food coming back from OAuth callback
  useEffect(() => {
    const server = searchParams.get("connected") as SwiggyServer | null;
    if (server && SERVER_LABELS[server]) {
      setConnected(server, true);
    }

    // If all needed are connected and there's a resume state, go back
    const allConnected =
      connected.food && connected.instamart && connected.dineout;
    if (allConnected && pendingResumeState) {
      router.push(pendingResumeState.page);
    }
  }, [searchParams, connected, pendingResumeState]);

  const handleConnect = (server: SwiggyServer) => {
    setConnecting(server);
    window.location.href = `/api/auth/authorize?server=${server}`;
  };

  const servers: SwiggyServer[] = ["food", "instamart", "dineout"];

  return (
    <div className="flex flex-col min-h-screen pt-8 space-y-6">
      {pendingResumeState && (
        <div className="bg-[#F97316]/10 rounded-card p-3 text-sm text-[#1F2937]">
          <strong>Session expired.</strong> Reconnect your Swiggy account to
          continue — your comparison is saved.
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-[#1F2937]">Connect Swiggy</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Link all three to compare order, cook, and dine-out options in one
          go. Each uses your own Swiggy account.
        </p>
      </div>

      <div className="space-y-3">
        {servers.map((server) => (
          <div
            key={server}
            className="flex items-center justify-between bg-white rounded-card shadow-card p-4"
          >
            <div>
              <p className="font-semibold text-sm text-[#1F2937]">
                {SERVER_LABELS[server]}
              </p>
              <p className="text-xs text-[#6B7280] mt-0.5">
                {connected[server] ? "✓ Connected" : "Not connected"}
              </p>
            </div>
            {connected[server] ? (
              <span className="text-xs font-semibold text-[#008000] bg-[#008000]/10 px-2 py-1 rounded-chip">
                Connected
              </span>
            ) : (
              <Button
                variant={SERVER_COLORS[server] as "order" | "cook" | "dineout"}
                size="sm"
                disabled={connecting === server}
                onClick={() => handleConnect(server)}
              >
                {connecting === server ? "Connecting..." : "Connect"}
              </Button>
            )}
          </div>
        ))}
      </div>

      {connected.food && connected.instamart && connected.dineout && (
        <Button
          variant="order"
          size="full"
          onClick={() =>
            router.push(pendingResumeState?.page ?? "/")
          }
        >
          Start comparing →
        </Button>
      )}

      <p className="text-xs text-[#9CA3AF] text-center">
        Tokens expire in 5 days. No refresh tokens in Swiggy MCP v1 —
        you&apos;ll be prompted to reconnect.
      </p>
    </div>
  );
}
