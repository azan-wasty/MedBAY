"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, Building2, ImageOff } from "lucide-react";

import { CATALOG_LABELS } from "@/lib/constants";
import { STOCK_STATUS_MAP } from "@/lib/constants";
import { getProductImageSrc } from "@/lib/image";
import type { Product } from "@/lib/odooClient";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ProductCard({
  product,
  index = 0,
  onAddToCart,
}: {
  product: Product;
  index?: number;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
}) {
  const categoryName = Array.isArray(product.categ_id) ? product.categ_id[1] : product.categ_id;
  const imageSrc = getProductImageSrc(product.image_256);
  const isOutOfStock = product.stock_status === "out_of_stock";
  const hasVariants = Boolean(product.attribute_line_ids && product.attribute_line_ids.length > 0);
  const stockConfig = product.stock_status ? STOCK_STATUS_MAP[product.stock_status] : undefined;

  return (
    <motion.div
      custom={index % 4}
      variants={{
        hidden: { opacity: 0, y: 18 },
        visible: (i: number = 0) => ({
          opacity: 1,
          y: 0,
          transition: { duration: 0.35, delay: i * 0.06, ease: [0.4, 0, 0.2, 1] },
        }),
      }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-ink-100 bg-white shadow-soft-sm transition-shadow duration-300 hover:border-brand-200 hover:shadow-soft-lg"
    >
      <Link href={`/products/${product.id}`} className="relative block aspect-[4/3] overflow-hidden bg-ink-50">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-300">
            <ImageOff className="h-9 w-9" strokeWidth={1.4} />
          </div>
        )}

        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          {product.has_vendor_company ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-white/95 px-2.5 py-1 text-[10.5px] font-semibold text-brand-700 shadow-soft-xs backdrop-blur-sm">
              <ShieldCheck className="h-3 w-3" />
              Verified
            </span>
          ) : (
            <span />
          )}
          {stockConfig && product.stock_status !== "not_tracked" && (
            <StatusBadge config={stockConfig} className="shadow-soft-xs backdrop-blur-sm" />
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">
          {categoryName || "Equipment"}
        </span>

        <h3 className="mt-1.5 line-clamp-2 font-display text-[15.5px] font-semibold leading-snug text-ink-900">
          <Link href={`/products/${product.id}`} className="transition-colors hover:text-brand-700">
            {product.name}
          </Link>
        </h3>

        <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-500">
          {product.description_sale || "No description provided."}
        </p>

        <div className="mt-3.5 flex items-baseline justify-between gap-2 rounded-lg bg-ink-50/70 px-3 py-2.5">
          <span className="text-[10.5px] font-medium uppercase tracking-wide text-ink-400">
            {CATALOG_LABELS.priceOnRequest}
          </span>
          <span className="font-data text-[15px] font-semibold text-ink-900">
            {product.list_price > 0
              ? `$${product.list_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "Contact Sales"}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-500">
          <span>
            {CATALOG_LABELS.moqLabel}: <strong className="font-medium text-ink-700">{product.min_order_qty}</strong>
          </span>
          <span>
            {CATALOG_LABELS.warrantyLabel}:{" "}
            <strong className="font-medium text-ink-700">{product.warranty_period || "N/A"}</strong>
          </span>
        </div>

        {Array.isArray(product.vendor_id) && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink-500">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-ink-400" />
            Supplier: <strong className="font-medium text-ink-700">{product.vendor_id[1]}</strong>
          </div>
        )}

        <div className="mt-4 flex gap-2 pt-1">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={`/products/${product.id}`}>{CATALOG_LABELS.viewDetails}</Link>
          </Button>
          {isOutOfStock ? (
            <Button
              disabled
              size="sm"
              variant="outline"
              title={CATALOG_LABELS.outOfStockTooltip}
              className="flex-1 cursor-not-allowed border-ink-200 bg-ink-50 text-ink-400 hover:bg-ink-50 hover:text-ink-400"
            >
              {CATALOG_LABELS.outOfStockLabel}
            </Button>
          ) : (
            <Button size="sm" variant="brand" className="flex-1" onClick={(e) => onAddToCart(product, e)}>
              {hasVariants ? "Select Options" : CATALOG_LABELS.addToCart}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-ink-100 bg-white shadow-soft-sm">
      <div className="skeleton-shimmer aspect-[4/3] w-full" />
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <div className="skeleton-shimmer h-2.5 w-1/3 rounded" />
        <div className="skeleton-shimmer h-4 w-4/5 rounded" />
        <div className="skeleton-shimmer h-3 w-full rounded" />
        <div className="skeleton-shimmer mt-1.5 h-9 w-full rounded-lg" />
        <div className="mt-2 flex gap-2">
          <div className="skeleton-shimmer h-9 flex-1 rounded-md" />
          <div className="skeleton-shimmer h-9 flex-1 rounded-md" />
        </div>
      </div>
    </div>
  );
}
