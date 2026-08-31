import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition-all shadow-[2px_2px_6px_#d1d9e6,-2px_-2px_6px_#ffffff] border select-none",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-400/40 shadow-[2px_3px_8px_rgba(59,130,246,0.35),-2px_-2px_6px_#ffffff]",
        secondary:
          "bg-gradient-to-br from-[#f8fafc] to-[#e6ebf2] text-[#475569] border-white/80",
        destructive:
          "bg-gradient-to-br from-red-50 to-red-100 text-red-700 border-red-200 shadow-[2px_2px_6px_#d1d9e6,-2px_-2px_6px_#ffffff]",
        outline:
          "bg-[#eef2f7] text-[#475569] border-[#cbd5e1]",
        success:
          "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200 shadow-[2px_2px_6px_#d1d9e6,-2px_-2px_6px_#ffffff]",
        warning:
          "bg-gradient-to-br from-amber-50 to-amber-100 text-amber-800 border-amber-200 shadow-[2px_2px_6px_#d1d9e6,-2px_-2px_6px_#ffffff]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

