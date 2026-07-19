import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

/**
 * A styled native <select>. Deliberately not a Radix Select: every call site
 * in MedBAY drives these with a plain controlled `value`/`onChange` and a
 * `.map()` of <option> children, so keeping the native element preserves
 * that logic exactly while still getting full keyboard/a11y support for free.
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "flex h-11 w-full appearance-none rounded-md border border-ink-200 bg-white px-3.5 pr-10 py-2 text-sm text-ink-900 shadow-soft-xs transition-colors",
            "focus-visible:outline-none focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600/15",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-ink-50",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
