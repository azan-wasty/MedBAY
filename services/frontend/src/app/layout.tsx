import type { Metadata, Viewport } from "next";

import "./globals.css";
import { BRAND_CONFIG } from "@/lib/constants";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: {
    default: `${BRAND_CONFIG.name} — ${BRAND_CONFIG.slogan}`,
    template: `%s | ${BRAND_CONFIG.name}`,
  },
  description:
    "MedBAY connects hospitals, clinics, and distributors with verified medical equipment suppliers — transparent bulk pricing, compliant sourcing, and RFQ-based procurement in one enterprise marketplace.",
  keywords: [
    "medical equipment marketplace",
    "B2B medical procurement",
    "hospital equipment supplier",
    "bulk medical equipment",
    "RFQ medical devices",
  ],
  authors: [{ name: BRAND_CONFIG.name }],
  metadataBase: new URL("https://www.medbay.com"),
  openGraph: {
    type: "website",
    title: `${BRAND_CONFIG.name} — ${BRAND_CONFIG.slogan}`,
    description: "Verified medical equipment suppliers. Transparent bulk pricing. Enterprise procurement, simplified.",
    siteName: BRAND_CONFIG.name,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_CONFIG.name} — ${BRAND_CONFIG.slogan}`,
    description: "Verified medical equipment suppliers. Transparent bulk pricing. Enterprise procurement, simplified.",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A1628",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-background font-sans text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to content
        </a>
        <Navbar />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
