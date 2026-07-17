'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { COLOR_PALETTE, PRODUCT_DETAILS_LABELS, CATALOG_LABELS, CART_LABELS, STOCK_STATUS_MAP } from '../../../lib/constants';
import { Product, ProductPricing, AttributeLine, ProductVariant } from '../../../lib/odooClient';

const EASE_OUT = [0.4, 0, 0.2, 1] as [number, number, number, number];

const toastVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: EASE_OUT } },
  exit: { opacity: 0, y: 8, scale: 0.95, transition: { duration: 0.18 } },
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
          {[1, 2, 3, 4].map(i => (
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
  const [pricing, setPricing] = useState<ProductPricing | null>(null);
  const [pricingLoading, setPricingLoading] = useState<boolean>(true);
  // Maps attribute_id -> chosen value_id for each variant attribute (Color, Size, ...)
  const [selectedValues, setSelectedValues] = useState<Record<number, number>>({});

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/products/${productId}`);
        if (!res.ok) throw new Error('Product not found');
        const data = await res.json();
        setProduct(data);
        setQuantity(data.min_order_qty || 1);

        if (Array.isArray(data.attribute_lines) && data.attribute_lines.length > 0) {
          const defaults: Record<number, number> = {};
          data.attribute_lines.forEach((line: AttributeLine) => {
            if (line.values.length > 0) {
              defaults[line.attribute_id] = line.values[0].id;
            }
          });
          setSelectedValues(defaults);
        }
      } catch (err) {
        console.error('Error fetching product details:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchPricing = async () => {
      try {
        setPricingLoading(true);
        const res = await fetch(`/api/products/${productId}/pricing`);
        if (!res.ok) throw new Error('Pricing unavailable');
        const data = await res.json();
        setPricing(data);
      } catch (err) {
        console.error('Error fetching product pricing:', err);
      } finally {
        setPricingLoading(false);
      }
    };

    fetchDetail();
    fetchPricing();
  }, [productId]);

  // Resolves the currently-selected attribute chips down to the specific
  // product.product variant record that combination maps to (if any).
  const selectedVariant: ProductVariant | null = useMemo(() => {
    if (!product) return null;
    if (!product.variants || product.variants.length === 0) return null;

    // Products with no attribute_lines at all still have exactly one
    // implicit variant in Odoo — just use it directly.
    if (!product.attribute_lines || product.attribute_lines.length === 0) {
      return product.variants[0];
    }

    const requiredAttributeIds = product.attribute_lines.map((l) => l.attribute_id);
    const allSelected = requiredAttributeIds.every((attrId) => selectedValues[attrId] !== undefined);
    if (!allSelected) return null;

    return (
      product.variants.find((variant) => {
        if (variant.combination.length !== requiredAttributeIds.length) return false;
        return variant.combination.every(
          (c) => selectedValues[c.attribute_id] === c.value_id
        );
      }) || null
    );
  }, [product, selectedValues]);

  const handleSelectAttributeValue = (attributeId: number, valueId: number) => {
    setSelectedValues((prev) => ({ ...prev, [attributeId]: valueId }));
  };

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

    if (product.attribute_lines && product.attribute_lines.length > 0 && !selectedVariant) {
      setErrorMsg('Please select an option for every attribute before adding to your RFQ.');
      return;
    }

    const variantLabel = selectedVariant
      ? selectedVariant.combination.map((c) => c.value_name).join(', ')
      : undefined;

    const storedCart = localStorage.getItem('med_cart');
    let cart: { id: number; name: string; quantity: number; price: number; variantId?: number; variantLabel?: string }[] = [];

    if (storedCart) {
      try {
        cart = JSON.parse(storedCart);
      } catch {
        cart = [];
      }
    }

    // Two cart entries for the same template but different variants (e.g.
    // Blue vs. Black) must stay distinct lines, not merge into one.
    const existingItem = cart.find(
      (item) => item.id === product.id && item.variantId === selectedVariant?.id
    );
    if (existingItem) {
      existingItem.quantity = quantity;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        quantity: quantity,
        price: selectedVariant?.price ?? product.list_price,
        variantId: selectedVariant?.id,
        variantLabel,
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <span className="badge" style={{ backgroundColor: 'var(--bg-body)', color: 'var(--text-secondary)', fontSize: '0.75rem', border: '1px solid var(--border-light)' }}>
                  {categoryName || "Medical Device"}
                </span>
                {product.stock_status && product.stock_status !== 'not_tracked' && (
                  <span
                    className="badge"
                    style={{
                      backgroundColor: STOCK_STATUS_MAP[product.stock_status]?.bg,
                      color: STOCK_STATUS_MAP[product.stock_status]?.text,
                      fontSize: '0.75rem',
                    }}
                  >
                    {STOCK_STATUS_MAP[product.stock_status]?.label}
                  </span>
                )}
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '0.5rem', letterSpacing: '-0.02em', lineHeight: 1.25 }}>{product.name}</h1>

              {Array.isArray(product.vendor_id) && (
                <p style={{ color: COLOR_PALETTE.textSecondary, fontSize: '0.85rem', marginBottom: '1rem' }}>
                  Supplied by <strong style={{ color: COLOR_PALETTE.textDark }}>{product.vendor_id[1]}</strong>
                </p>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: COLOR_PALETTE.textDark }}>Description</h3>
                <p style={{ color: COLOR_PALETTE.textSecondary, fontSize: '0.925rem', lineHeight: '1.6' }}>
                  {product.description_sale || "No detailed description available."}
                </p>
              </div>

              {product.attribute_lines && product.attribute_lines.length > 0 && (
                <div>
                  {product.attribute_lines.map((line) => (
                    <div key={line.attribute_id} style={{ marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', color: COLOR_PALETTE.textSecondary, textTransform: 'uppercase', display: 'block', fontWeight: 500, marginBottom: '0.4rem' }}>
                        {line.attribute_name}
                      </span>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {line.values.map((value) => {
                          const isSelected = selectedValues[line.attribute_id] === value.id;
                          return line.display_type === 'color' && value.html_color ? (
                            <button
                              key={value.id}
                              type="button"
                              title={value.name}
                              onClick={() => handleSelectAttributeValue(line.attribute_id, value.id)}
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                backgroundColor: value.html_color,
                                border: isSelected ? `2px solid ${COLOR_PALETTE.primary}` : '1px solid var(--border-light)',
                                boxShadow: isSelected ? '0 0 0 2px var(--bg-white), 0 0 0 3px ' + COLOR_PALETTE.primary : 'none',
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            />
                          ) : (
                            <button
                              key={value.id}
                              type="button"
                              onClick={() => handleSelectAttributeValue(line.attribute_id, value.id)}
                              className="badge"
                              style={{
                                backgroundColor: isSelected ? COLOR_PALETTE.primary : 'var(--bg-body)',
                                color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                                border: isSelected ? `1px solid ${COLOR_PALETTE.primary}` : '1px solid var(--border-light)',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontWeight: isSelected ? 600 : 400,
                              }}
                            >
                              {value.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {!selectedVariant ? (
                    <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>
                      Select an option above to see availability and price.
                    </p>
                  ) : selectedVariant.qty_available <= 0 ? (
                    <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>
                      This combination is currently out of stock.
                    </p>
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: COLOR_PALETTE.textSecondary, marginTop: '0.25rem' }}>
                      {selectedVariant.qty_available} unit{selectedVariant.qty_available === 1 ? '' : 's'} available for this combination
                    </p>
                  )}
                </div>
              )}
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
              {(selectedVariant?.price ?? product.list_price) > 0
                ? `$${(selectedVariant?.price ?? product.list_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                : "Contact Sales"}
            </div>

            {!pricingLoading && pricing && pricing.price_breaks.length > 1 && (
              <div style={{ marginTop: '1rem' }}>
                <span style={{ fontSize: '0.7rem', color: COLOR_PALETTE.textSecondary, textTransform: 'uppercase', display: 'block', fontWeight: 500, marginBottom: '0.4rem' }}>
                  Bulk Pricing
                </span>
                <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                  <tbody>
                    {pricing.price_breaks.map((tier, idx) => (
                      <tr key={idx} style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--border-light)' }}>
                        <td style={{ padding: '0.3rem 0', color: COLOR_PALETTE.textSecondary }}>
                          {tier.min_qty}+ units
                        </td>
                        <td style={{ padding: '0.3rem 0', textAlign: 'right', fontWeight: 500 }}>
                          ${tier.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          {tier.discount_pct > 0 && (
                            <span style={{ color: '#065f46', marginLeft: '0.4rem', fontSize: '0.7rem' }}>
                              (-{tier.discount_pct}%)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
            disabled={
              !!product.attribute_lines?.length &&
              (!selectedVariant || selectedVariant.qty_available <= 0)
            }
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