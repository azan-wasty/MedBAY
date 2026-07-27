"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PriceRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatValue?: (v: number) => string;
  className?: string;
}

export function PriceRangeSlider({
  min,
  max,
  value,
  onChange,
  formatValue = (v) => `$${v.toLocaleString()}`,
  className,
}: PriceRangeSliderProps) {
  const [lo, hi] = value;

  // Uncontrolled-style text: store what the user is typing as a raw string.
  // We only read/write the number when the user commits (blur or Enter).
  const loRef = React.useRef<HTMLInputElement>(null);
  const hiRef = React.useRef<HTMLInputElement>(null);

  // Sync inputs when the value changes externally (slider drag, Clear all)
  // but only if the input isn't currently focused.
  React.useLayoutEffect(() => {
    if (loRef.current && document.activeElement !== loRef.current) {
      loRef.current.value = String(lo);
    }
  }, [lo]);

  React.useLayoutEffect(() => {
    if (hiRef.current && document.activeElement !== hiRef.current) {
      hiRef.current.value = String(hi);
    }
  }, [hi]);

  const loPercent = max === min ? 0 : Math.max(0, Math.min(100, ((lo - min) / (max - min)) * 100));
  const hiPercent = max === min ? 100 : Math.max(0, Math.min(100, ((hi - min) / (max - min)) * 100));

  /* ── Slider drag ──────────────────────────────────────────────────────── */
  const handleLoSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    onChange([Math.min(v, hi), hi]);
  };

  const handleHiSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    onChange([lo, Math.max(v, lo)]);
  };

  /* ── Text input commit ────────────────────────────────────────────────── */
  const commitLo = () => {
    if (!loRef.current) return;
    const raw = loRef.current.value.replace(/[^0-9.]/g, "");
    const v = parseFloat(raw);
    if (!isNaN(v) && isFinite(v)) {
      // Allow any non-negative value; clamp only so lo <= hi
      const clamped = Math.max(0, Math.min(v, hi));
      onChange([clamped, hi]);
      loRef.current.value = String(clamped);
    } else {
      loRef.current.value = String(lo); // revert if empty/invalid
    }
  };

  const commitHi = () => {
    if (!hiRef.current) return;
    const raw = hiRef.current.value.replace(/[^0-9.]/g, "");
    const v = parseFloat(raw);
    if (!isNaN(v) && isFinite(v)) {
      // Allow any value >= lo; no artificial ceiling from catalog max
      const clamped = Math.max(v, lo);
      onChange([lo, clamped]);
      hiRef.current.value = String(clamped);
    } else {
      hiRef.current.value = String(hi);
    }
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Track + thumbs */}
      <div className="relative h-5 w-full">
        {/* Base track */}
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-ink-100" />

        {/* Active fill */}
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand-600"
          style={{ left: `${loPercent}%`, right: `${100 - hiPercent}%` }}
        />

        {/* Lower thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={lo}
          onChange={handleLoSlider}
          aria-label="Minimum price slider"
          className={cn(
            "pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent",
            "[&::-webkit-slider-thumb]:pointer-events-auto",
            "[&::-webkit-slider-thumb]:h-4",
            "[&::-webkit-slider-thumb]:w-4",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:border-2",
            "[&::-webkit-slider-thumb]:border-brand-600",
            "[&::-webkit-slider-thumb]:bg-white",
            "[&::-webkit-slider-thumb]:shadow-soft-sm",
            "[&::-webkit-slider-thumb]:transition-shadow",
            "[&::-webkit-slider-thumb]:hover:shadow-brand-glow",
            "[&::-webkit-slider-thumb]:cursor-grab",
            "[&::-webkit-slider-thumb]:active:cursor-grabbing",
            "[&::-moz-range-thumb]:pointer-events-auto",
            "[&::-moz-range-thumb]:h-4",
            "[&::-moz-range-thumb]:w-4",
            "[&::-moz-range-thumb]:appearance-none",
            "[&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:border-2",
            "[&::-moz-range-thumb]:border-brand-600",
            "[&::-moz-range-thumb]:bg-white",
            "[&::-moz-range-thumb]:cursor-grab",
          )}
        />

        {/* Upper thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={hi}
          onChange={handleHiSlider}
          aria-label="Maximum price slider"
          className={cn(
            "pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent",
            "[&::-webkit-slider-thumb]:pointer-events-auto",
            "[&::-webkit-slider-thumb]:h-4",
            "[&::-webkit-slider-thumb]:w-4",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:border-2",
            "[&::-webkit-slider-thumb]:border-brand-600",
            "[&::-webkit-slider-thumb]:bg-white",
            "[&::-webkit-slider-thumb]:shadow-soft-sm",
            "[&::-webkit-slider-thumb]:transition-shadow",
            "[&::-webkit-slider-thumb]:hover:shadow-brand-glow",
            "[&::-webkit-slider-thumb]:cursor-grab",
            "[&::-webkit-slider-thumb]:active:cursor-grabbing",
            "[&::-moz-range-thumb]:pointer-events-auto",
            "[&::-moz-range-thumb]:h-4",
            "[&::-moz-range-thumb]:w-4",
            "[&::-moz-range-thumb]:appearance-none",
            "[&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:border-2",
            "[&::-moz-range-thumb]:border-brand-600",
            "[&::-moz-range-thumb]:bg-white",
            "[&::-moz-range-thumb]:cursor-grab",
          )}
        />
      </div>

      {/* Text inputs — uncontrolled DOM refs so React never overrides mid-type */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-ink-400">
            $
          </span>
          <input
            ref={loRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            defaultValue={String(lo)}
            onBlur={commitLo}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur())}
            aria-label="Minimum price"
            placeholder="0"
            className="h-8 w-full rounded-md border border-ink-200 bg-white pl-6 pr-2 text-[12px] font-medium text-ink-900 focus-visible:border-brand-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-600/30"
          />
        </div>

        <span className="shrink-0 text-[11px] text-ink-300">—</span>

        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-ink-400">
            $
          </span>
          <input
            ref={hiRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            defaultValue={String(hi)}
            onBlur={commitHi}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur())}
            aria-label="Maximum price"
            placeholder="Any"
            className="h-8 w-full rounded-md border border-ink-200 bg-white pl-6 pr-2 text-[12px] font-medium text-ink-900 focus-visible:border-brand-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-600/30"
          />
        </div>
      </div>

      {/* Summary label */}
      <p className="text-[11px] text-ink-400">
        {formatValue(lo)} — {hi >= max ? "Any" : formatValue(hi)}
      </p>
    </div>
  );
}
