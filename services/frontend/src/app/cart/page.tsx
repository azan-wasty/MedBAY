'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { COLOR_PALETTE, CART_LABELS, AUTH_LABELS, BRAND_CONFIG } from '../../lib/constants';

interface CartItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  variantId?: number;
  variantLabel?: string;
}

const alertVariants: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.15 } },
};

const successVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, type: 'spring' as const, stiffness: 300, damping: 20 } },
};

export default function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [submittedRfq, setSubmittedRfq] = useState<{ id?: number; name?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    // Load auth status
    const storedUser = localStorage.getItem('med_user');
    setIsLoggedIn(!!storedUser);

    // Load cart items
    const loadCart = () => {
      const storedCart = localStorage.getItem('med_cart');
      if (storedCart) {
        try {
          setCartItems(JSON.parse(storedCart));
        } catch {
          setCartItems([]);
        }
      }
    };

    loadCart();
  }, []);

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
      setErrorMsg(AUTH_LABELS.unauthorizedMsg);
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const items = cartItems.map((item) => ({
        product_id: item.id,
        ...(item.variantId ? { variant_id: item.variantId } : {}),
        quantity: item.quantity,
      }));

      const res = await fetch('/api/rfq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      const data = await res.json();

      if (res.status === 401) {
        setIsLoggedIn(false);
        localStorage.removeItem('med_user');
        window.dispatchEvent(new Event('auth-updated'));
        throw new Error(AUTH_LABELS.unauthorizedMsg);
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to submit Request for Quote');
      }

      // Success
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
      <div className="container" style={{ maxWidth: '500px', padding: '4rem 1rem' }}>
        <motion.div
          className="section-card"
          variants={successVariants}
          initial="hidden"
          animate="visible"
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: COLOR_PALETTE.textDark }}>
            {CART_LABELS.successTitle}
          </h2>
          <p style={{ color: COLOR_PALETTE.textSecondary, fontSize: '0.875rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
            {CART_LABELS.successSubtitle}
          </p>

          {submittedRfq && (
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-body)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: COLOR_PALETTE.textSecondary, fontWeight: 500 }}>Reference ID</span>
              <strong style={{ color: COLOR_PALETTE.textDark, fontSize: '1rem' }}>{submittedRfq.name}</strong>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link href="/dashboard" className="btn btn-primary" style={{ flex: 1 }}>
              View Status
            </Link>
            <Link href="/" className="btn btn-outline" style={{ flex: 1 }}>
              Back to Catalog
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem 2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
        {CART_LABELS.title}
      </h1>
      <p style={{ color: COLOR_PALETTE.textSecondary, fontSize: '0.875rem', marginBottom: '2rem' }}>
        {CART_LABELS.subtitle}
      </p>

      <AnimatePresence>
        {errorMsg && (
          <motion.div
            className="alert alert-error"
            variants={alertVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div>
              {errorMsg}
              {!isLoggedIn && (
                <div style={{ marginTop: '0.25rem' }}>
                  <Link href="/login" style={{ textDecoration: 'underline', fontWeight: 500, color: 'inherit' }}>
                    Sign in now
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {cartItems.length === 0 ? (
        <motion.div
          style={{ padding: '4rem 2rem', backgroundColor: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <p style={{ color: COLOR_PALETTE.textSecondary, fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            {CART_LABELS.emptyCart}
          </p>
          <Link href="/" className="btn btn-outline">
            Browse Catalog
          </Link>
        </motion.div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
          {/* Cart Table */}
          <div>
            <div className="cart-header-actions">
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: COLOR_PALETTE.textSecondary }}>
                {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
              </span>
              <button onClick={handleClearCart} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                {CART_LABELS.clearCart}
              </button>
            </div>

            <div className="table-container">
              <table className="responsive-table">
                <thead>
                  <tr>
                    <th>{CART_LABELS.itemTableHeadProduct}</th>
                    <th>{CART_LABELS.itemTableHeadQty}</th>
                    <th>{CART_LABELS.itemTableHeadActions}</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {cartItems.map((item) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12, transition: { duration: 0.2 } }}
                        transition={{ duration: 0.25 }}
                        layout
                      >
                        <td style={{ fontWeight: 500 }}>
                          <Link href={`/products/${item.id}`} style={{ color: COLOR_PALETTE.textDark }}>
                            {item.name}
                          </Link>
                          {item.variantLabel && (
                            <div style={{ fontSize: '0.75rem', fontWeight: 400, color: COLOR_PALETTE.textSecondary, marginTop: '0.15rem' }}>
                              {item.variantLabel}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <motion.button
                              onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                              className="btn btn-outline"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                              whileTap={{ scale: 0.88 }}
                            >
                              -
                            </motion.button>
                            <span style={{ fontWeight: 500, width: '32px', textAlign: 'center', fontSize: '0.875rem' }}>
                              {item.quantity}
                            </span>
                            <motion.button
                              onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                              className="btn btn-outline"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                              whileTap={{ scale: 0.88 }}
                            >
                              +
                            </motion.button>
                          </div>
                        </td>
                        <td>
                          <motion.button
                            onClick={() => handleRemoveItem(item.id)}
                            className="btn btn-danger-outline"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            whileTap={{ scale: 0.92 }}
                          >
                            Remove
                          </motion.button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>

          {/* Submission Summary Panel */}
          <div className="section-card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
              Quote Summary
            </h3>

            <p style={{ color: COLOR_PALETTE.textSecondary, fontSize: '0.75rem', lineHeight: '1.5', marginBottom: '1.25rem' }}>
              Final pricing is determined on a quote-by-quote basis depending on quantities and your organization's profile.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.825rem' }}>
                <span style={{ color: COLOR_PALETTE.textSecondary }}>Organization</span>
                <strong style={{ color: COLOR_PALETTE.textDark }}>
                  {isLoggedIn ? JSON.parse(localStorage.getItem('med_user') || '{}').name : 'Not Signed In'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem' }}>
                <span style={{ color: COLOR_PALETTE.textSecondary }}>Total Items</span>
                <strong>{cartItems.reduce((acc, curr) => acc + curr.quantity, 0)}</strong>
              </div>
            </div>

            <motion.button
              onClick={handleSubmitRFQ}
              disabled={submitting}
              className="btn btn-primary"
              style={{ width: '100%', gap: '0.5rem' }}
              whileTap={!submitting ? { scale: 0.97 } : {}}
            >
              {submitting && <span className="spinner" />}
              {submitting ? CART_LABELS.submitting : CART_LABELS.submitButton}
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}