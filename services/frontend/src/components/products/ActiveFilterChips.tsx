"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { FILTER_LABELS } from "@/lib/constants";
import type { SortOption } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface ActiveChip {
  id: string;
  label: string;
  onRemove: () => void;
}

interface ActiveFilterChipsProps {
  chips: ActiveChip[];
  onClearAll: () => void;
  totalProducts: number;
  filteredCount: number;
  className?: string;
}

export function ActiveFilterChips({
  chips,
  onClearAll,
  totalProducts,
  filteredCount,
  className,
}: ActiveFilterChipsProps) {
  const hasChips = chips.length > 0;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Result count — always visible */}
      <span className="mr-1 shrink-0 text-[13px] font-medium text-ink-600">
        {FILTER_LABELS.resultCount(filteredCount, totalProducts)}
      </span>

      <AnimatePresence initial={false} mode="popLayout">
        {chips.map((chip) => (
          <motion.button
            key={chip.id}
            layout
            initial={{ opacity: 0, scale: 0.85, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            type="button"
            onClick={chip.onRemove}
            aria-label={`${FILTER_LABELS.removeFilter}: ${chip.label}`}
            className="group inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[12px] font-medium text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-100"
          >
            {chip.label}
            <X
              className="h-3 w-3 shrink-0 text-brand-500 transition-colors group-hover:text-brand-700"
              aria-hidden
            />
          </motion.button>
        ))}

        {hasChips && (
          <motion.button
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            type="button"
            onClick={onClearAll}
            className="ml-1 text-[12px] font-medium text-ink-400 underline underline-offset-2 transition-colors hover:text-ink-700"
          >
            {FILTER_LABELS.clearAll}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
