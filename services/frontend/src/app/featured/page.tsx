"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, LayoutGrid, Loader2 } from 'lucide-react';

import type { Product, PaginatedProductsResponse } from '@/lib/odooClient';
import { CATALOG_LABELS } from '@/lib/constants';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { ProductCard, ProductCardSkeleton } from '@/components/products/ProductCard';

const BATCH_SIZE = 20;

export default function FeaturedProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  const fetchFeaturedBatch = useCallback(async (targetOffset: number, append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setIsFetchingNextPage(true);
      }

      const params = new URLSearchParams();
      params.set('limit', String(BATCH_SIZE));
      params.set('offset', String(targetOffset));

      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load featured products');

      const data: Product[] | PaginatedProductsResponse = await res.json();

      let newItems: Product[] = [];
      let serverHasMore = false;
      let serverTotal = 0;

      if (Array.isArray(data)) {
        newItems = data;
        serverTotal = data.length;
        serverHasMore = false;
      } else {
        newItems = data.products || [];
        serverTotal = data.total || 0;
        serverHasMore = data.has_more ?? (targetOffset + newItems.length < serverTotal);
      }

      if (append) {
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const filteredNew = newItems.filter((p) => !existingIds.has(p.id));
          return [...prev, ...filteredNew];
        });
      } else {
        setProducts(newItems);
      }

      setTotalItems(serverTotal);
      setHasMore(serverHasMore);
    } catch (err) {
      console.error('Error fetching featured products batch:', err);
    } finally {
      setLoading(false);
      setIsFetchingNextPage(false);
    }
  }, []);

  useEffect(() => {
    fetchFeaturedBatch(0, false);
  }, [fetchFeaturedBatch]);

  // ── Cart handler ────────────────────────────────────────────────────────
  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();

    if (product.attribute_line_ids && product.attribute_line_ids.length > 0) {
      window.location.href = `/products/${product.id}`;
      return;
    }

    const storedCart = localStorage.getItem("med_cart");
    let cart: { id: number; name: string; quantity: number; price: number }[] = [];

    if (storedCart) {
      try { cart = JSON.parse(storedCart); } catch { cart = []; }
    }

    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        quantity: Math.max(1, product.min_order_qty || 1),
        price: product.list_price,
      });
    }

    localStorage.setItem("med_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
    setToastMessage(`${product.name} ${CATALOG_LABELS.addedToCart}!`);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-ink-50/40 py-10 sm:py-14">
      <div className="w-full px-4 sm:px-6">

        {/* ── Single canonical heading ─────────────────────────────────── */}
        <SectionHeading
          eyebrow="Live Catalog"
          title="Featured equipment, sourced with confidence."
          subtitle="Filter and search verified medical equipment from our supplier network — every listing shows real-time availability, compliance, and bulk pricing."
          align="left"
        />

        {/* Thin rule separating heading from grid — enterprise visual rhythm */}
        <div className="mt-8 border-b border-ink-100 pb-6" />

        {/* ── Product Grid ─────────────────────────────────────────────── */}
        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center">
              <LayoutGrid className="h-10 w-10 text-ink-300" />
              <h3 className="font-display text-lg font-semibold text-ink-800">No Products Currently Listed</h3>
              <p className="max-w-md text-sm text-ink-500">
                Check back soon or browse our home catalog for available medical equipment.
              </p>
              <Link
                href="/"
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
              >
                Browse Main Catalog
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {products.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} onAddToCart={handleAddToCart} />
                ))}
              </div>

              {/* Batch loading skeleton indicator */}
              {isFetchingNextPage && (
                <div className="mt-8">
                  <div className="mb-4 flex items-center justify-center gap-2 text-xs font-medium text-brand-700">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading more equipment...
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <ProductCardSkeleton key={`next-skel-${i}`} />
                    ))}
                  </div>
                </div>
              )}

              {hasMore && !isFetchingNextPage && (
                <div className="mt-10 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      fetchFeaturedBatch(products.length, true);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-brand-300 bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-soft-xs transition-all hover:border-brand-400 hover:bg-brand-50 hover:shadow-soft-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30"
                  >
                    Load More Equipment ({totalItems - products.length} remaining)
                  </button>
                </div>
              )}

              {/* End of catalog notice */}
              {!hasMore && products.length > 0 && (
                <div className="mt-12 text-center text-xs font-medium text-ink-400">
                  You&apos;ve viewed all {totalItems || products.length} products in our catalog
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-800 shadow-soft-lg sm:left-auto sm:right-6 sm:translate-x-0"
            role="status"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}