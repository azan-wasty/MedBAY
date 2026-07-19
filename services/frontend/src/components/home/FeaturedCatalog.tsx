"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CheckCircle2, LayoutGrid } from "lucide-react";

import { CATALOG_LABELS } from "@/lib/constants";
import type { Product } from "@/lib/odooClient";
import { cn } from "@/lib/utils";
import { Container } from "@/components/shared/Container";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { ProductCard, ProductCardSkeleton } from "@/components/products/ProductCard";

export default function FeaturedCatalog() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = React.useState<Product[]>([]);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = React.useState<string>("");
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(true);
  const [toastMessage, setToastMessage] = React.useState<string>("");

  // Fetch products on mount — identical to the original implementation.
  React.useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("Failed to load products");
        const data = await res.json();
        setProducts(data);

        const uniqueCategories = new Set<string>();
        data.forEach((p: Product) => {
          if (Array.isArray(p.categ_id) && p.categ_id[1]) {
            uniqueCategories.add(p.categ_id[1]);
          } else if (typeof p.categ_id === "string") {
            uniqueCategories.add(p.categ_id);
          }
        });
        setCategories(Array.from(uniqueCategories));
      } catch (err) {
        console.error("Error fetching catalog data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Let the homepage's Categories showcase drive this section's filter.
  React.useEffect(() => {
    const onSetCategory = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string") setSelectedCategory(detail);
    };
    window.addEventListener("catalog:set-category", onSetCategory);
    return () => window.removeEventListener("catalog:set-category", onSetCategory);
  }, []);

  // Filter products based on search term and selected category — identical to the original.
  React.useEffect(() => {
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
        (p) => p.name.toLowerCase().includes(query) || (p.description_sale && p.description_sale.toLowerCase().includes(query))
      );
    }

    setFilteredProducts(result);
  }, [products, selectedCategory, searchTerm]);

  // Add item to RFQ Cart — identical to the original.
  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();

    if (product.attribute_line_ids && product.attribute_line_ids.length > 0) {
      window.location.href = `/products/${product.id}`;
      return;
    }

    const storedCart = localStorage.getItem("med_cart");
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

    localStorage.setItem("med_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));

    setToastMessage(`${product.name} ${CATALOG_LABELS.addedToCart}!`);
    setTimeout(() => setToastMessage(""), 3000);
  };

  return (
    <section id="catalog" className="scroll-mt-20 bg-ink-50/40 py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Live Catalog"
          title="Featured equipment, sourced with confidence."
          subtitle="Search and filter verified medical equipment from our supplier network — every listing shows real-time availability, compliance, and bulk pricing."
        />

        <div className="mt-12 flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* Category filter — horizontal chips on mobile, sidebar on desktop */}
          <aside className="lg:w-60 lg:shrink-0">
            <h3 className="mb-3 hidden text-[11px] font-semibold uppercase tracking-wide text-ink-400 lg:block">
              Categories
            </h3>
            <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">
              <CategoryButton active={!selectedCategory} onClick={() => setSelectedCategory("")}>
                {CATALOG_LABELS.filterAll}
              </CategoryButton>
              {categories.map((cat) => (
                <CategoryButton key={cat} active={selectedCategory === cat} onClick={() => setSelectedCategory(cat)}>
                  {cat}
                </CategoryButton>
              ))}
            </div>
          </aside>

          {/* Main catalog */}
          <div className="min-w-0 flex-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder={CATALOG_LABELS.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 w-full rounded-lg border border-ink-200 bg-white pl-11 pr-4 text-sm text-ink-900 shadow-soft-xs transition-colors placeholder:text-ink-400 focus-visible:border-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/15"
              />
            </div>

            <div className="mt-6">
              {loading ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-ink-200 py-16 text-center"
                >
                  <LayoutGrid className="h-8 w-8 text-ink-300" />
                  <p className="text-sm text-ink-500">{CATALOG_LABELS.noProducts}</p>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredProducts.map((product, i) => (
                    <ProductCard key={product.id} product={product} index={i} onAddToCart={handleAddToCart} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>

      {/* Toast notification */}
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
    </section>
  );
}

function CategoryButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-left text-[13.5px] font-medium transition-colors lg:w-full",
        active ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-100/70 hover:text-ink-900"
      )}
    >
      {active && (
        <motion.span
          layoutId="activeCategoryBg"
          className="absolute inset-0 rounded-lg border-l-2 border-brand-600 bg-brand-50 lg:border-l-[3px]"
          style={{ zIndex: -1 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
      {children}
    </button>
  );
}
