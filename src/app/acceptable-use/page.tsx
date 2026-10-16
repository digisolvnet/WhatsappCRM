import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Acceptable Use Policy — DIGISOLVNET WaCRM",
  description: "Acceptable Use Policy, anti-spam rules, and WhatsApp Business compliance requirements for DIGISOLVNET WaCRM.",
};

export default function AcceptableUsePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-emerald-500/20 selection:text-emerald-500">
      <MarketingNavbar />
      <main className="flex-1 py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8 text-sm text-muted-foreground leading-relaxed">
          <div className="space-y-2 border-b border-border pb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Acceptable Use Policy
            </h1>
            <p className="text-xs text-muted-foreground">
              Last Updated: October 15, 2026 • DIGISOLVNET Solutions
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">1. Purpose & Standards</h2>
            <p>
              This Acceptable Use Policy ("AUP") defines the acceptable conduct and content standards when utilizing DIGISOLVNET WaCRM. Our platform is engineered strictly for legitimate customer relationship management, support triage, and opted-in commercial communications.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">2. Prohibited Activities</h2>
            <p>You may not use DIGISOLVNET WaCRM to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Send unsolicited bulk messages (spam) to individuals who have not explicitly opted in to receive communications from your business.</li>
              <li>Upload scraped, purchased, or third-party phone number databases.</li>
              <li>Engage in deceptive phishing, multi-level marketing (MLM) schemes, financial fraud, or impersonation.</li>
              <li>Distribute malware, malicious URLs, harassment, or hate speech.</li>
              <li>Promote weapons, illegal drugs, prescription medications without authorization, gambling, or adult content prohibited under Meta's Commercial Policy.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">3. Verifiable Customer Opt-In Requirement</h2>
            <p>
              Under official WhatsApp standards, you must obtain affirmative opt-in consent before sending marketing or utility templates. Opt-in can be collected via website checkboxes, in-store physical forms, verbal agreement with SMS confirmation, or direct inbound customer messaging.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">4. Enforcement & Account Termination</h2>
            <p>
              DIGISOLVNET reserves the right to immediately suspend or terminate any workspace that generates excessive customer spam reports, violates Meta's Messaging Policy, or causes repeated Meta Cloud API policy strikes.
            </p>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
