"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CheckCircle2, LayoutGrid, Loader2 } from "lucide-react";

import { CATALOG_LABELS, FILTER_LABELS, type SortOption } from "@/lib/constants";
import type { Product, PaginatedProductsResponse } from "@/lib/odooClient";
import { Container } from "@/components/shared/Container";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { ProductCard, ProductCardSkeleton } from "@/components/products/ProductCard";
import { FilterSidebar, type FilterState } from "@/components/products/FilterSidebar";
import { FilterDrawer } from "@/components/products/FilterDrawer";
import { ActiveFilterChips, type ActiveChip } from "@/components/products/ActiveFilterChips";

// ---------------------------------------------------------------------------
// Configurable Constants
// ---------------------------------------------------------------------------
const BATCH_SIZE = 20;
const SCROLL_THRESHOLD_PX = 450;

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

const makeDefaultFilters = (priceMin: number, priceMax: number): FilterState => ({
  category: "",
  priceRange: [priceMin, priceMax],
  vendors: [],
  availability: [],
  sort: "default",
});

export default function FeaturedCatalog() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [totalItems, setTotalItems] = React.useState<number>(0);
  const [page, setPage] = React.useState<number>(1);
  const [hasMore, setHasMore] = React.useState<boolean>(true);
  
  const [loading, setLoading] = React.useState<boolean>(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = React.useState<boolean>(false);
  
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState<string>("");
  const [toastMessage, setToastMessage] = React.useState<string>("");

  // Filter & Catalog Metadata
  const [categories, setCategories] = React.useState<string[]>([]);
  const [vendors, setVendors] = React.useState<string[]>([]);
  const [priceMin, setPriceMin] = React.useState<number>(0);
  const [priceMax, setPriceMax] = React.useState<number>(10000);

  const [filters, setFilters] = React.useState<FilterState>(
    makeDefaultFilters(0, 10000)
  );

  // Debounce search input
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 200);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load initial product batch & filter metadata on mount or filter changes
  const loadProductBatch = React.useCallback(
    async (targetOffset: number, append: boolean = false) => {
      try {
        if (!append) {
          setLoading(true);
        } else {
          setIsFetchingNextPage(true);
        }

        const params = new URLSearchParams();
        params.set("limit", String(BATCH_SIZE));
        params.set("offset", String(targetOffset));

        if (debouncedSearchTerm.trim()) params.set("search", debouncedSearchTerm.trim());
        if (filters.category) params.set("category", filters.category);
        if (filters.sort && filters.sort !== "default") params.set("sort", filters.sort);

        const [lo, hi] = filters.priceRange;
        if (lo > priceMin) params.set("min_price", String(lo));
        if (hi < priceMax) params.set("max_price", String(hi));

        const res = await fetch(`/api/products?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load catalog batch");

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

        // Extract category & vendor metadata from loaded items
        const uniqueCategories = new Set<string>(categories);
        const uniqueVendors = new Set<string>(vendors);

        newItems.forEach((p) => {
          const cat = getProductCategory(p);
          if (cat) uniqueCategories.add(cat);

          const vendor = getProductVendorName(p);
          if (vendor) uniqueVendors.add(vendor);
        });

        setCategories(Array.from(uniqueCategories).sort());
        setVendors(Array.from(uniqueVendors).sort());
      } catch (err) {
        console.error("Error fetching catalog batch:", err);
      } finally {
        setLoading(false);
        setIsFetchingNextPage(false);
      }
    },
    [debouncedSearchTerm, filters, priceMin, priceMax, categories, vendors]
  );

  // Trigger initial fetch or reset on filter changes
  React.useEffect(() => {
    setPage(1);
    loadProductBatch(0, false);
  }, [debouncedSearchTerm, filters]);

  // Infinite Scroll Event Listener attached to Window
  React.useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        ticking = false;
        if (!hasMore || loading || isFetchingNextPage) return;

        const scrollPosition = window.innerHeight + window.scrollY;
        const scrollThreshold = document.documentElement.scrollHeight - SCROLL_THRESHOLD_PX;

        if (scrollPosition >= scrollThreshold) {
          const nextOffset = products.length;
          setPage((prev) => prev + 1);
          loadProductBatch(nextOffset, true);
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore, loading, isFetchingNextPage, products.length, loadProductBatch]);

  // CategoriesGrid event listener
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

  const updateFilter = React.useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const clearAllFilters = React.useCallback(() => {
    setFilters(makeDefaultFilters(priceMin, priceMax));
    setSearchTerm("");
  }, [priceMin, priceMax]);

  // Active filter chips
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
          ? "In Stock"
          : a === "low_stock"
          ? "Low Stock"
          : "Out of Stock";
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

    return chips;
  }, [filters, priceMin, priceMax, updateFilter]);

  const activeFilterCount =
    (filters.category ? 1 : 0) +
    (filters.priceRange[0] > priceMin || filters.priceRange[1] < priceMax ? 1 : 0) +
    filters.vendors.length +
    filters.availability.length;

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setToastMessage(`${product.name} ${CATALOG_LABELS.addedToCart}!`);
    setTimeout(() => setToastMessage(""), 3000);
  };

  return (
    <section id="catalog" className="scroll-mt-20 bg-ink-50/40 py-10 sm:py-14">
      <Container>
        <SectionHeading
          eyebrow="Live Catalog"
          title="Featured equipment, sourced with confidence."
          subtitle="Filter and search verified medical equipment from our supplier network — every listing shows real-time availability, compliance, and bulk pricing."
        />

        <div className="mt-10 flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block lg:w-64 lg:shrink-0">
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

          {/* Main catalog area */}
          <div className="min-w-0 flex-1">
            {/* Search + Mobile filter trigger */}
            <div className="flex items-center gap-3">
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
                totalProducts={totalItems || products.length}
                filteredCount={products.length}
              />
            </div>

            {/* Product Grid */}
            <div className="mt-6">
              {loading ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-ink-200 py-16 text-center"
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
                <>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {products.map((product, i) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        index={i}
                        onAddToCart={handleAddToCart}
                      />
                    ))}
                  </div>

                  {/* Batch loading skeleton indicator */}
                  {isFetchingNextPage && (
                    <div className="mt-8">
                      <div className="mb-4 flex items-center justify-center gap-2 text-xs font-medium text-brand-700">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading more equipment...
                      </div>
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <ProductCardSkeleton key={`next-skel-${i}`} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* End of catalog indicator */}
                  {!hasMore && products.length > 0 && (
                    <div className="mt-12 text-center text-xs font-medium text-ink-400">
                      You've viewed all {totalItems || products.length} products in our catalog
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
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
    </section>
  );
}
