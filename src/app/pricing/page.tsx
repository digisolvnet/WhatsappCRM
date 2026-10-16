import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { PricingSection } from "@/components/marketing/pricing-section";
import { ComparisonTable } from "@/components/marketing/comparison-table";
import { FaqSection } from "@/components/marketing/faq-section";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Pricing & Plans — DIGISOLVNET WaCRM",
  description:
    "Simple, transparent pricing for DIGISOLVNET WhatsApp CRM. Starter, Professional, and Business Scale plans with 7-day free trial and annual discounts.",
};

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-emerald-500/20 selection:text-emerald-500">
      <MarketingNavbar />
      <main className="flex-1 pt-6">
        <PricingSection />
        <ComparisonTable />
        <FaqSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
