import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { UseCasesSection } from "@/components/marketing/use-cases-section";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Industry Use Cases — DIGISOLVNET WaCRM",
  description:
    "Tailored WhatsApp CRM workflows for retail shops, e-commerce sellers, healthcare clinics, coaches, and real estate agencies.",
};

export default function UseCasesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-emerald-500/20 selection:text-emerald-500">
      <MarketingNavbar />
      <main className="flex-1 pt-6">
        <UseCasesSection />
        <CtaBanner />
      </main>
      <MarketingFooter />
    </div>
  );
}
