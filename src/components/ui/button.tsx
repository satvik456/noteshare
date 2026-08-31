"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white shadow-[4px_5px_14px_rgba(37,99,235,0.35),-3px_-3px_10px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-1px_2px_rgba(0,0,0,0.2)] border border-blue-400/40 hover:from-blue-400 hover:to-blue-700 hover:shadow-[5px_6px_18px_rgba(37,99,235,0.45),-4px_-4px_12px_#ffffff] hover:-translate-y-[1px] active:translate-y-[1px] active:from-blue-700 active:to-blue-600 active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),inset_-2px_-2px_5px_rgba(255,255,255,0.2)]",
        destructive:
          "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[4px_5px_14px_rgba(220,38,38,0.35),-3px_-3px_10px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.4)] border border-red-400/40 hover:from-red-400 hover:to-red-700 hover:shadow-[5px_6px_18px_rgba(220,38,38,0.45)] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.35)]",
        outline:
          "bg-gradient-to-br from-[#f8fafc] to-[#e7ecf4] text-[#334155] shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.9)] border border-white/80 hover:bg-gradient-to-br hover:from-white hover:to-[#eef2f7] hover:shadow-[5px_5px_12px_#c8d2e0,-5px_-5px_12px_#ffffff] hover:-translate-y-[1px] hover:text-[#1e293b] active:translate-y-[1px] active:bg-[#e9edf3] active:shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff]",
        secondary:
          "bg-gradient-to-br from-[#f8fafc] to-[#e4e9f2] text-[#334155] shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.9)] border border-white/80 hover:from-white hover:to-[#e9edf4] hover:shadow-[5px_5px_12px_#c8d2e0,-5px_-5px_12px_#ffffff] hover:-translate-y-[1px] hover:text-[#1e293b] active:translate-y-[1px] active:bg-[#e9edf3] active:shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff]",
        ghost:
          "bg-transparent text-[#475569] hover:bg-gradient-to-br hover:from-[#f8fafc] hover:to-[#e5eaf2] hover:shadow-[3px_3px_8px_#d1d9e6,-3px_-3px_8px_#ffffff] hover:text-[#1e293b] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-[inset_2px_2px_4px_#d1d9e6,inset_-2px_-2px_4px_#ffffff]",
        link: "text-blue-600 underline-offset-4 hover:underline hover:text-blue-700",
      },
      size: {
        default: "h-10 px-5 py-2 rounded-[14px]",
        sm: "h-8 px-3.5 text-xs rounded-[11px]",
        lg: "h-12 px-8 text-base rounded-[16px]",
        icon: "h-10 w-10 rounded-[14px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

