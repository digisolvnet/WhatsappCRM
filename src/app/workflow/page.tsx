import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { WorkflowSection } from "@/components/marketing/workflow-section";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Order & Sales Lifecycle Workflow — DIGISOLVNET WaCRM",
  description:
    "Interactive walkthrough of the 7-step WhatsApp commerce workflow: Discovery, Triage, Selection, Order, Payment, Fulfilment, and Retention.",
};

export default function WorkflowPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-emerald-500/20 selection:text-emerald-500">
      <MarketingNavbar />
      <main className="flex-1 pt-6">
        <WorkflowSection />
        <CtaBanner />
      </main>
      <MarketingFooter />
    </div>
  );
}
