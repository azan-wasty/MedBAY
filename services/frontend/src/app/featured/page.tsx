"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CheckCircle2, LayoutGrid } from "lucide-react";

import { CATALOG_LABELS, FILTER_LABELS, type SortOption } from "@/lib/constants";
import type { Product } from "@/lib/odooClient";
import { Container } from "@/components/shared/Container";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { ProductCard, ProductCardSkeleton } from "@/components/products/ProductCard";
import { FilterSidebar, type FilterState } from "@/components/products/FilterSidebar";
import { FilterDrawer } from "@/components/products/FilterDrawer";
import { ActiveFilterChips, type ActiveChip } from "@/components/products/ActiveFilterChips";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getProductVendorName(product: Product): string {
  if (Array.isArray(product.vendor_id) && product.vendor_id[1]) {
    return product.vendor_id[1] as string;
  }
  return "";
}

function getProductCategory(product: Product): string {
  if (Array.isArray(product.categ_id) && product.categ_id[1]) {
    return product.categ_id[1] as string;
  }
  if (typeof product.categ_id === "string") return product.categ_id;
  return "";
}

function sortProducts(products: Product[], sort: SortOption): Product[] {
  const arr = [...products];
  switch (sort) {
    case "price_asc":
      return arr.sort((a, b) => a.list_price - b.list_price);
    case "price_desc":
      return arr.sort((a, b) => b.list_price - a.list_price);
    case "name_asc":
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    case "name_desc":
      return arr.sort((a, b) => b.name.localeCompare(a.name));
    case "newest":
      return arr.sort((a, b) => b.id - a.id);
    default:
      return arr;
  }
}

// ---------------------------------------------------------------------------
// Default filter state factory
// ---------------------------------------------------------------------------

const makeDefaultFilters = (priceMin: number, priceMax: number): FilterState => ({
  category: "",
  priceRange: [priceMin, priceMax],
  vendors: [],
  availability: [],
  sort: "default",
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function FeaturedCatalog() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState<string>("");
  const [toastMessage, setToastMessage] = React.useState<string>("");
  const productPanelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 150);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Derived catalog metadata
  const [categories, setCategories] = React.useState<string[]>([]);
  const [vendors, setVendors] = React.useState<string[]>([]);
  const [priceMin, setPriceMin] = React.useState<number>(0);
  const [priceMax, setPriceMax] = React.useState<number>(10000);

  // Filter state
  const [filters, setFilters] = React.useState<FilterState>(
    makeDefaultFilters(0, 10000)
  );

  // ── Fetch products ──────────────────────────────────────────────────────
  React.useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("Failed to load products");
        const data: Product[] = await res.json();
        setProducts(data);

        // Derive filter metadata from the full product set
        const uniqueCategories = new Set<string>();
        const uniqueVendors = new Set<string>();
        let lo = Infinity;
        let hi = 0;

        data.forEach((p) => {
          const cat = getProductCategory(p);
          if (cat) uniqueCategories.add(cat);

          const vendor = getProductVendorName(p);
          if (vendor) uniqueVendors.add(vendor);

          if (p.list_price > 0) {
            lo = Math.min(lo, p.list_price);
            hi = Math.max(hi, p.list_price);
          }
        });

        const finalMin = lo === Infinity ? 0 : Math.floor(lo);
        const finalMax = hi === 0 ? 10000 : Math.ceil(hi);

        setCategories(Array.from(uniqueCategories).sort());
        setVendors(Array.from(uniqueVendors).sort());
        setPriceMin(finalMin);
        setPriceMax(finalMax);
        setFilters(makeDefaultFilters(finalMin, finalMax));
      } catch (err) {
        console.error("Error fetching catalog data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Allow homepage CategoriesGrid to pre-select a category
  React.useEffect(() => {
    const onSetCategory = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string") {
        setFilters((prev) => ({ ...prev, category: detail }));
      }
    };
    window.addEventListener("catalog:set-category", onSetCategory);
    return () => window.removeEventListener("catalog:set-category", onSetCategory);
  }, []);

  // ── Filter + sort logic ─────────────────────────────────────────────────
  const { displayProducts } = React.useMemo(() => {
    let result = products;

    // Search
    if (debouncedSearchTerm.trim()) {
      const q = debouncedSearchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description_sale && p.description_sale.toLowerCase().includes(q))
      );
    }

    // Category
    if (filters.category) {
      result = result.filter((p) => getProductCategory(p) === filters.category);
    }

    // Price range
    const [lo, hi] = filters.priceRange;
    if (lo > priceMin || hi < priceMax) {
      result = result.filter((p) => p.list_price >= lo && p.list_price <= hi);
    }

    // Vendors (OR within section)
    if (filters.vendors.length > 0) {
      result = result.filter((p) =>
        filters.vendors.includes(getProductVendorName(p))
      );
    }

    // Availability (OR within section)
    if (filters.availability.length > 0) {
      result = result.filter(
        (p) => p.stock_status && filters.availability.includes(p.stock_status)
      );
    }

    const sorted = sortProducts(result, filters.sort);
    return { displayProducts: sorted };
  }, [products, debouncedSearchTerm, filters, priceMin, priceMax]);

  // Snap the product panel back to its top whenever the result set changes
  // (new search or filter) so newly-matched items are immediately visible,
  // without affecting the scroll position of the header/sidebar around it.
  React.useEffect(() => {
    productPanelRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [debouncedSearchTerm, filters]);

  // ── Filter state helpers ────────────────────────────────────────────────
  const updateFilter = React.useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [] // setFilters is stable, no deps needed
  );

  const clearAllFilters = React.useCallback(() => {
    setFilters(makeDefaultFilters(priceMin, priceMax));
    setSearchTerm("");
  }, [priceMin, priceMax]);

  // ── Active chip computation ─────────────────────────────────────────────
  const activeChips = React.useMemo<ActiveChip[]>(() => {
    const chips: ActiveChip[] = [];

    if (filters.category) {
      chips.push({
        id: `cat-${filters.category}`,
        label: filters.category,
        onRemove: () => updateFilter("category", ""),
      });
    }

    const [lo, hi] = filters.priceRange;
    if (lo > priceMin || hi < priceMax) {
      const fmt = (v: number) =>
        v >= 1000000
          ? `$${(v / 1000000).toFixed(1)}M`
          : v >= 1000
            ? `$${(v / 1000).toFixed(0)}k`
            : `$${v}`;
      chips.push({
        id: "price-range",
        label: `${fmt(lo)} – ${hi >= priceMax ? "Any" : fmt(hi)}`,
        onRemove: () => updateFilter("priceRange", [priceMin, priceMax]),
      });
    }

    filters.vendors.forEach((v) =>
      chips.push({
        id: `vendor-${v}`,
        label: v,
        onRemove: () =>
          updateFilter(
            "vendors",
            filters.vendors.filter((x) => x !== v)
          ),
      })
    );

    filters.availability.forEach((a) => {
      const label =
        a === "in_stock"
          ? FILTER_LABELS.stockInStock
          : a === "low_stock"
            ? FILTER_LABELS.stockLowStock
            : FILTER_LABELS.stockOutOfStock;
      chips.push({
        id: `avail-${a}`,
        label,
        onRemove: () =>
          updateFilter(
            "availability",
            filters.availability.filter((x) => x !== a)
          ),
      });
    });

    if (filters.sort !== "default") {
      const sortLabel =
        {
          price_asc: "Price: Low→High", price_desc: "Price: High→Low",
          name_asc: "Name: A→Z", name_desc: "Name: Z→A", newest: "Newest"
        }[
        filters.sort
        ] ?? filters.sort;
      chips.push({
        id: `sort-${filters.sort}`,
        label: `Sort: ${sortLabel}`,
        onRemove: () => updateFilter("sort", "default"),
      });
    }

    return chips;
  }, [filters, priceMin, priceMax, updateFilter]);

  const activeFilterCount = activeChips.length;

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
    <section id="catalog" className="scroll-mt-20 bg-ink-50/40 py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Live Catalog"
          title="Featured equipment, sourced with confidence."
          subtitle="Filter and search verified medical equipment from our supplier network — every listing shows real-time availability, compliance, and bulk pricing."
        />

        <div className="mt-12 flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* ── Desktop sidebar ── */}
          {/* Sticky so it stays in place while the product panel scrolls independently. */}
          <aside className="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:w-64 lg:shrink-0 lg:overflow-y-auto lg:pb-2">
            <FilterSidebar
              filters={filters}
              onChange={updateFilter}
              onClearAll={clearAllFilters}
              categories={categories}
              vendors={vendors}
              priceMin={priceMin}
              priceMax={priceMax}
            />
          </aside>

          {/* ── Main catalog area ── */}
          <div className="min-w-0 flex-1">
            {/* Pinned search + filter header — stays in place while only the grid below scrolls. */}
            <div className="sticky top-20 z-10 -mx-1 bg-ink-50/40 px-1 pb-4 pt-1 backdrop-blur-sm lg:top-24">
              {/* Search + mobile filter trigger row */}
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    placeholder={CATALOG_LABELS.searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-12 w-full rounded-lg border border-ink-200 bg-white pl-11 pr-4 text-sm text-ink-900 shadow-soft-xs transition-colors placeholder:text-ink-400 focus-visible:border-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/15"
                  />
                </div>

                {/* Mobile filter button — hidden on lg+ */}
                <div className="lg:hidden">
                  <FilterDrawer
                    filters={filters}
                    onChange={updateFilter}
                    onClearAll={clearAllFilters}
                    categories={categories}
                    vendors={vendors}
                    priceMin={priceMin}
                    priceMax={priceMax}
                    activeFilterCount={activeFilterCount}
                  />
                </div>
              </div>

              {/* Active filter chips + result count */}
              <div className="mt-4">
                <ActiveFilterChips
                  chips={activeChips}
                  onClearAll={clearAllFilters}
                  totalProducts={products.length}
                  filteredCount={displayProducts.length}
                />
              </div>
            </div>

            {/* Product grid — the only part of the catalog that scrolls on its own. */}
            <div
              ref={productPanelRef}
              className="max-h-[75vh] overflow-y-auto pb-2 pr-1 lg:max-h-[calc(100vh-16rem)]"
            >
              {loading ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : displayProducts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-ink-200 py-20 text-center"
                >
                  <LayoutGrid className="h-8 w-8 text-ink-300" />
                  <div>
                    <p className="text-sm font-medium text-ink-600">
                      {CATALOG_LABELS.noProducts}
                    </p>
                    {activeChips.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="mt-2 text-[13px] font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700"
                      >
                        {FILTER_LABELS.clearAll}
                      </button>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {displayProducts.map((product, i) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      index={i}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>

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
    </section>
  );
}