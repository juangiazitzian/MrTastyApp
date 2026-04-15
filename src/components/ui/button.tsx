import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "gold";
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm";
}

const variantStyles: Record<string, string> = {
  default:
    "bg-brand-500 text-white hover:bg-brand-400 shadow-sm font-semibold btn-glow",
  gold:
    "bg-gradient-to-r from-brand-500 to-gold-500 text-white hover:from-brand-400 hover:to-gold-400 shadow-sm font-bold btn-glow",
  destructive:
    "bg-red-600/90 text-white hover:bg-red-500 shadow-sm font-medium",
  outline:
    "border border-white/15 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-medium",
  secondary:
    "bg-white/8 text-white/70 hover:bg-white/12 hover:text-white font-medium",
  ghost:
    "hover:bg-white/8 text-white/60 hover:text-white",
  link:
    "text-brand-400 underline-offset-4 hover:underline hover:text-brand-300",
};

const sizeStyles: Record<string, string> = {
  default:  "h-10 px-4 py-2 text-sm",
  sm:       "h-8 px-3 text-xs",
  lg:       "h-11 px-6 text-sm",
  icon:     "h-10 w-10",
  "icon-sm":"h-8 w-8",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-40",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
