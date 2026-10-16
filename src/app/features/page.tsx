import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { FeaturesSection } from "@/components/marketing/features-section";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Features & Architecture — DIGISOLVNET WaCRM",
  description:
    "Explore multi-agent shared inbox, contact management, labels, automated follow-ups, Meta-compliant broadcasts, visual flow builder, and Razorpay links.",
};

export default function FeaturesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-emerald-500/20 selection:text-emerald-500">
      <MarketingNavbar />
      <main className="flex-1 pt-6">
        <FeaturesSection />
        <CtaBanner />
      </main>
      <MarketingFooter />
    </div>
  );
}
