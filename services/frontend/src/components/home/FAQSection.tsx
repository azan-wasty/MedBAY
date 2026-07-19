"use client";

import { FAQ_ITEMS } from "@/lib/constants";
import { Container } from "@/components/shared/Container";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Reveal } from "@/components/shared/Reveal";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

export default function FAQSection() {
  return (
    <section id="faq" className="scroll-mt-20 bg-ink-50/40 py-20 sm:py-28">
      <Container>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading
            align="left"
            eyebrow="FAQ"
            title="Questions procurement teams ask us."
            subtitle="Can't find what you need? Reach out to our procurement team directly."
            className="lg:sticky lg:top-28"
          />

          <Reveal>
            <Accordion type="single" collapsible className="rounded-xl border border-ink-100 bg-white px-6 shadow-soft-xs">
              {FAQ_ITEMS.map((item) => (
                <AccordionItem key={item.q} value={item.q}>
                  <AccordionTrigger>{item.q}</AccordionTrigger>
                  <AccordionContent>{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
