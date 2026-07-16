/**
 * Auth store — Swiggy connection status per server + Supabase session.
 * Tracks mid-flow re-auth state (GUARDRAILS #8, F-34).
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

type SwiggyServer = "food" | "instamart" | "dineout";

interface AuthState {
  // Which Swiggy servers are connected
  connected: Record<SwiggyServer, boolean>;

  // Preserved pre-auth state for resuming after re-auth (F-34)
  pendingResumeState: {
    page: string;
    data: unknown;
  } | null;

  // Supabase session
  userId: string | null;
  phone: string | null;

  setConnected: (server: SwiggyServer, connected: boolean) => void;
  setUserId: (id: string | null) => void;
  setPhone: (phone: string | null) => void;

  /** Call when token expires mid-flow; saves current state to resume after re-auth */
  triggerReAuth: (server: SwiggyServer, resumePage: string, resumeData: unknown) => void;
  clearResumeState: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      connected: { food: false, instamart: false, dineout: false },
      pendingResumeState: null,
      userId: null,
      phone: null,

      setConnected: (server, connected) =>
        set((s) => ({ connected: { ...s.connected, [server]: connected } })),

      setUserId: (id) => set({ userId: id }),
      setPhone: (phone) => set({ phone }),

      triggerReAuth: (_, resumePage, resumeData) =>
        set({ pendingResumeState: { page: resumePage, data: resumeData } }),

      clearResumeState: () => set({ pendingResumeState: null }),
    }),
    {
      name: "ctp-auth",
      partialize: (s) => ({
        connected: s.connected,
        userId: s.userId,
        pendingResumeState: s.pendingResumeState,
      }),
    }
  )
);
