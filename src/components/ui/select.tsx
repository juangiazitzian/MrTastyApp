import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, label, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5">{label}</label>
        )}
        <select
          className={cn(
            "flex h-10 w-full rounded-lg border px-3 py-2 text-sm",
            "bg-white/5 border-white/12 text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:border-brand-500/50",
            "disabled:cursor-not-allowed disabled:opacity-40 transition-colors",
            "[&>option]:bg-[#1c1916] [&>option]:text-white",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
