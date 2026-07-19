"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ShieldCheck, CheckCircle2, Building2 } from "lucide-react";

import { HERO_CONTENT, MOCK_PRODUCTS } from "@/lib/constants";
import { Container } from "@/components/shared/Container";
import { Reveal } from "@/components/shared/Reveal";
import { PulseLine } from "@/components/shared/PulseLine";
import { Button } from "@/components/ui/button";

const heroProduct = MOCK_PRODUCTS[0];

export default function Hero() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-white pb-20 pt-14 sm:pb-28 sm:pt-20 lg:pt-24">
      {/* Ambient gradient mesh — decorative, aria-hidden, respects reduced motion via the animation itself being subtle/slow */}
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

        {/* Visual column — floating verified-product mockup */}
        <Reveal delay={0.18} y={26} className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
          <div className="relative">
            <PulseLine
              width={260}
              strokeWidth={2}
              delay={0.6}
              className="absolute -left-6 -top-10 hidden opacity-70 sm:block"
            />
            <motion.div
              style={{ "--tilt": "1.4deg" } as React.CSSProperties}
              animate={shouldReduceMotion ? undefined : { translateY: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative rotate-[1.4deg] overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft-xl"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink-50">
                <img
                  src={(heroProduct.image_1920 as string) || (heroProduct.image_256 as string)}
                  alt={heroProduct.name}
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-3.5 top-3.5 inline-flex items-center gap-1 rounded-full border border-brand-200 bg-white/95 px-2.5 py-1 text-[10.5px] font-semibold text-brand-700 shadow-soft-xs">
                  <ShieldCheck className="h-3 w-3" />
                  Verified Supplier
                </span>
              </div>
              <div className="p-5">
                <p className="font-display text-[15px] font-semibold text-ink-900">{heroProduct.name}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-500">
                  <Building2 className="h-3.5 w-3.5 text-ink-400" />
                  {heroProduct.vendor_id[1]}
                </p>
                <div className="mt-3.5 flex items-center justify-between rounded-lg bg-ink-50/70 px-3 py-2.5">
                  <span className="text-[10.5px] font-medium uppercase tracking-wide text-ink-400">List Price</span>
                  <span className="font-data text-[15px] font-semibold text-ink-900">
                    ${heroProduct.list_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-[12px] text-ink-500">
                  <span>
                    MOQ: <strong className="font-medium text-ink-700">{heroProduct.min_order_qty}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700">
                    In Stock
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Secondary floating chip — RFQ moment */}
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
      </Container>
    </section>
  );
}
