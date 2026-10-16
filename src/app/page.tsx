import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { HeroSection } from "@/components/marketing/hero-section";
import { FeaturesSection } from "@/components/marketing/features-section";
import { UseCasesSection } from "@/components/marketing/use-cases-section";
import { WorkflowSection } from "@/components/marketing/workflow-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { ComparisonTable } from "@/components/marketing/comparison-table";
import { FaqSection } from "@/components/marketing/faq-section";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "DIGISOLVNET WaCRM — Official WhatsApp Business CRM & Sales Engine",
  description:
    "Scale customer conversations, multi-agent shared inbox, visual sales pipelines, no-code chatbot flows, and in-chat Razorpay UPI payments on official WhatsApp Cloud API.",
  openGraph: {
    title: "DIGISOLVNET WaCRM — Official WhatsApp Business CRM & Sales Engine",
    description:
      "Scale customer conversations, multi-agent shared inbox, visual sales pipelines, no-code chatbot flows, and in-chat Razorpay UPI payments on official WhatsApp Cloud API.",
    url: "https://crm.digisolvnet.com",
    siteName: "DIGISOLVNET WaCRM",
    type: "website",
  },
};

export default function MarketingHomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-emerald-500/20 selection:text-emerald-500">
      <MarketingNavbar />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <UseCasesSection />
        <WorkflowSection />
        <PricingSection />
        <ComparisonTable />
        <FaqSection />
        <CtaBanner />
      </main>
      <MarketingFooter />
    </div>
  );
}
