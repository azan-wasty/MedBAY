"use client";

import * as React from "react";
import Link from "next/link";
import { ShieldCheck, Building2, ImageOff, ArrowRight } from "lucide-react";

import { STOCK_STATUS_MAP } from "@/lib/constants";
import { getProductImageSrc } from "@/lib/image";
import type { Product } from "@/lib/odooClient";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// HeroProductCard — Horizontal full-bleed featured product card
// ---------------------------------------------------------------------------
// Designed for the hero section only. Horizontal on sm+, stacks on mobile.
// The caller is responsible for the outer rounded-2xl / overflow-hidden /
// border / shadow container — this component renders only the card content.
//
// To flip image to the right, pass imagePosition="right".
// ---------------------------------------------------------------------------

export interface HeroProductCardProps {
  product: Product;
  shouldReduceMotion: boolean;
  /** Current slide index in a multi-product rotator (optional) */
  activeIndex?: number;
  /** Total slide count — used for "1 / N" counter display (optional) */
  total?: number;
  /** Which side the image sits on. Defaults to "left". */
  imagePosition?: "left" | "right";
}

export function HeroProductCard({
  product,
  shouldReduceMotion,
  activeIndex,
  total,
  imagePosition = "left",
}: HeroProductCardProps) {
  const categoryName = Array.isArray(product.categ_id)
    ? (product.categ_id[1] as string)
    : typeof product.categ_id === "string"
      ? product.categ_id
      : null;

  const vendorName = Array.isArray(product.vendor_id)
    ? (product.vendor_id[1] as string)
    : null;

  const imageSrc = getProductImageSrc(product.image_1920 || product.image_256, categoryName || undefined);

  const stockConfig = product.stock_status
    ? STOCK_STATUS_MAP[product.stock_status]
    : undefined;

  const isOutOfStock = product.stock_status === "out_of_stock";
  const isMulti = typeof total === "number" && total > 1;
  const imgRight = imagePosition === "right";

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row",
        imgRight && "sm:flex-row-reverse"
      )}
    >
      {/* ── Image Panel ─────────────────────────────────────────────────── */}
      <div className="relative min-h-[220px] w-full shrink-0 overflow-hidden bg-ink-50 sm:w-[45%]">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={product.name}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className={cn(
              "h-full w-full object-cover transition-transform duration-500 ease-out",
              !shouldReduceMotion && "group-hover:scale-[1.04]"
            )}
          />
        ) : (
          <div
            role="img"
            aria-label={`No image available for ${product.name}`}
            className="flex h-full w-full items-center justify-center text-ink-300"
          >
            <ImageOff className="h-12 w-12" strokeWidth={1.3} />
          </div>
        )}

        {/* Stock status badge — top corner */}
        {stockConfig && product.stock_status !== "not_tracked" && (
          <div className="absolute left-3.5 top-3.5">
            <StatusBadge config={stockConfig} className="shadow-soft-xs backdrop-blur-sm" />
          </div>
        )}
      </div>

      {/* ── Details Panel ───────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-between p-6 sm:p-8">

        {/* ── Top: identity block ─────────────────────────────────────── */}
        <div>
          {/* Eyebrow row: category label + verified badge + slide counter */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {categoryName && (
              <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-600">
                {categoryName}
              </span>
            )}

            {/* "Verified Supplier" is always shown on hero featured products */}
            <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[10.5px] font-semibold text-brand-700">
              <ShieldCheck className="h-3 w-3 text-brand-600" />
              Verified Supplier
            </span>

            {isMulti && typeof activeIndex === "number" && (
              <span className="ml-auto text-[11px] font-medium tabular-nums text-ink-400">
                {activeIndex + 1}&thinsp;/&thinsp;{total}
              </span>
            )}
          </div>

          {/* Product name */}
          <h3 className="mt-3 font-display text-xl font-semibold leading-snug text-ink-900 sm:text-[1.45rem]">
            <Link
              href={`/products/${product.id}`}
              className="transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:underline focus-visible:decoration-brand-600 focus-visible:decoration-2 focus-visible:underline-offset-4"
            >
              {product.name}
            </Link>
          </h3>

          {/* Description — hidden when empty (per user request) */}
          {product.description_sale && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-500">
              {product.description_sale}
            </p>
          )}

          {/* Supplier line */}
          {vendorName && (
            <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] text-ink-500">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-ink-400" />
              <span className="truncate">{vendorName}</span>
            </p>
          )}
        </div>

        {/* ── Bottom: pricing + meta + CTA ────────────────────────────── */}
        <div className="mt-5 space-y-3.5">

          {/* Price block */}
          <div className="flex items-center justify-between rounded-lg bg-ink-50/80 py-3 pl-0 pr-4">
            <span className="text-[10.5px] font-medium uppercase tracking-wide text-ink-400">
              List Price
            </span>
            <span className="text-[17px] font-semibold tabular-nums text-ink-900">
              {product.list_price > 0
                ? `$${product.list_price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : "Contact Sales"}
            </span>
          </div>

          {/* Meta: MOQ + Warranty */}
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-500">
            <span>
              MOQ:{" "}
              <strong className="font-medium text-ink-700">
                {product.min_order_qty}
              </strong>
            </span>
            {product.warranty_period && (
              <span>
                Warranty:{" "}
                <strong className="font-medium text-ink-700">
                  {product.warranty_period}
                </strong>
              </span>
            )}
          </div>

          {/* Primary CTA */}
          <Button
            asChild
            variant="brand"
            size="default"
            className="w-full shadow-soft-xs focus-visible:ring-2 focus-visible:ring-brand-600/40 active:scale-[0.98]"
          >
            <Link href={`/products/${product.id}`}>
              {isOutOfStock ? "Check Availability" : "View Product"}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HeroProductCardSkeleton — horizontal loading shimmer
// ---------------------------------------------------------------------------

export function HeroProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft-xl sm:flex-row">
      {/* Image shimmer */}
      <div className="skeleton-shimmer min-h-[220px] w-full sm:w-[45%]" />

      {/* Content shimmer */}
      <div className="flex flex-1 flex-col justify-between gap-6 p-6 sm:p-8">
        <div className="space-y-3">
          {/* Eyebrow chips */}
          <div className="flex gap-2">
            <div className="skeleton-shimmer h-4 w-20 rounded-full" />
            <div className="skeleton-shimmer h-4 w-28 rounded-full" />
          </div>
          {/* Title */}
          <div className="skeleton-shimmer h-6 w-4/5 rounded" />
          <div className="skeleton-shimmer h-4 w-full rounded" />
          {/* Vendor */}
          <div className="skeleton-shimmer h-3.5 w-2/5 rounded" />
        </div>

        <div className="space-y-3">
          {/* Price block */}
          <div className="skeleton-shimmer h-12 w-full rounded-lg" />
          {/* Meta */}
          <div className="skeleton-shimmer h-3.5 w-1/2 rounded" />
          {/* CTA */}
          <div className="skeleton-shimmer h-11 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
