"use client";

import { BadgeCheck, ClipboardList, Truck, RotateCcw, type LucideIcon } from "lucide-react";

import { BENEFITS_CONTENT } from "@/lib/constants";
import { Container } from "@/components/shared/Container";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { PulseDivider } from "@/components/shared/PulseLine";
import { Stagger, StaggerItem } from "@/components/shared/Reveal";

const ICON_MAP: Record<string, LucideIcon> = {
  BadgeCheck,
  ClipboardList,
  Truck,
  RotateCcw,
};

export default function Benefits() {
  return (
    <section id="benefits" className="scroll-mt-20 py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Why MedBAY"
          title="Built for how procurement teams actually buy."
          subtitle="Every feature below maps to a real workflow in the platform — not marketing filler."
        />

        <Stagger className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS_CONTENT.map((benefit) => {
            const Icon = ICON_MAP[benefit.icon] ?? BadgeCheck;
            return (
              <StaggerItem key={benefit.title} className="group relative rounded-xl border border-ink-100 bg-white p-6 shadow-soft-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-soft-sm">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 font-display text-[15.5px] font-semibold text-ink-900">{benefit.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-500">{benefit.description}</p>
              </StaggerItem>
            );
          })}
        </Stagger>

        <div className="mt-16">
          <PulseDivider />
        </div>
      </Container>
    </section>
  );
}
