import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-[18px] p-4 text-sm transition-all duration-200 shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff] border [&>svg+div]:translate-y-[-2px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default:
          "bg-[#eef2f7] text-[#2d3748] border-white/80 [&>svg]:text-[#475569]",
        destructive:
          "bg-gradient-to-br from-red-50 to-rose-50/70 text-red-900 border-red-200/80 shadow-[4px_4px_12px_rgba(220,38,38,0.12),-4px_-4px_10px_#ffffff] [&>svg]:text-red-600",
        success:
          "bg-gradient-to-br from-emerald-50 to-green-50/70 text-emerald-900 border-emerald-200/80 shadow-[4px_4px_12px_rgba(16,185,129,0.12),-4px_-4px_10px_#ffffff] [&>svg]:text-emerald-600",
        warning:
          "bg-gradient-to-br from-amber-50 to-yellow-50/70 text-amber-900 border-amber-200/80 shadow-[4px_4px_12px_rgba(245,158,11,0.12),-4px_-4px_10px_#ffffff] [&>svg]:text-amber-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-bold leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs sm:text-sm font-medium leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };

