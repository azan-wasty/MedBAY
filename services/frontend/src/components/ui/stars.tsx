"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read-only star display for showing an existing rating (reviews lists). */
function Stars({ rating, className, size = 14 }: { rating: number; className?: string; size?: number }) {
  return (
    <div className={cn("flex items-center gap-0.5", className)} role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          width={size}
          height={size}
          className={i <= rating ? "fill-amber-400 text-amber-400" : "fill-transparent text-ink-200"}
        />
      ))}
    </div>
  );
}

/** Interactive star picker used on the review submission form. */
function StarRatingInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = React.useState(0);
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => !disabled && setHover(star)}
          onMouseLeave={() => !disabled && setHover(0)}
          className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:cursor-default disabled:hover:scale-100"
        >
          <Star
            width={22}
            height={22}
            className={star <= (hover || value) ? "fill-amber-400 text-amber-400" : "fill-transparent text-ink-300"}
          />
        </button>
      ))}
    </div>
  );
}

export { Stars, StarRatingInput };
