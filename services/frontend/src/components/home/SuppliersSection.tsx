"use client";

import { Building2, ShieldCheck } from "lucide-react";

import { SUPPLIER_SHOWCASE } from "@/lib/constants";
import { Container } from "@/components/shared/Container";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Stagger, StaggerItem } from "@/components/shared/Reveal";

export default function SuppliersSection() {
  return (
    <section id="suppliers" className="scroll-mt-20 bg-ink-900 py-20 sm:py-28 relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-x-0 h-[520px] opacity-40" aria-hidden="true" />
      <Container className="relative">
        <SectionHeading
          tone="dark"
          eyebrow="Verified Network"
          title="Suppliers vetted before they ever list."
          subtitle="Every organization on MedBAY completes a registration and compliance review — browse a sample of the manufacturers and distributors already sourcing through the marketplace."
        />

        <Stagger className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SUPPLIER_SHOWCASE.map((supplier) => (
            <StaggerItem key={supplier.name}>
              <div className="group flex h-full items-start gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm transition-colors duration-300 hover:border-brand-400/40 hover:bg-white/[0.07]">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/10 text-brand-300">
                  <Building2 className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate font-display text-[14.5px] font-semibold text-white">{supplier.name}</h3>
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brand-400" />
                  </div>
                  <p className="mt-1 text-[12.5px] text-ink-300">{supplier.category}</p>
                  {supplier.certification && (
                    <p className="mt-1.5 truncate text-[11.5px] text-ink-400">{supplier.certification}</p>
                  )}
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}
