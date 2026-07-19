"use client";

import { TRUST_STATS } from "@/lib/constants";
import { Container } from "@/components/shared/Container";
import { Stagger, StaggerItem } from "@/components/shared/Reveal";

export default function TrustStats() {
  return (
    <section className="relative border-y border-ink-100 bg-ink-50/50 py-10 sm:py-12">
      <Container>
        <Stagger className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-8">
          {TRUST_STATS.map((stat) => (
            <StaggerItem key={stat.label} className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <span className="font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
                {stat.value}
              </span>
              <span className="mt-1 text-[13px] font-medium text-ink-500">{stat.label}</span>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}
