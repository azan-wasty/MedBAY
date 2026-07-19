import Hero from "@/components/home/Hero";
import TrustStats from "@/components/home/TrustStats";
import CategoriesGrid from "@/components/home/CategoriesGrid";
import FeaturedCatalog from "@/components/home/FeaturedCatalog";
import Benefits from "@/components/home/Benefits";
import SuppliersSection from "@/components/home/SuppliersSection";
import Testimonials from "@/components/home/Testimonials";
import FAQSection from "@/components/home/FAQSection";
import CtaBand from "@/components/home/CtaBand";

export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustStats />
      <CategoriesGrid />
      <FeaturedCatalog />
      <Benefits />
      <SuppliersSection />
      <Testimonials />
      <FAQSection />
      <CtaBand />
    </>
  );
}
