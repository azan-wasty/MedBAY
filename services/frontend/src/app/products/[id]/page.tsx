'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import {
  ArrowLeft,
  ShieldCheck,
  Building2,
  Minus,
  Plus,
  CheckCircle2,
  Star,
  Trash2,
  ImageOff,
  PackageSearch,
} from 'lucide-react';

import { PRODUCT_DETAILS_LABELS, CATALOG_LABELS, CART_LABELS, STOCK_STATUS_MAP } from '@/lib/constants';
import type { Product, ProductPricing, AttributeLine, ProductVariant, ProductReview } from '@/lib/odooClient';
import { getProductImageSrc } from '@/lib/image';
import { cn } from '@/lib/utils';
import { Container } from '@/components/shared/Container';
import { Button } from '@/components/ui/button';
import { StatusBadge, Badge } from '@/components/ui/badge';
import { Stars } from '@/components/ui/stars';
import { Skeleton } from '@/components/ui/skeleton';

const EASE_OUT = [0.4, 0, 0.2, 1] as [number, number, number, number];

const toastVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: EASE_OUT } },
  exit: { opacity: 0, y: 8, scale: 0.95, transition: { duration: 0.18 } },
};

function DetailSkeleton() {
  return (
    <Container className="py-10">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="mt-2 h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
              <Skeleton className="h-3.5 w-4/6" />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="mt-4 h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </Container>
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
  const [selectedValues, setSelectedValues] = useState<Record<number, number>>({});
  const [reviews, setReviews] = useState<ProductReview[]>([]);

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

    const fetchReviews = async () => {
      try {
        const res = await fetch(`/api/products/${productId}/reviews`);
        if (res.ok) {
          const data = await res.json();
          setReviews(data);
        }
      } catch (err) {
        console.error('Error fetching product reviews:', err);
      }
    };

    fetchDetail();
    fetchPricing();
    fetchReviews();
  }, [productId]);

  // Resolves the currently-selected attribute chips down to the specific
  // product.product variant record that combination maps to (if any).
  const selectedVariant: ProductVariant | null = useMemo(() => {
    if (!product) return null;
    if (!product.variants || product.variants.length === 0) return null;

    if (!product.attribute_lines || product.attribute_lines.length === 0) {
      return product.variants[0];
    }

    const requiredAttributeIds = product.attribute_lines.map((l) => l.attribute_id);
    const allSelected = requiredAttributeIds.every((attrId) => selectedValues[attrId] !== undefined);
    if (!allSelected) return null;

    return (
      product.variants.find((variant) => {
        if (variant.combination.length !== requiredAttributeIds.length) return false;
        return variant.combination.every((c) => selectedValues[c.attribute_id] === c.value_id);
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

  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone, and you cannot submit another review for this order.')) return;
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete review');
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (err) {
      console.error(err);
      alert('Unable to delete review.');
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

    const variantLabel = selectedVariant ? selectedVariant.combination.map((c) => c.value_name).join(', ') : undefined;

    const storedCart = localStorage.getItem('med_cart');
    let cart: { id: number; name: string; quantity: number; price: number; variantId?: number; variantLabel?: string }[] = [];

    if (storedCart) {
      try {
        cart = JSON.parse(storedCart);
      } catch {
        cart = [];
      }
    }

    const existingItem = cart.find((item) => item.id === product.id && item.variantId === selectedVariant?.id);
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
    window.dispatchEvent(new Event('cart-updated'));

    setToastMessage(`${product.name} ${CATALOG_LABELS.addedToCart}!`);
    setTimeout(() => {
      setToastMessage('');
      router.push('/cart');
    }, 1500);
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!product) {
    return (
      <Container className="flex flex-col items-center gap-4 py-24 text-center">
        <PackageSearch className="h-10 w-10 text-ink-300" />
        <h2 className="font-display text-xl font-semibold text-ink-900">Product Not Found</h2>
        <Button asChild variant="brand">
          <Link href="/">{PRODUCT_DETAILS_LABELS.backToCatalog}</Link>
        </Button>
      </Container>
    );
  }

  const categoryName = Array.isArray(product.categ_id) ? product.categ_id[1] : product.categ_id;
  const imageSrc = getProductImageSrc(product.image_1920);
  const displayPrice = selectedVariant?.price ?? product.list_price;
  const isAddDisabled = !!product.attribute_lines?.length && (!selectedVariant || selectedVariant.qty_available <= 0);
  const avgRating = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  const specs = [
    { label: CATALOG_LABELS.certificationLabel, value: product.certification_info || PRODUCT_DETAILS_LABELS.certificationBadge },
    { label: CATALOG_LABELS.warrantyLabel, value: product.warranty_period || '1 Year Standard' },
    { label: CATALOG_LABELS.moqLabel, value: `${product.min_order_qty} ${product.unit_of_measure || 'Units'}` },
    { label: CATALOG_LABELS.uomLabel, value: product.unit_of_measure || 'Unit' },
  ];

  return (
    <div className="py-8 sm:py-10">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            variants={toastVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="status"
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-800 shadow-soft-lg"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <Container>
        <Link
          href="/"
          className="group mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-brand-700"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          {PRODUCT_DETAILS_LABELS.backToCatalog}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px] lg:items-start"
        >
          {/* Main column */}
          <div className="min-w-0">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div className="aspect-[4/3] overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
                {imageSrc ? (
                  <img src={imageSrc} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-ink-300">
                    <ImageOff className="h-10 w-10" strokeWidth={1.4} />
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-center">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{categoryName || 'Medical Device'}</Badge>
                  {product.stock_status && product.stock_status !== 'not_tracked' && STOCK_STATUS_MAP[product.stock_status] && (
                    <StatusBadge config={STOCK_STATUS_MAP[product.stock_status]} />
                  )}
                  {product.has_vendor_company && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                      <ShieldCheck className="h-3 w-3" />
                      Verified
                    </span>
                  )}
                </div>

                <h1 className="font-display text-[1.65rem] font-semibold leading-tight tracking-tight text-ink-900 sm:text-3xl">
                  {product.name}
                </h1>

                {reviews.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <Stars rating={Math.round(avgRating)} />
                    <span className="text-xs text-ink-500">
                      {avgRating.toFixed(1)} ({reviews.length} review{reviews.length === 1 ? '' : 's'})
                    </span>
                  </div>
                )}

                {product.has_vendor_company && Array.isArray(product.vendor_id) && (
                  <p className="mt-3 flex items-center gap-1.5 text-[13.5px] text-ink-500">
                    <Building2 className="h-4 w-4 text-ink-400" />
                    Supplied by <strong className="font-medium text-ink-800">{product.vendor_id[1]}</strong>
                  </p>
                )}

                <div className="mt-4">
                  <h3 className="mb-1.5 text-[13px] font-semibold text-ink-900">Description</h3>
                  <p className="text-[14px] leading-relaxed text-ink-500">
                    {product.description_sale || 'No detailed description available.'}
                  </p>
                </div>

                {product.attribute_lines && product.attribute_lines.length > 0 && (
                  <div className="mt-5">
                    {product.attribute_lines.map((line) => (
                      <div key={line.attribute_id} className="mb-3.5">
                        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                          {line.attribute_name}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {line.values.map((value) => {
                            const isSelected = selectedValues[line.attribute_id] === value.id;
                            return line.display_type === 'color' && value.html_color ? (
                              <button
                                key={value.id}
                                type="button"
                                title={value.name}
                                onClick={() => handleSelectAttributeValue(line.attribute_id, value.id)}
                                className={cn(
                                  'h-7 w-7 rounded-full transition-shadow',
                                  isSelected ? 'ring-2 ring-brand-600 ring-offset-2' : 'ring-1 ring-inset ring-ink-200'
                                )}
                                style={{ backgroundColor: value.html_color as string }}
                              />
                            ) : (
                              <button
                                key={value.id}
                                type="button"
                                onClick={() => handleSelectAttributeValue(line.attribute_id, value.id)}
                                className={cn(
                                  'rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors',
                                  isSelected
                                    ? 'border-brand-600 bg-brand-600 text-white'
                                    : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300'
                                )}
                              >
                                {value.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {!selectedVariant ? (
                      <p className="mt-1 text-xs font-medium text-red-600">Select an option above to see availability and price.</p>
                    ) : selectedVariant.qty_available <= 0 ? (
                      <p className="mt-1 text-xs font-medium text-red-600">This combination is currently out of stock.</p>
                    ) : (
                      <p className="mt-1 text-xs text-ink-500">
                        {selectedVariant.qty_available} unit{selectedVariant.qty_available === 1 ? '' : 's'} available for this combination
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-10 border-t border-ink-100 pt-8">
              <h3 className="mb-4 text-[13px] font-semibold text-ink-900">{PRODUCT_DETAILS_LABELS.specTitle}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {specs.map((spec, i) => (
                  <motion.div
                    key={spec.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + i * 0.06, ease: EASE_OUT }}
                    className="rounded-lg border border-ink-100 bg-ink-50/50 p-4"
                  >
                    <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">
                      {spec.label}
                    </span>
                    <strong className="text-[13.5px] font-medium text-ink-900">{spec.value as string}</strong>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div className="mt-10 border-t border-ink-100 pt-8">
              <h3 className="mb-5 font-display text-lg font-semibold text-ink-900">Customer Reviews</h3>
              {reviews.length === 0 ? (
                <p className="text-sm text-ink-500">No reviews yet for this product.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="rounded-xl border border-ink-100 bg-white p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Stars rating={review.rating} size={15} />
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[13.5px] font-semibold text-ink-900">{review.reviewer_name}</span>
                            <span className="text-xs text-ink-400">{new Date(review.create_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {review.can_delete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(review.id)}
                            className="flex items-center gap-1 text-xs font-medium text-red-500 transition-colors hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        )}
                      </div>
                      {review.review_text && <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-600">{review.review_text}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-soft-sm lg:sticky lg:top-24">
            <h3 className="mb-5 font-display text-[15px] font-semibold text-ink-900">{PRODUCT_DETAILS_LABELS.orderTitle}</h3>

            <div className="mb-5 border-b border-ink-100 pb-5">
              <span className="text-[10.5px] font-medium uppercase tracking-wide text-ink-400">{CATALOG_LABELS.priceOnRequest}</span>
              <div className="mt-1 font-data text-[1.65rem] font-semibold text-ink-900">
                {displayPrice > 0 ? `$${displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'Contact Sales'}
              </div>

              {!pricingLoading && pricing && pricing.price_breaks.length > 1 && (
                <div className="mt-4">
                  <span className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">Bulk Pricing</span>
                  <table className="w-full text-[12.5px]">
                    <tbody>
                      {pricing.price_breaks.map((tier, idx) => (
                        <tr key={idx} className={idx === 0 ? '' : 'border-t border-ink-100'}>
                          <td className="py-1.5 text-ink-500">{tier.min_qty}+ units</td>
                          <td className="py-1.5 text-right font-medium text-ink-900">
                            ${tier.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            {tier.discount_pct > 0 && (
                              <span className="ml-1.5 text-[11px] font-semibold text-emerald-700">(-{tier.discount_pct}%)</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mb-5">
              <label className="mb-1.5 block text-[13px] font-medium text-ink-700">{CART_LABELS.itemTableHeadQty}</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleQuantityChange(quantity - 1)}
                  aria-label="Decrease quantity"
                  className="flex h-10 w-10 items-center justify-center rounded-md border border-ink-200 text-ink-600 transition-colors hover:bg-ink-50"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  className="h-10 w-full rounded-md border border-ink-200 text-center text-sm font-medium text-ink-900 focus-visible:outline-none focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600/15"
                />
                <button
                  onClick={() => handleQuantityChange(quantity + 1)}
                  aria-label="Increase quantity"
                  className="flex h-10 w-10 items-center justify-center rounded-md border border-ink-200 text-ink-600 transition-colors hover:bg-ink-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {errorMsg && <p className="mt-2 text-xs font-medium text-red-600">{errorMsg}</p>}
            </div>

            <Button onClick={handleAddToRFQ} disabled={isAddDisabled} variant="brand" size="lg" className="w-full">
              {PRODUCT_DETAILS_LABELS.addToCartButton}
            </Button>
          </div>
        </motion.div>
      </Container>
    </div>
  );
}
