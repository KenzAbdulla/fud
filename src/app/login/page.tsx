"use client";

import { useState } from "react";
import { getAnonClient } from "@/lib/db/supabase";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";

type Step = "phone" | "otp";

export default function LoginPage() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setUserId, setPhone: storePhone } = useAuthStore();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = getAnonClient();
    const formatted = phone.startsWith("+") ? phone : `+91${phone.replace(/^0/, "")}`;

    const { error: err } = await supabase.auth.signInWithOtp({
      phone: formatted,
    });

    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      storePhone(formatted);
      setStep("otp");
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = getAnonClient();
    const formatted = phone.startsWith("+") ? phone : `+91${phone.replace(/^0/, "")}`;

    const { data, error: err } = await supabase.auth.verifyOtp({
      phone: formatted,
      token: otp,
      type: "sms",
    });

    setLoading(false);
    if (err) {
      setError(err.message);
    } else if (data.user) {
      setUserId(data.user.id);
      // Redirect to home (or pending resume state)
      window.location.href = "/";
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1F2937]">Craving to Plate</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            {step === "phone"
              ? "Enter your mobile number to continue"
              : "Enter the OTP sent to your number"}
          </p>
        </div>

        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-3">
            <div className="flex gap-2">
              <div className="flex items-center px-3 h-12 bg-white border border-[#E5E7EB] rounded-card text-sm text-[#6B7280] flex-shrink-0">
                🇮🇳 +91
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="98765 43210"
                maxLength={10}
                className="flex-1 h-12 px-4 rounded-card border border-[#E5E7EB] bg-white text-[#1F2937] text-base tracking-wider focus:outline-none focus:ring-2 focus:ring-[#F97316]/30"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              variant="order"
              size="full"
              disabled={phone.length < 10 || loading}
            >
              {loading ? "Sending OTP..." : "Continue →"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <input
              type="number"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              className="w-full h-12 px-4 rounded-card border border-[#E5E7EB] bg-white text-[#1F2937] text-xl text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30"
              autoFocus
            />
            <Button
              type="submit"
              variant="order"
              size="full"
              disabled={otp.length < 6 || loading}
            >
              {loading ? "Verifying..." : "Verify OTP →"}
            </Button>
            <button
              type="button"
              onClick={() => { setStep("phone"); setOtp(""); setError(null); }}
              className="w-full text-sm text-[#6B7280] py-1"
            >
              Change number
            </button>
          </form>
        )}

        {error && (
          <p className="text-sm text-[#F43F5E] text-center">{error}</p>
        )}

        <p className="text-xs text-[#9CA3AF] text-center">
          We use your number only for login. No spam.
        </p>
      </div>
    </div>
  );
}
