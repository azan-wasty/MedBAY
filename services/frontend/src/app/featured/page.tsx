'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowLeft, CheckCircle2, LayoutGrid } from 'lucide-react';

import type { Product } from '@/lib/odooClient';
import { CATALOG_LABELS } from '@/lib/constants';
import { Container } from '@/components/shared/Container';
import { ProductCard, ProductCardSkeleton } from '@/components/products/ProductCard';

export default function FeaturedProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string>('');

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/products/featured');
        if (!res.ok) throw new Error('Failed to load featured products');
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error('Error fetching featured products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatured();
  }, []);

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();

    if (product.attribute_line_ids && product.attribute_line_ids.length > 0) {
      window.location.href = `/products/${product.id}`;
      return;
    }

    const storedCart = localStorage.getItem('med_cart');
    let cart: { id: number; name: string; quantity: number; price: number }[] = [];

    if (storedCart) {
      try {
        cart = JSON.parse(storedCart);
      } catch {
        cart = [];
      }
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

    localStorage.setItem('med_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cart-updated'));

    setToastMessage(`${product.name} ${CATALOG_LABELS.addedToCart}!`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  return (
    <div className="min-h-screen bg-ink-50/40 py-10 sm:py-16">
      <Container>
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-500 transition-colors hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Full Catalog
          </Link>
        </div>

        {/* Page Header */}
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-700">
            <Sparkles className="h-3.5 w-3.5" />
            Curated Sourcing
          </span>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Featured Medical Equipment
          </h1>
          <p className="mt-3 text-base text-ink-500">
            Explore priority-curated medical equipment, critical devices, and supplies from verified B2B manufacturers and distributors.
          </p>
        </div>

        {/* Product Grid */}
        <div className="mt-10">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-white py-20 text-center">
              <LayoutGrid className="h-10 w-10 text-ink-300" />
              <h3 className="font-display text-lg font-semibold text-ink-800">No Featured Products Currently Listed</h3>
              <p className="max-w-md text-sm text-ink-500">
                Check back soon or browse our main catalog for all available medical equipment.
              </p>
              <Link
                href="/"
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Browse Full Catalog
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} onAddToCart={handleAddToCart} />
              ))}
            </div>
          )}
        </div>
      </Container>

      {/* Toast Notification */}
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
