"use client";

import { ScanLine, HeartPulse, Syringe, FlaskConical, Boxes, ArrowRight, type LucideIcon } from "lucide-react";

import { CATEGORY_SHOWCASE } from "@/lib/constants";
import { Container } from "@/components/shared/Container";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Stagger, StaggerItem } from "@/components/shared/Reveal";

const ICON_MAP: Record<string, LucideIcon> = {
  ScanLine,
  HeartPulse,
  Syringe,
  FlaskConical,
  Boxes,
};

function selectCategory(name: string) {
  window.dispatchEvent(new CustomEvent("catalog:set-category", { detail: name }));
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById("catalog")?.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
}

export default function CategoriesGrid() {
  return (
    <section id="categories" className="py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Shop by Category"
          title="Every department, one marketplace."
          subtitle="From capital diagnostic imaging equipment to everyday consumables — browse verified inventory organized the way your procurement team already thinks."
        />

        <Stagger className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {CATEGORY_SHOWCASE.map((cat) => {
            const Icon = ICON_MAP[cat.icon] ?? Boxes;
            return (
              <StaggerItem key={cat.name}>
                <button
                  type="button"
                  onClick={() => selectCategory(cat.name)}
                  className="group flex h-full w-full flex-col items-start gap-3.5 rounded-xl border border-ink-100 bg-white p-5 text-left shadow-soft-xs transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-soft-lg"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <span>
                    <span className="block font-display text-[15px] font-semibold text-ink-900">{cat.name}</span>
                    <span className="mt-1 block text-[12.5px] leading-relaxed text-ink-500">{cat.description}</span>
                  </span>
                  <span className="mt-auto inline-flex items-center gap-1 pt-1 text-[12.5px] font-semibold text-brand-700 opacity-0 transition-opacity group-hover:opacity-100">
                    Browse
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              </StaggerItem>
            );
          })}
        </Stagger>
      </Container>
    </section>
  );
}
