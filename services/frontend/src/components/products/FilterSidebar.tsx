"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import * as RadixAccordion from "@radix-ui/react-accordion";

import {
  CATALOG_LABELS,
  FILTER_LABELS,
  SORT_OPTIONS,
  type SortOption,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { PriceRangeSlider } from "@/components/products/PriceRangeSlider";

export interface FilterState {
  category: string;
  priceRange: [number, number];
  vendors: string[];
  availability: string[];
  sort: SortOption;
}

interface FilterSidebarProps {
  filters: FilterState;
  onChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onClearAll: () => void;
  categories: string[];
  vendors: string[];
  priceMin: number;
  priceMax: number;
  /** Compact mode: used inside the mobile sheet — hides outer padding */
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Reusable accordion section
// ---------------------------------------------------------------------------

function FilterSection({
  value,
  label,
  children,
}: {
  value: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <RadixAccordion.Item
      value={value}
      className="border-b border-ink-100 last:border-b-0"
    >
      <RadixAccordion.Header asChild>
        <RadixAccordion.Trigger
          className={cn(
            "group flex w-full items-center justify-between py-3 text-[13px] font-semibold text-ink-800",
            "transition-colors hover:text-brand-700",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30 focus-visible:ring-offset-1"
          )}
        >
          {label}
          <ChevronDown
            className="h-4 w-4 shrink-0 text-ink-400 transition-transform duration-200 group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </RadixAccordion.Trigger>
      </RadixAccordion.Header>
      <RadixAccordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="pb-4 pt-1">{children}</div>
      </RadixAccordion.Content>
    </RadixAccordion.Item>
  );
}

// ---------------------------------------------------------------------------
// Checkbox row
// ---------------------------------------------------------------------------

function FilterCheckbox({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1.5 text-[13px] text-ink-700 transition-colors hover:bg-ink-50 hover:text-ink-900"
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
          checked
            ? "border-brand-600 bg-brand-600"
            : "border-ink-300 bg-white hover:border-brand-400"
        )}
        aria-hidden
      >
        {checked && (
          <svg viewBox="0 0 10 8" fill="none" className="h-2.5 w-2.5">
            <path
              d="M1 4l2.5 2.5L9 1"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <input
        id={id}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Main sidebar
// ---------------------------------------------------------------------------

export function FilterSidebar({
  filters,
  onChange,
  onClearAll,
  categories,
  vendors,
  priceMin,
  priceMax,
  compact = false,
}: FilterSidebarProps) {
  const { category, priceRange, vendors: selectedVendors, availability, sort } = filters;

  const toggleArrayItem = <K extends "vendors" | "availability">(
    key: K,
    item: string
  ) => {
    const arr = filters[key] as string[];
    onChange(
      key,
      arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item]
    );
  };

  // Determine which accordion items are open by default.
  // Vendor section is closed by default (can be very long).
  const defaultOpenValues = React.useMemo(
    () => ["category", "price", "availability", "sort"],
    []
  );

  return (
    <div
      className={cn(
        "flex flex-col",
        !compact && "rounded-xl border border-ink-100 bg-white shadow-soft-sm"
      )}
    >
      {/* Header row */}
      {!compact && (
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <span className="text-[13px] font-semibold text-ink-800">
            {FILTER_LABELS.sidebarTitle}
          </span>
          <button
            type="button"
            onClick={onClearAll}
            className="text-[12px] font-medium text-ink-400 underline underline-offset-2 transition-colors hover:text-ink-700"
          >
            {FILTER_LABELS.clearAll}
          </button>
        </div>
      )}

      <RadixAccordion.Root
        type="multiple"
        defaultValue={defaultOpenValues}
        className={cn("flex flex-col divide-y divide-ink-100", !compact ? "px-5" : "px-1")}
      >
        {/* ── Category ── */}
        <FilterSection value="category" label={FILTER_LABELS.categorySection}>
          <div className="flex flex-col gap-0.5">
            {/* All categories */}
            <button
              type="button"
              onClick={() => onChange("category", "")}
              className={cn(
                "relative flex w-full items-center rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors",
                !category
                  ? "text-brand-700"
                  : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
              )}
            >
              {!category && (
                <motion.span
                  layoutId="activeFilterCategoryBg"
                  className="absolute inset-0 rounded-lg border-l-[3px] border-brand-600 bg-brand-50"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              {CATALOG_LABELS.filterAll}
            </button>

            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onChange("category", cat === category ? "" : cat)}
                className={cn(
                  "relative flex w-full items-center rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors",
                  category === cat
                    ? "text-brand-700"
                    : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                )}
              >
                {category === cat && (
                  <motion.span
                    layoutId="activeFilterCategoryBg"
                    className="absolute inset-0 rounded-lg border-l-[3px] border-brand-600 bg-brand-50"
                    style={{ zIndex: -1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {cat}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* ── Price Range ── */}
        {priceMax > priceMin && (
          <FilterSection value="price" label={FILTER_LABELS.priceSection}>
            <PriceRangeSlider
              min={priceMin}
              max={priceMax}
              value={priceRange}
              onChange={(v) => onChange("priceRange", v)}
              formatValue={(v) =>
                v >= 1000000
                  ? `$${(v / 1000000).toFixed(1)}M`
                  : v >= 1000
                  ? `$${(v / 1000).toFixed(0)}k`
                  : `$${v}`
              }
            />
          </FilterSection>
        )}

        {/* ── Brand / Vendor ── */}
        {vendors.length > 0 && (
          <FilterSection value="vendor" label={FILTER_LABELS.vendorSection}>
            <div className="flex flex-col gap-0.5">
              {vendors.map((v) => (
                <FilterCheckbox
                  key={v}
                  id={`vendor-${v.replace(/\s+/g, "-")}`}
                  label={v}
                  checked={selectedVendors.includes(v)}
                  onChange={() => toggleArrayItem("vendors", v)}
                />
              ))}
            </div>
          </FilterSection>
        )}

        {/* ── Availability ── */}
        <FilterSection value="availability" label={FILTER_LABELS.availabilitySection}>
          <div className="flex flex-col gap-0.5">
            {[
              { id: "in_stock", label: FILTER_LABELS.stockInStock },
              { id: "low_stock", label: FILTER_LABELS.stockLowStock },
              { id: "out_of_stock", label: FILTER_LABELS.stockOutOfStock },
            ].map(({ id, label }) => (
              <FilterCheckbox
                key={id}
                id={`avail-${id}`}
                label={label}
                checked={availability.includes(id)}
                onChange={() => toggleArrayItem("availability", id)}
              />
            ))}
          </div>
        </FilterSection>

        {/* ── Sort ── */}
        <FilterSection value="sort" label={FILTER_LABELS.sortSection}>
          <div className="flex flex-col gap-0.5">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange("sort", opt.value)}
                className={cn(
                  "relative flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] font-medium transition-colors",
                  sort === opt.value
                    ? "text-brand-700"
                    : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                )}
              >
                <span
                  className={cn(
                    "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    sort === opt.value
                      ? "border-brand-600"
                      : "border-ink-300"
                  )}
                >
                  {sort === opt.value && (
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                  )}
                </span>
                {opt.label}
              </button>
            ))}
          </div>
        </FilterSection>
      </RadixAccordion.Root>
    </div>
  );
}
