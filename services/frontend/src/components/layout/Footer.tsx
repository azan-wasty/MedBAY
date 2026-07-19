import Link from "next/link";
import { Mail, Phone, MapPin, ArrowUpRight } from "lucide-react";

import { BRAND_CONFIG, NAV_LINKS } from "@/lib/constants";
import { Logo } from "@/components/shared/Logo";
import { Container } from "@/components/shared/Container";
import { PulseLine } from "@/components/shared/PulseLine";

const marketplaceLinks = [
  { label: "Browse catalog", href: "/" },
  { label: "Featured equipment", href: "/#catalog" },
  { label: "Categories", href: "/#categories" },
  { label: "RFQ cart", href: "/cart" },
  { label: "Buyer dashboard", href: "/dashboard" },
];

const companyLinks = [
  { label: "Why MedBAY", href: "/#benefits" },
  { label: "Verified suppliers", href: "/#suppliers" },
  { label: "Customer stories", href: "/#testimonials" },
  { label: "FAQ", href: "/#faq" },
];

const legalLinks = [
  { label: "Terms of Service", href: "#" },
  { label: "Privacy Policy", href: "#" },
  { label: "Compliance", href: "#" },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/5 bg-ink-900">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <div
        className="pointer-events-none absolute -top-40 right-[-10%] h-[420px] w-[420px] rounded-full bg-brand-600/20 blur-[120px]"
        aria-hidden="true"
      />

      <Container className="relative py-16 sm:py-20">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div className="flex flex-col gap-4">
            <Logo tone="dark" />
            <p className="max-w-[300px] text-sm leading-relaxed text-ink-300">{BRAND_CONFIG.slogan}</p>
            <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-400">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse-soft" />
              Sourcing network online
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-white/90">Marketplace</h3>
            <ul className="flex flex-col gap-3">
              {marketplaceLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-ink-300 transition-colors hover:text-brand-400">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-white/90">Company</h3>
            <ul className="flex flex-col gap-3">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-ink-300 transition-colors hover:text-brand-400">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-white/90">
              Contact Procurement
            </h3>
            <ul className="flex flex-col gap-3.5">
              <li>
                <a
                  href={`mailto:${BRAND_CONFIG.contactEmail}`}
                  className="group flex items-start gap-2.5 text-sm text-ink-300 transition-colors hover:text-brand-400"
                >
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-ink-500 group-hover:text-brand-400" />
                  {BRAND_CONFIG.contactEmail}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${BRAND_CONFIG.phone.replace(/[^\d+]/g, "")}`}
                  className="group flex items-start gap-2.5 text-sm text-ink-300 transition-colors hover:text-brand-400"
                >
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-ink-500 group-hover:text-brand-400" />
                  {BRAND_CONFIG.phone}
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-ink-400">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
                {BRAND_CONFIG.address}
              </li>
            </ul>
          </div>
        </div>

        <div className="my-10 opacity-40 sm:my-12">
          <PulseLine width={200} strokeWidth={1.75} strokeClassName="stroke-brand-500" />
        </div>

        <div className="flex flex-col-reverse items-center gap-4 border-t border-white/10 pt-6 sm:flex-row sm:justify-between">
          <p className="text-xs text-ink-400">
            &copy; {new Date().getFullYear()} {BRAND_CONFIG.name}. All rights reserved.
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {legalLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="inline-flex items-center gap-1 text-xs text-ink-400 transition-colors hover:text-brand-400"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href={`mailto:${BRAND_CONFIG.contactEmail}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 transition-colors hover:text-brand-300"
              >
                Talk to procurement
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </li>
          </ul>
        </div>
      </Container>
    </footer>
  );
}
