import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none tracking-wide whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "border-ink-200 bg-ink-50 text-ink-600",
        brand: "border-brand-200 bg-brand-50 text-brand-700",
        azure: "border-azure-200 bg-azure-50 text-azure-700",
        success: "border-emerald-200 bg-emerald-50 text-emerald-700",
        warning: "border-amber-200 bg-amber-50 text-amber-800",
        danger: "border-red-200 bg-red-50 text-red-700",
        outline: "border-ink-200 bg-white/60 text-ink-600",
        solid: "border-transparent bg-ink-900 text-white",
        dynamic: "border-transparent",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, style, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} style={style} {...props} />
  );
}

/** Renders a badge from one of MedBAY's status maps (STOCK_STATUS_MAP, ODOO_STATUS_MAP, ...),
 *  which each already supply { label, bg, text } — preserves the exact status → color logic. */
function StatusBadge({
  config,
  className,
  dotClassName,
  showDot = false,
}: {
  config: { label: string; bg: string; text: string };
  className?: string;
  dotClassName?: string;
  showDot?: boolean;
}) {
  return (
    <Badge
      variant="dynamic"
      className={className}
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {showDot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", dotClassName)}
          style={{ backgroundColor: config.text }}
        />
      )}
      {config.label}
    </Badge>
  );
}

export { Badge, StatusBadge, badgeVariants };
