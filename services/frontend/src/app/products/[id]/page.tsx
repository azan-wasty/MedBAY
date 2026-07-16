'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { COLOR_PALETTE, PRODUCT_DETAILS_LABELS, CATALOG_LABELS, CART_LABELS } from '../../../lib/constants';
import { Product } from '../../../lib/odooClient';

const EASE_OUT = [0.4, 0, 0.2, 1] as [number, number, number, number];

const toastVariants: Variants = {
  hidden:  { opacity: 0, y: 16, scale: 0.95 },
  visible: { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.22, ease: EASE_OUT } },
  exit:    { opacity: 0, y: 8,  scale: 0.95, transition: { duration: 0.18 } },
};

const getProductImageSrc = (imgField: string | boolean | undefined) => {
  if (!imgField) return null;
  if (typeof imgField === 'string') {
    let cleanImg = imgField.trim();
    if (cleanImg.startsWith("b'") && cleanImg.endsWith("'")) {
      cleanImg = cleanImg.slice(2, -1);
    }
    if (cleanImg.startsWith('http') || cleanImg.startsWith('data:')) {
      return cleanImg;
    }
    return `data:image/png;base64,${cleanImg}`;
  }
  return null;
};

function DetailSkeleton() {
  return (
    <div className="detail-layout" style={{ padding: '2rem 0' }}>
      <div className="detail-main">
        <div className="detail-grid">
          <div className="skeleton" style={{ height: '380px', borderRadius: 'var(--radius-md)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="skeleton skeleton-text" style={{ width: '30%' }} />
            <div className="skeleton skeleton-text" style={{ width: '75%', height: '1.75rem' }} />
            <div className="skeleton skeleton-text" style={{ width: '90%', height: '1rem', marginTop: '1rem' }} />
            <div className="skeleton skeleton-text" style={{ width: '85%', height: '1rem' }} />
            <div className="skeleton skeleton-text" style={{ width: '80%', height: '1rem' }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton-card">
              <div className="skeleton skeleton-text" style={{ width: '60%' }} />
              <div className="skeleton skeleton-text" style={{ width: '80%', height: '1rem', marginTop: '0.5rem' }} />
            </div>
          ))}
        </div>
      </div>
      <div className="detail-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="skeleton skeleton-text" style={{ width: '50%' }} />
        <div className="skeleton skeleton-text" style={{ width: '65%', height: '1.5rem' }} />
        <div className="skeleton" style={{ height: '2.5rem', marginTop: '1rem' }} />
        <div className="skeleton" style={{ height: '2.5rem' }} />
      </div>
    </div>
  );
}

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const productId = params.id;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [quantity, setQuantity] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/products/${productId}`);
        if (!res.ok) throw new Error('Product not found');
        const data = await res.json();
        setProduct(data);
        setQuantity(data.min_order_qty || 1);
      } catch (err) {
        console.error('Error fetching product details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [productId]);

  const handleQuantityChange = (val: number) => {
    if (!product) return;
    const cleanVal = Math.max(1, val);
    setQuantity(cleanVal);

    if (cleanVal < product.min_order_qty) {
      setErrorMsg(`${PRODUCT_DETAILS_LABELS.moqWarning} (${CATALOG_LABELS.moqLabel}: ${product.min_order_qty})`);
    } else {
      setErrorMsg('');
    }
  };

  const handleAddToRFQ = () => {
    if (!product) return;

    if (quantity < product.min_order_qty) {
      setErrorMsg(`${PRODUCT_DETAILS_LABELS.moqWarning} (${CATALOG_LABELS.moqLabel}: ${product.min_order_qty})`);
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
      existingItem.quantity = quantity;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        quantity: quantity,
        price: product.list_price,
      });
    }

    localStorage.setItem('med_cart', JSON.stringify(cart));
    
    // Dispatch event to sync navigation navbar count
    window.dispatchEvent(new Event('cart-updated'));

    setToastMessage(`${product.name} ${CATALOG_LABELS.addedToCart}!`);
    setTimeout(() => {
      setToastMessage('');
      router.push('/cart');
    }, 1500);
  };

  if (loading) {
    return (
      <div className="container">
        <DetailSkeleton />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container" style={{ padding: '4rem 2rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Product Not Found</h2>
        <Link href="/" className="btn btn-primary">{PRODUCT_DETAILS_LABELS.backToCatalog}</Link>
      </div>
    );
  }

  const categoryName = Array.isArray(product.categ_id) ? product.categ_id[1] : product.categ_id;

  return (
    <div className="container">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            className="alert alert-success toast"
            variants={toastVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back Link */}
      <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
        <Link 
          href="/" 
          className="back-link" 
          style={{ 
            color: COLOR_PALETTE.primary, 
            fontWeight: 500, 
            fontSize: '0.875rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >
          <span className="arrow" style={{ transition: 'transform 0.2s var(--ease-out)', display: 'inline-block' }}>&larr;</span>
          <span>{PRODUCT_DETAILS_LABELS.backToCatalog}</span>
        </Link>
      </div>

      <motion.div
        className="detail-layout"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Main Details Panel */}
        <div className="detail-main">
          <div className="detail-grid">
            <div className="detail-image-section">
              {getProductImageSrc(product.image_1920) ? (
                <img
                  src={getProductImageSrc(product.image_1920) as string}
                  alt={product.name}
                  className="detail-product-image"
                />
              ) : (
                <div className="detail-image-placeholder">
                  <svg className="placeholder-icon-large" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" />
                    <path d="M12 8v8M8 12h8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>

            <div className="detail-info-section" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span className="badge" style={{ alignSelf: 'flex-start', backgroundColor: 'var(--bg-body)', color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.75rem', border: '1px solid var(--border-light)' }}>
                {categoryName || "Medical Device"}
              </span>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '1.25rem', letterSpacing: '-0.02em', lineHeight: 1.25 }}>{product.name}</h1>
              
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: COLOR_PALETTE.textDark }}>Description</h3>
                <p style={{ color: COLOR_PALETTE.textSecondary, fontSize: '0.925rem', lineHeight: '1.6' }}>
                  {product.description_sale || "No detailed description available."}
                </p>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: COLOR_PALETTE.textDark }}>
              {PRODUCT_DETAILS_LABELS.specTitle}
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {[
                { label: CATALOG_LABELS.certificationLabel, value: product.certification_info || PRODUCT_DETAILS_LABELS.certificationBadge },
                { label: CATALOG_LABELS.warrantyLabel, value: product.warranty_period || "1 Year Standard" },
                { label: CATALOG_LABELS.moqLabel, value: `${product.min_order_qty} ${product.unit_of_measure || "Units"}` },
                { label: CATALOG_LABELS.uomLabel, value: product.unit_of_measure || "Unit" },
              ].map((spec, i) => (
                <motion.div
                  key={spec.label}
                  className="spec-card"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + i * 0.06, ease: [0.4, 0, 0.2, 1] }}
                >
                  <span style={{ fontSize: '0.7rem', color: COLOR_PALETTE.textSecondary, textTransform: 'uppercase', display: 'block', fontWeight: 500, marginBottom: '0.25rem' }}>
                    {spec.label}
                  </span>
                  <strong style={{ fontSize: '0.9rem', color: COLOR_PALETTE.textDark, fontWeight: 500 }}>
                    {spec.value as string}
                  </strong>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Order Configuration */}
        <div className="detail-sidebar">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem' }}>
            {PRODUCT_DETAILS_LABELS.orderTitle}
          </h3>

          <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
            <span className="product-price-label">{CATALOG_LABELS.priceOnRequest}</span>
            <div className="product-price" style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>
              {product.list_price > 0 
                ? `$${product.list_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}` 
                : "Contact Sales"}
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">{CART_LABELS.itemTableHeadQty}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => handleQuantityChange(quantity - 1)}
                className="btn btn-outline"
                style={{ padding: '0.5rem 1rem', fontSize: '1.1rem' }}
              >
                -
              </button>
              <input
                type="number"
                className="form-input"
                style={{ textAlign: 'center', fontSize: '1rem', fontWeight: 500, width: '80px', padding: '0.5rem' }}
                value={quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
              />
              <button
                onClick={() => handleQuantityChange(quantity + 1)}
                className="btn btn-outline"
                style={{ padding: '0.5rem 1rem', fontSize: '1.1rem' }}
              >
                +
              </button>
            </div>
            {errorMsg && (
              <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: 500 }}>
                {errorMsg}
              </p>
            )}
          </div>

          <motion.button
            onClick={handleAddToRFQ}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem' }}
            whileTap={{ scale: 0.97 }}
          >
            {PRODUCT_DETAILS_LABELS.addToCartButton}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}


