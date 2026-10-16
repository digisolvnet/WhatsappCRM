import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Terms of Service — DIGISOLVNET WaCRM",
  description: "Terms of Service and Software License Agreement for DIGISOLVNET WhatsApp CRM.",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-emerald-500/20 selection:text-emerald-500">
      <MarketingNavbar />
      <main className="flex-1 py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8 text-sm text-muted-foreground leading-relaxed">
          <div className="space-y-2 border-b border-border pb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Terms of Service
            </h1>
            <p className="text-xs text-muted-foreground">
              Last Updated: October 15, 2026 • DIGISOLVNET Solutions
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By signing up, creating an account, or using the DIGISOLVNET WaCRM software platform ("WaCRM"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you must discontinue using the software immediately.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">2. Software License & Account Responsibility</h2>
            <p>
              DIGISOLVNET grants you a non-exclusive, non-transferable, revocable software license to access and use WaCRM in accordance with your subscribed plan entitlements. You are responsible for maintaining the confidentiality of your workspace login credentials and for all activities that occur under your tenant account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">3. Compliance with WhatsApp & Meta Policies</h2>
            <p>
              Your use of WhatsApp messaging features is subject to the <strong className="text-foreground">Meta WhatsApp Business Terms of Service</strong> and <strong className="text-foreground">WhatsApp Business Messaging Policy</strong>. You expressly agree that:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>You will only send marketing broadcasts or notifications to end customers who have provided verifiable opt-in consent.</li>
              <li>You will immediately honor opt-out and unsubscribe requests (e.g. "STOP").</li>
              <li>You will not use WaCRM to distribute unsolicited spam, illegal goods, fraudulent schemes, or prohibited products as defined by Meta.</li>
              <li>You acknowledge that phone number tiering, quality rating limits, and per-conversation fees are determined exclusively by Meta.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">4. Payment Terms & Subscription Renewals</h2>
            <p>
              Subscription fees for software usage are billed in advance on a recurring monthly or annual basis as configured in your plan. If a renewal payment is past due, we provide a grace period and send automated reminder notices before workspace features are temporarily restricted.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">5. Limitation of Liability</h2>
            <p>
              DIGISOLVNET shall not be liable for any indirect, incidental, special, or consequential damages resulting from downtime of third-party platforms (including Meta Platforms Inc., WhatsApp Cloud API outages, or payment processor outages).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">6. Governing Law</h2>
            <p>
              These Terms of Service are governed by and construed in accordance with the applicable laws of India, and any disputes shall be subject to the exclusive jurisdiction of the competent courts.
            </p>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
