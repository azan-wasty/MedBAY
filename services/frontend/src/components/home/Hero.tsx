"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Pause,
} from "lucide-react";

import { HERO_CONTENT, MOCK_PRODUCTS } from "@/lib/constants";
import type { Product } from "@/lib/odooClient";
import { Container } from "@/components/shared/Container";
import { Reveal, EASE_OUT } from "@/components/shared/Reveal";
import { PulseLine } from "@/components/shared/PulseLine";
import { Button } from "@/components/ui/button";
import { AntidoteVial } from "@/components/home/AntidoteVial";
import { HeroProductCard, HeroProductCardSkeleton } from "@/components/products/HeroProductCard";

const heroProduct = MOCK_PRODUCTS[0] as Product;
const ROTATION_INTERVAL_MS = 3500;

export default function Hero() {
  const shouldReduceMotion = useReducedMotion();
  const [featuredProducts, setFeaturedProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    const fetchFeatured = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/products/featured");
        if (res.ok) {
          const data: Product[] = await res.json();
          setFeaturedProducts(data);
        }
      } catch (err) {
        console.warn("Failed to load featured products for hero:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatured();
  }, []);

  return (
    <section className="relative overflow-hidden bg-white pb-20 pt-14 sm:pb-28 sm:pt-20 lg:pt-24">
      {/* Ambient gradient mesh */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="bg-grid-light absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />
        <motion.div
          className="absolute -top-32 left-[-8%] h-[480px] w-[480px] rounded-full bg-brand-200/40 blur-[110px]"
          animate={shouldReduceMotion ? undefined : { x: [0, 30, 0], y: [0, 20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-[-10%] top-10 h-[420px] w-[420px] rounded-full bg-azure-200/35 blur-[110px]"
          animate={shouldReduceMotion ? undefined : { x: [0, -24, 0], y: [0, 26, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <Container className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 xl:gap-16">
        {/* Copy column */}
        <div className="flex flex-col items-start text-left">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              {HERO_CONTENT.eyebrow}
            </span>
          </Reveal>

          <Reveal delay={0.07}>
            <h1 className="mt-5 text-balance font-display text-[2.5rem] font-semibold leading-[1.08] tracking-tight text-ink-900 sm:text-5xl lg:text-[3.4rem]">
              {HERO_CONTENT.headline}
            </h1>
          </Reveal>

          <Reveal delay={0.14}>
            <p className="mt-5 max-w-xl text-balance text-[16px] leading-relaxed text-ink-500 sm:text-lg">
              {HERO_CONTENT.subheadline}
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="xl" variant="brand">
                <a href="#catalog">
                  {HERO_CONTENT.primaryCta}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild size="xl" variant="outline">
                <a href="#benefits">{HERO_CONTENT.secondaryCta}</a>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.26}>
            <ul className="mt-9 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
              {HERO_CONTENT.trustChips.map((chip) => (
                <li key={chip} className="flex items-center gap-2 text-[13.5px] font-medium text-ink-600">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" />
                  {chip}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* Visual column — interactive particle antidote capsule */}
        <div className="relative mx-auto aspect-square w-full max-w-md lg:mx-0 lg:max-w-none">
          <Reveal delay={0.18} y={26} className="h-full w-full">
            <AntidoteVial className="h-full w-full" />
          </Reveal>
        </div>
      </Container>

      {/* ── Featured product — horizontal card, full bleed below hero row ── */}
      <div className="mt-16 px-4 sm:mt-20 sm:px-6 lg:mt-24">
        <div className="relative w-full">
          <PulseLine
            width={360}
            strokeWidth={2}
            delay={0.3}
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 hidden -translate-x-1/2 -translate-y-1/2 opacity-[0.15] sm:block"
          />
          {loading ? (
            <HeroLoadingSkeleton />
          ) : featuredProducts.length > 0 ? (
            <HeroSingleSlotRotator
              products={featuredProducts}
              shouldReduceMotion={Boolean(shouldReduceMotion)}
            />
          ) : (
            <HeroStaticFallback shouldReduceMotion={Boolean(shouldReduceMotion)} />
          )}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Single-Slot Cross-Fade Rotator
// ---------------------------------------------------------------------------

function HeroSingleSlotRotator({
  products,
  shouldReduceMotion,
}: {
  products: Product[];
  shouldReduceMotion: boolean;
}) {
  const [activeIndex, setActiveIndex] = React.useState<number>(0);
  const [isHovered, setIsHovered] = React.useState<boolean>(false);

  const total = products.length;
  const isMulti = total > 1;

  // Auto-rotation timer: loops through products every 3.5 s.
  // Pauses on hover/focus; disabled when reduced motion is preferred.
  React.useEffect(() => {
    if (!isMulti || isHovered || shouldReduceMotion) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isMulti, isHovered, shouldReduceMotion, total]);

  const currentProduct = products[activeIndex] || products[0];

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveIndex((prev) => (prev - 1 + total) % total);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveIndex((prev) => (prev + 1) % total);
  };

  return (
    <div className="relative">
      {/* Header bar: spotlight badge + pause indicator + view-all link */}
      <div className="mb-3.5 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand-700">
            <Sparkles className="h-3 w-3 text-brand-600" />
            Featured Spotlight
          </span>
          {isMulti && isHovered && !shouldReduceMotion && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              <Pause className="h-2.5 w-2.5" />
              Paused
            </span>
          )}
        </div>

        {isMulti && (
          <Link
            href="/featured"
            className="group inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-600 transition-colors hover:text-brand-700"
          >
            View All ({total})
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      {/* Card wrapper — provides outer border/shadow/rounded, passes group for image hover */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        className="group relative overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft-xl transition-all duration-300 hover:border-brand-300 hover:shadow-[0_24px_56px_-12px_rgba(0,0,0,0.16)]"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentProduct.id}
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -8 }}
            transition={{ duration: shouldReduceMotion ? 0.15 : 0.35, ease: EASE_OUT }}
            className="w-full"
          >
            <HeroProductCard
              product={currentProduct}
              shouldReduceMotion={shouldReduceMotion}
              activeIndex={activeIndex}
              total={total}
            />
          </motion.div>
        </AnimatePresence>

        {/* Prev / Next arrows — constrained to the image panel on desktop */}
        {isMulti && (
          <div className="pointer-events-none absolute inset-x-2 top-1/3 flex justify-between sm:right-[56%] sm:top-1/2 sm:-translate-y-1/2">
            <button
              onClick={handlePrev}
              aria-label="Previous featured product"
              className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-ink-100 bg-white/90 text-ink-700 shadow-soft-sm transition-all hover:bg-white hover:text-brand-700 active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNext}
              aria-label="Next featured product"
              className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-ink-100 bg-white/90 text-ink-700 shadow-soft-sm transition-all hover:bg-white hover:text-brand-700 active:scale-95"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Dot pagination indicators */}
      {isMulti && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {products.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-label={`Go to featured product ${idx + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === activeIndex
                  ? "w-6 bg-brand-600"
                  : "w-2 bg-ink-200 hover:bg-ink-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fallback — shown when no products are marked as featured
// ---------------------------------------------------------------------------

function HeroStaticFallback({ shouldReduceMotion }: { shouldReduceMotion: boolean }) {
  return (
    <Reveal delay={0.18} y={26}>
      <div className="relative">
        <div className="group overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft-xl transition-all duration-300 hover:border-brand-300 hover:shadow-[0_24px_56px_-12px_rgba(0,0,0,0.16)]">
          <HeroProductCard
            product={heroProduct}
            shouldReduceMotion={shouldReduceMotion}
          />
        </div>

        {/* Floating RFQ approval chip */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass absolute -bottom-6 -left-6 hidden items-center gap-2.5 rounded-xl border border-ink-100 px-4 py-3 shadow-soft-lg sm:flex"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="text-[12.5px] font-semibold text-ink-900">RFQ Approved</p>
            <p className="text-[11px] text-ink-500">Quoted in 4 hrs</p>
          </div>
        </motion.div>
      </div>
    </Reveal>
  );
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function HeroLoadingSkeleton() {
  return <HeroProductCardSkeleton />;
}