import { cn } from "@/lib/utils";

interface ChipProps {
  children: React.ReactNode;
  variant?: "order" | "cook" | "dineout" | "neutral";
  className?: string;
}

const COLORS = {
  order:   "bg-[#F97316]/10 text-[#F97316]",
  cook:    "bg-[#2563EB]/10 text-[#2563EB]",
  dineout: "bg-[#F43F5E]/10 text-[#F43F5E]",
  neutral: "bg-[#F3F4F6] text-[#6B7280]",
};

export function Chip({ children, variant = "neutral", className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-chip text-xs font-semibold",
        COLORS[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
