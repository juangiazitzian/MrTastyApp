import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "brand";
}

const variantStyles: Record<string, string> = {
  default: "bg-white/10 text-white/70 border border-white/10",
  brand:   "bg-brand-500/20 text-brand-400 border border-brand-500/30",
  success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  warning: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  danger:  "bg-red-500/15 text-red-400 border border-red-500/25",
  info:    "bg-sky-500/15 text-sky-400 border border-sky-500/25",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
