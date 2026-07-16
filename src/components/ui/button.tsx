import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        // Leg-colored primary CTAs (DESIGN_RULES.md §CTAs)
        order: "bg-[#F97316] text-white hover:bg-[#EA6C0C] focus-visible:ring-[#F97316]",
        cook: "bg-[#2563EB] text-white hover:bg-[#1D4ED8] focus-visible:ring-[#2563EB]",
        dineout: "bg-[#F43F5E] text-white hover:bg-[#E11D48] focus-visible:ring-[#F43F5E]",
        ghost: "bg-transparent text-[#1F2937] hover:bg-black/5",
        outline: "border border-[#E5E7EB] bg-white text-[#1F2937] hover:bg-gray-50",
        danger: "bg-red-500 text-white hover:bg-red-600",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-[8px]",
        default: "h-12 px-4 text-sm rounded-btn",
        full: "h-12 w-full px-4 text-sm rounded-btn",
        lg: "h-14 w-full px-4 text-base rounded-btn",
      },
    },
    defaultVariants: {
      variant: "order",
      size: "default",
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
