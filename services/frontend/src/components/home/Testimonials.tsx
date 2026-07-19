"use client";

import { Quote } from "lucide-react";

import { TESTIMONIALS } from "@/lib/constants";
import { Container } from "@/components/shared/Container";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Stagger, StaggerItem } from "@/components/shared/Reveal";

export default function Testimonials() {
  return (
    <section id="testimonials" className="scroll-mt-20 py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Customer Stories"
          title="Trusted by procurement teams that can't afford delays."
        />

        <Stagger className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <StaggerItem key={t.name}>
              <figure className="flex h-full flex-col rounded-xl border border-ink-100 bg-white p-6 shadow-soft-xs">
                <Quote className="h-6 w-6 text-brand-300" strokeWidth={1.5} />
                <blockquote className="mt-4 flex-1 text-[14.5px] leading-relaxed text-ink-700">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-ink-100 pt-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 font-display text-[13px] font-semibold text-brand-700">
                    {t.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-ink-900">{t.name}</span>
                    <span className="block truncate text-[12px] text-ink-500">
                      {t.role}, {t.org}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}
