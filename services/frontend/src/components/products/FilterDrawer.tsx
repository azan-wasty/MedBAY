"use client";

import * as React from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { FilterSidebar, type FilterState } from "@/components/products/FilterSidebar";
import { FILTER_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface FilterDrawerProps {
  filters: FilterState;
  onChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onClearAll: () => void;
  categories: string[];
  vendors: string[];
  priceMin: number;
  priceMax: number;
  activeFilterCount: number;
}

export function FilterDrawer({
  filters,
  onChange,
  onClearAll,
  categories,
  vendors,
  priceMin,
  priceMax,
  activeFilterCount,
}: FilterDrawerProps) {
  return (
    <Sheet>
      {/* Trigger button — shown on mobile/tablet, hidden on lg+ */}
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-[13px] font-medium shadow-soft-xs transition-colors",
            activeFilterCount > 0
              ? "border-brand-300 bg-brand-50 text-brand-700 hover:bg-brand-100"
              : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
          )}
          aria-label={`Open filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ""}`}
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
          {FILTER_LABELS.showFilters}
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </SheetTrigger>

      {/* Slide-over drawer */}
      <SheetContent side="right" className="flex flex-col overflow-hidden p-0">
        <SheetHeader className="shrink-0">
          <SheetTitle>{FILTER_LABELS.sidebarTitle}</SheetTitle>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="ml-auto mr-10 text-[12px] font-medium text-ink-400 underline underline-offset-2 transition-colors hover:text-ink-700"
            >
              {FILTER_LABELS.clearAll}
            </button>
          )}
        </SheetHeader>

        {/* Scrollable filter content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <FilterSidebar
            filters={filters}
            onChange={onChange}
            onClearAll={onClearAll}
            categories={categories}
            vendors={vendors}
            priceMin={priceMin}
            priceMax={priceMax}
            compact
          />
        </div>

        {/* Footer close button */}
        <div className="shrink-0 border-t border-ink-100 px-5 py-4">
          <SheetClose asChild>
            <button
              type="button"
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-brand-glow transition-colors hover:bg-brand-700"
            >
              {FILTER_LABELS.apply}
            </button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
