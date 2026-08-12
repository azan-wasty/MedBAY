'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Minus, Plus, Trash2, ArrowRight, Loader2, PackageCheck, ShoppingCart, MessageSquare, Tag } from 'lucide-react';

import { CART_LABELS, AUTH_LABELS } from '@/lib/constants';
import { Container } from '@/components/shared/Container';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter,
} from '@/components/ui/dialog';

interface PriceBreak {
  min_qty: number;
  price: number;
  discount_pct: number;
}

interface CartItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  variantId?: number;
  variantLabel?: string;
  targetPrice?: number;
}

/** Pick the best price break for a given quantity. */
function effectivePrice(breaks: PriceBreak[] | undefined, qty: number, fallback: number): number {
  if (!breaks || breaks.length === 0) return fallback;
  const sorted = [...breaks].sort((a, b) => b.min_qty - a.min_qty);
  const match = sorted.find((b) => qty >= b.min_qty);
  return match ? match.price : fallback;
}

function activeBulkBreak(breaks: PriceBreak[] | undefined, qty: number): PriceBreak | null {
  if (!breaks || breaks.length === 0) return null;
  const sorted = [...breaks].sort((a, b) => b.min_qty - a.min_qty);
  const match = sorted.find((b) => qty >= b.min_qty && b.discount_pct > 0);
  return match ?? null;
}

const alertVariants: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.15 } },
};

export default function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [pricingMap, setPricingMap] = useState<Record<number, PriceBreak[]>>({});
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [submittedRfq, setSubmittedRfq] = useState<{ id?: number; name?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [buyerNotes, setBuyerNotes] = useState<string>('');
  const [showUnverifiedModal, setShowUnverifiedModal] = useState<boolean>(false);

  /** Fetch bulk pricing tiers for a list of product ids we don't have yet. */
  const fetchPricing = useCallback(async (items: CartItem[]) => {
    const ids = [...new Set(items.map((i) => i.id))];
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`/api/products/${id}/pricing`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    );
    const map: Record<number, PriceBreak[]> = {};
    results.forEach((res, i) => {
      if (res.status === 'fulfilled' && res.value?.price_breaks) {
        map[ids[i]] = res.value.price_breaks as PriceBreak[];
      }
    });
    setPricingMap((prev: Record<number, PriceBreak[]>) => ({ ...prev, ...map }));
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('med_user');
    setIsLoggedIn(!!storedUser);

    const loadCart = () => {
      const storedCart = localStorage.getItem('med_cart');
      if (storedCart) {
        try {
          const items: CartItem[] = JSON.parse(storedCart);
          setCartItems(items);
          // Fetch bulk pricing tiers for all cart items immediately
          if (items.length > 0) fetchPricing(items);
        } catch {
          setCartItems([]);
        }
      }
    };

    loadCart();
  }, [fetchPricing]);

  const handleUpdateQty = (itemId: number, newQty: number) => {
    const updated = cartItems.map((item) => {
      if (item.id === itemId) {
        return { ...item, quantity: Math.max(1, newQty) };
      }
      return item;
    });

    setCartItems(updated);
    localStorage.setItem('med_cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cart-updated'));
  };

  const handleUpdateTargetPrice = (itemId: number, raw: string) => {
    const val = parseFloat(raw);
    const updated = cartItems.map((item) =>
      item.id === itemId ? { ...item, targetPrice: isNaN(val) || val <= 0 ? undefined : val } : item
    );
    setCartItems(updated);
    localStorage.setItem('med_cart', JSON.stringify(updated));
  };

  const handleRemoveItem = (itemId: number) => {
    const filtered = cartItems.filter((item) => item.id !== itemId);
    setCartItems(filtered);
    localStorage.setItem('med_cart', JSON.stringify(filtered));
    window.dispatchEvent(new Event('cart-updated'));
  };

  const handleClearCart = () => {
    setCartItems([]);
    localStorage.removeItem('med_cart');
    window.dispatchEvent(new Event('cart-updated'));
  };

  const handleSubmitRFQ = async () => {
    if (!isLoggedIn) {
      // Redirect to login and preserve /cart as the post-login destination.
      // Cart contents are safe in localStorage and will still be there after login.
      router.push('/login?redirect=/cart');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const items = cartItems.map((item) => ({
        product_id: item.id,
        ...(item.variantId ? { variant_id: item.variantId } : {}),
        quantity: item.quantity,
        ...(item.targetPrice && item.targetPrice > 0 ? { target_price: item.targetPrice } : {}),
      }));

      const res = await fetch('/api/rfq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, notes: buyerNotes.trim() }),
      });

      const data = await res.json();

      if (res.status === 403) {
        setShowUnverifiedModal(true);
        return;
      }

      if (res.status === 401) {
        setIsLoggedIn(false);
        localStorage.removeItem('med_user');
        window.dispatchEvent(new Event('auth-updated'));
        throw new Error(AUTH_LABELS.unauthorizedMsg);
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to submit Request for Quote');
      }

      setSubmittedRfq({ id: data.rfq_id, name: data.name });
      setSuccess(true);
      handleClearCart();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while submitting the RFQ.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-[calc(100vh-4.5rem)] items-center bg-ink-50/40 py-16">
        <Container className="flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
            className="w-full max-w-md rounded-2xl border border-ink-100 bg-white p-8 text-center shadow-soft-lg"
          >
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <PackageCheck className="h-7 w-7" />
            </span>
            <h2 className="mt-5 font-display text-xl font-semibold text-ink-900">{CART_LABELS.successTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">{CART_LABELS.successSubtitle}</p>

            {submittedRfq && (
              <div className="mt-6 flex items-center justify-between rounded-lg border border-ink-100 bg-ink-50/70 px-4 py-3">
                <span className="text-[13px] font-medium text-ink-500">Reference ID</span>
                <strong className="font-data text-[15px] text-ink-900">{submittedRfq.name}</strong>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <Button asChild variant="brand" className="flex-1">
                <Link href="/dashboard">View Status</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/">Back to Catalog</Link>
              </Button>
            </div>
          </motion.div>
        </Container>
      </div>
    );
  }

  const totalItems = cartItems.reduce((acc, curr) => acc + curr.quantity, 0);
  const orgName = isLoggedIn ? JSON.parse(localStorage.getItem('med_user') || '{}').name : 'Not Signed In';

  return (
    <>
    <div className="bg-ink-50/40 py-10 sm:py-14">
      <Container>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
          {CART_LABELS.title}
        </h1>
        <p className="mt-1 text-sm text-ink-500">{CART_LABELS.subtitle}</p>

        <AnimatePresence>
          {errorMsg && (
            <motion.div variants={alertVariants} initial="hidden" animate="visible" exit="exit" className="mt-5">
              <Alert variant="error">
                {errorMsg}
                {!isLoggedIn && (
                  <div className="mt-1">
                    <Link href="/login" className="font-semibold underline underline-offset-2">
                      Sign in now
                    </Link>
                  </div>
                )}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {cartItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-16 text-center"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-50 text-ink-300">
              <ShoppingCart className="h-6 w-6" />
            </span>
            <p className="max-w-sm text-sm text-ink-500">{CART_LABELS.emptyCart}</p>
            <Button asChild variant="brand">
              <Link href="/">Browse Catalog</Link>
            </Button>
          </motion.div>
        ) : (
          <div className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_340px]">
            {/* ── Item list ── */}
            <div className="min-w-0 overflow-hidden rounded-xl border border-ink-100 bg-white shadow-soft-xs">
              <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
                <span className="text-sm font-medium text-ink-600">
                  {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
                </span>
                <button
                  onClick={handleClearCart}
                  className="text-xs font-semibold text-ink-500 transition-colors hover:text-red-600"
                >
                  {CART_LABELS.clearCart}
                </button>
              </div>

              {/* Column headers */}
              <div className="hidden grid-cols-[1fr_auto_140px_140px_36px] items-center gap-3 border-b border-ink-100 bg-ink-50/60 px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-400 sm:grid">
                <span>Product</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Unit Price</span>
                <span className="text-center">Your Target Price</span>
                <span />
              </div>

              <ul>
                <AnimatePresence initial={false}>
                  {cartItems.map((item) => (
                    <motion.li
                      key={item.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12, height: 0, transition: { duration: 0.2 } }}
                      transition={{ duration: 0.25 }}
                      layout
                      className="flex flex-col gap-3 border-b border-ink-100 px-5 py-4 last:border-b-0 sm:grid sm:grid-cols-[1fr_auto_140px_140px_36px] sm:items-center sm:gap-3"
                    >
                      {/* Name */}
                      <div className="min-w-0">
                        <Link
                          href={`/products/${item.id}`}
                          className="line-clamp-1 text-[14px] font-medium text-ink-900 hover:text-brand-700"
                        >
                          {item.name}
                        </Link>
                        {item.variantLabel && <p className="mt-0.5 text-xs text-ink-500">{item.variantLabel}</p>}
                      </div>

                      {/* Unit price — updates live when qty hits a bulk threshold */}
                      <div className="text-right">
                        {(() => {
                          const breaks = pricingMap[item.id];
                          const unitPrice = effectivePrice(breaks, item.quantity, item.price);
                          const bulkBreak = activeBulkBreak(breaks, item.quantity);
                          const isDiscounted = bulkBreak !== null;
                          return (
                            <>
                              <div className="flex items-center justify-end gap-1.5">
                                {isDiscounted && (
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                    <Tag className="h-2.5 w-2.5" />
                                    -{bulkBreak!.discount_pct}%
                                  </span>
                                )}
                                <span className={`font-data text-[13px] font-semibold ${
                                  isDiscounted ? 'text-emerald-700' : 'text-ink-700'
                                }`}>
                                  ${unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              {isDiscounted ? (
                                <p className="text-[10px] text-ink-400 line-through">
                                  ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                              ) : (
                                <p className="text-[10px] text-ink-400">per unit</p>
                              )}
                            </>
                          );
                        })()}
                      </div>

                      {/* Qty stepper */}
                      <div className="flex items-center gap-1 rounded-md border border-ink-200 p-0.5">
                        <button
                          onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="flex h-7 w-7 items-center justify-center rounded text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-ink-900">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                          aria-label="Increase quantity"
                          className="flex h-7 w-7 items-center justify-center rounded text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Target price input */}
                      <div className="flex items-center gap-1.5 rounded-md border border-ink-200 bg-white px-2.5 py-1.5 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
                        <span className="text-xs text-ink-400">$</span>
                        <input
                          id={`target-price-${item.id}`}
                          name={`target_price_${item.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Optional"
                          value={item.targetPrice ?? ''}
                          onChange={(e) => handleUpdateTargetPrice(item.id, e.target.value)}
                          aria-label={`Target price for ${item.name}`}
                          className="w-full min-w-0 bg-transparent text-[13px] font-medium text-ink-900 placeholder:text-ink-300 focus:outline-none"
                        />
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        aria-label={`Remove ${item.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>

            {/* ── Summary / submit panel ── */}
            <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-soft-xs lg:sticky lg:top-24">
              <h3 className="border-b border-ink-100 pb-3 font-display text-[15px] font-semibold text-ink-900">
                Quote Summary
              </h3>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">
                Final pricing is determined on a quote-by-quote basis. You may propose a target unit price per item
                above — the admin will review and counter-quote if needed.
              </p>

              <div className="mt-5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-ink-500">Organization</span>
                  <strong className="max-w-[60%] truncate text-right font-medium text-ink-900">{orgName}</strong>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-ink-500">Total Items</span>
                  <strong className="font-medium text-ink-900">{totalItems}</strong>
                </div>
                <div className="flex items-center justify-between border-t border-ink-100 pt-2 text-[13px]">
                  <span className="text-ink-500">Est. Value (with discounts)</span>
                  <strong className="font-data font-semibold text-emerald-700">
                    ${cartItems.reduce((acc: number, i: CartItem) => {
                      const unitPrice = effectivePrice(pricingMap[i.id], i.quantity, i.price);
                      return acc + unitPrice * i.quantity;
                    }, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              {/* Buyer notes */}
              <div className="mt-5">
                <label
                  htmlFor="buyer-notes"
                  className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400"
                >
                  <MessageSquare className="h-3 w-3" />
                  Procurement Notes <span className="font-normal normal-case text-ink-300">(optional)</span>
                </label>
                <textarea
                  id="buyer-notes"
                  name="buyer_notes"
                  rows={3}
                  placeholder="E.g. Required by Aug 15 · requesting 10% volume discount for quarterly contract..."
                  value={buyerNotes}
                  onChange={(e) => setBuyerNotes(e.target.value)}
                  className="w-full resize-none rounded-lg border border-ink-200 bg-ink-50/40 px-3 py-2.5 text-[13px] text-ink-900 placeholder:text-ink-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>

              <Button onClick={handleSubmitRFQ} disabled={submitting} variant="brand" size="lg" className="mt-6 w-full">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {CART_LABELS.submitting}
                  </>
                ) : (
                  <>
                    {CART_LABELS.submitButton}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Container>
    </div>

    {/* Verification gating modal — shown when unverified company tries to submit */}
    <Dialog open={showUnverifiedModal} onOpenChange={(open) => !open && setShowUnverifiedModal(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Account Verification Required</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-sm leading-relaxed text-ink-600">
            Your company is currently <strong className="text-amber-700">unverified</strong>. You cannot submit a quote until an administrator verifies your account. Please wait for verification — you&apos;ll be notified once your company is approved.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="brand" onClick={() => setShowUnverifiedModal(false)} className="w-full">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
}
