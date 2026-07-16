'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { BRAND_CONFIG, COLOR_PALETTE, CATALOG_LABELS, MOCK_PRODUCTS } from '../lib/constants';
import { Product } from '../lib/odooClient';
import HeroSection from '../components/HeroSection';

// Animation variants
const EASE_OUT = [0.4, 0, 0.2, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.06, ease: EASE_OUT },
  }),
};

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

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-text" style={{ width: '45%' }} />
      <div className="skeleton skeleton-text" style={{ width: '80%', height: '1rem' }} />
      <div className="skeleton skeleton-text" style={{ width: '65%' }} />
      <div className="skeleton" style={{ height: '1.5rem', width: '40%', marginTop: '0.25rem' }} />
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <div className="skeleton" style={{ height: '2rem', flex: 1 }} />
        <div className="skeleton" style={{ height: '2rem', flex: 1 }} />
      </div>
    </div>
  );
}

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Fetch products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error('Failed to load products');
        const data = await res.json();
        setProducts(data);
        
        // Extract unique categories dynamically from products data
        const uniqueCategories = new Set<string>();
        data.forEach((p: Product) => {
          if (Array.isArray(p.categ_id) && p.categ_id[1]) {
            uniqueCategories.add(p.categ_id[1]);
          } else if (typeof p.categ_id === 'string') {
            uniqueCategories.add(p.categ_id);
          }
        });
        setCategories(Array.from(uniqueCategories));
      } catch (err) {
        console.error('Error fetching catalog data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Filter products based on search term and selected category
  useEffect(() => {
    let result = products;

    if (selectedCategory) {
      result = result.filter((p) => {
        const catName = Array.isArray(p.categ_id) ? p.categ_id[1] : p.categ_id;
        return catName === selectedCategory;
      });
    }

    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.description_sale && p.description_sale.toLowerCase().includes(query))
      );
    }

    setFilteredProducts(result);
  }, [products, selectedCategory, searchTerm]);

  // Add item to RFQ Cart
  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    
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
    
    // Dispatch storage sync events
    window.dispatchEvent(new Event('cart-updated'));

    // Show toast message
    setToastMessage(`${product.name} ${CATALOG_LABELS.addedToCart}!`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  return (
    <div className="main-wrapper">
      {/* Hero Section */}
      <HeroSection />

      <div className="container">
        <div className="catalog-layout">
          {/* Sidebar Filters */}
          <aside className="filter-sidebar">
            <h3 className="filter-title">Categories</h3>
            <ul className="category-list">
              <li>
                <motion.button
                  onClick={() => setSelectedCategory('')}
                  className={`category-btn ${!selectedCategory ? 'active' : ''}`}
                  whileTap={{ scale: 0.97 }}
                  style={{ position: 'relative' }}
                >
                  <span style={{ position: 'relative', zIndex: 2 }}>{CATALOG_LABELS.filterAll}</span>
                  {!selectedCategory && (
                    <motion.div
                      layoutId="activeCategoryBg"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'var(--primary-light)',
                        borderLeft: '3px solid var(--primary)',
                        borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                        zIndex: 1
                      }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </motion.button>
              </li>
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <li key={cat}>
                    <motion.button
                      onClick={() => setSelectedCategory(cat)}
                      className={`category-btn ${isActive ? 'active' : ''}`}
                      whileTap={{ scale: 0.97 }}
                      style={{ position: 'relative' }}
                    >
                      <span style={{ position: 'relative', zIndex: 2 }}>{cat}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeCategoryBg"
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'var(--primary-light)',
                            borderLeft: '3px solid var(--primary)',
                            borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                            zIndex: 1
                          }}
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                    </motion.button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Main Catalog View */}
          <div className="catalog-content">
            {/* Search Input */}
            <div className="search-container">
              <span className="search-icon">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </span>
              <input
                type="text"
                placeholder={CATALOG_LABELS.searchPlaceholder}
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {toastMessage}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Products Grid */}
            {loading ? (
              <div className="product-grid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <motion.div
                style={{ padding: '2rem 0', color: 'var(--text-muted)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {CATALOG_LABELS.noProducts}
              </motion.div>
            ) : (
              <div className="product-grid">
                {filteredProducts.map((product, i) => {
                  const categoryName = Array.isArray(product.categ_id) ? product.categ_id[1] : product.categ_id;
                  
                  return (
                    <motion.div
                      key={product.id}
                      className="product-card"
                      custom={i % 4} /* Reset stagger delay count per row for a more natural load feel */
                      variants={fadeUp}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true, margin: "-40px" }}
                      whileHover={{ y: -5 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    >
                      <Link href={`/products/${product.id}`} className="product-card-image-container">
                        {getProductImageSrc(product.image_256) ? (
                          <img
                            src={getProductImageSrc(product.image_256) as string}
                            alt={product.name}
                            className="product-card-image"
                            loading="lazy"
                          />
                        ) : (
                          <div className="product-card-placeholder">
                            <svg className="placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" />
                              <path d="M12 8v8M8 12h8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                      </Link>
                      <span className="product-tag">{categoryName || "Equipment"}</span>
                      <h3 className="product-title">
                        <Link href={`/products/${product.id}`} style={{ color: 'inherit' }}>
                          {product.name}
                        </Link>
                      </h3>
                      <p className="product-desc" style={{ WebkitBoxOrient: 'vertical' }}>{product.description_sale || "No description provided."}</p>
                      
                      <div className="product-price-box">
                        <span className="product-price-label">{CATALOG_LABELS.priceOnRequest}</span>
                        <div className="product-price">
                          {product.list_price > 0 
                            ? `$${product.list_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : "Contact Sales"}
                        </div>
                      </div>

                      <div className="product-meta-row">
                        <span>{CATALOG_LABELS.moqLabel}: <strong>{product.min_order_qty}</strong></span>
                        <span>{CATALOG_LABELS.warrantyLabel}: <strong>{product.warranty_period || "N/A"}</strong></span>
                      </div>

                      <div className="product-actions">
                        <Link href={`/products/${product.id}`} className="btn btn-outline">
                          {CATALOG_LABELS.viewDetails}
                        </Link>
                        <button
                          onClick={(e) => handleAddToCart(product, e)}
                          className="btn btn-primary"
                        >
                          {CATALOG_LABELS.addToCart}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

