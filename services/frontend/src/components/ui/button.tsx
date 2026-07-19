import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-ink-900 text-white shadow-soft-sm hover:bg-brand-700 active:bg-brand-800",
        brand:
          "bg-brand-600 text-white shadow-soft-sm hover:bg-brand-700 active:bg-brand-800 hover:shadow-brand-glow",
        secondary:
          "bg-azure-600 text-white shadow-soft-sm hover:bg-azure-700 active:bg-azure-800",
        outline:
          "border border-ink-200 bg-white text-ink-800 hover:border-brand-600/40 hover:bg-brand-50 hover:text-brand-700",
        "outline-light":
          "border border-white/30 bg-white/5 text-white backdrop-blur-sm hover:bg-white/15 hover:border-white/50",
        ghost: "text-ink-700 hover:bg-ink-100/70 hover:text-ink-900",
        "ghost-light": "text-white/90 hover:bg-white/10 hover:text-white",
        link: "text-brand-700 underline-offset-4 hover:underline p-0 h-auto",
        destructive:
          "border border-red-200 bg-white text-red-600 hover:bg-red-50",
        destructiveSolid:
          "bg-red-600 text-white shadow-soft-sm hover:bg-red-700",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-[13px]",
        lg: "h-12 px-6 text-[15px]",
        xl: "h-14 px-8 text-base",
        icon: "h-10 w-10 shrink-0",
        "icon-sm": "h-8 w-8 shrink-0",
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
