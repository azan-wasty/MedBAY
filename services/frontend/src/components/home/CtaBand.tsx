"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BRAND_CONFIG } from "@/lib/constants";
import { Container } from "@/components/shared/Container";
import { Reveal } from "@/components/shared/Reveal";
import { PulseLine } from "@/components/shared/PulseLine";
import { Button } from "@/components/ui/button";

export default function CtaBand() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-ink-900 py-20 sm:py-24">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[720px] -translate-x-1/2 rounded-full bg-brand-400/20 blur-[100px]"
        aria-hidden="true"
      />
      <Container className="relative flex flex-col items-center text-center">
        <Reveal>
          <PulseLine width={200} strokeWidth={2} strokeClassName="stroke-white/70" className="mb-6" />
        </Reveal>
        <Reveal delay={0.06}>
          <h2 className="text-balance font-display text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
            Ready to source with confidence?
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mt-4 max-w-xl text-balance text-[15px] leading-relaxed text-brand-100">
            Register your organization to unlock RFQ pricing, order tracking, and a verified supplier network — or
            reach {BRAND_CONFIG.name}&apos;s procurement team directly.
          </p>
        </Reveal>
        <Reveal delay={0.18}>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="xl" className="bg-white text-brand-700 hover:bg-brand-50">
              <Link href="/register">
                Create Free Account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline-light">
              <a href={`mailto:${BRAND_CONFIG.contactEmail}`}>Talk to Procurement</a>
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
