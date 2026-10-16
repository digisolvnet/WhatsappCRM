import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — DIGISOLVNET WaCRM",
  description: "Transparent refund terms, duplicate payment handling, failed provisioning relief, and legal review requirements.",
};

export default function RefundPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-emerald-500/20 selection:text-emerald-500">
      <MarketingNavbar />
      <main className="flex-1 py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8 text-sm text-muted-foreground leading-relaxed">
          <div className="space-y-2 border-b border-border pb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Refund & Failed-Payment Policy
            </h1>
            <p className="text-xs text-muted-foreground">
              Last Updated: October 16, 2026 • DIGISOLVNET Solutions (India)
            </p>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300">
            <strong>LEGAL DISCLAIMER:</strong> DIGISOLVNET operates under transparent customer-protection standards and rejects blanket unconditional "no refund under any circumstance" policies. This policy reflects statutory consumer standards under the Consumer Protection Act 2019 and Indian contract law. Final terms are subject to formal review by a qualified Indian legal advocate.
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">1. Commitment to Fair & Transparent Billing</h2>
            <p>
              We believe in honest, transparent business practices. DIGISOLVNET provides free trial evaluations for new customers. When financial transactions occur, refund eligibility is defined by clear criteria rather than arbitrary decisions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">2. Refund Eligibility Criteria</h2>
            <p>You are eligible for a refund under the following verified circumstances:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Duplicate Payments:</strong> If a gateway glitch or double-click causes duplicate charges for the same subscription or order, the duplicate amount is refunded 100% within 3 to 5 business days upon automated reconciliation.
              </li>
              <li>
                <strong>Failed Provisioning / System Failure:</strong> If payment is deducted but our backend platform fails to provision your workspace or features within 24 hours and our technical team cannot resolve the issue within 48 hours, you are entitled to a full refund.
              </li>
              <li>
                <strong>Annual Subscription 14-Day Guarantee:</strong> For annual plan purchases, you may request a refund within 14 calendar days of your initial payment if the platform does not meet your operational requirements.
              </li>
              <li>
                <strong>Unannounced Price / Feature Reduction:</strong> If a core paid feature is discontinued during your active term without a suitable replacement.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">3. Non-Refundable Items & Exceptions</h2>
            <p>Refunds cannot be issued for:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Meta/WhatsApp conversation utility fees consumed at the telecommunication network layer.</li>
              <li>Accounts terminated due to violations of WhatsApp Anti-Spam policies or our Acceptable Use Policy.</li>
              <li>Partial-month refunds or prorated credits for voluntary mid-month cancellations.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">4. Refund Processing & Timelines</h2>
            <p>
              Approved refunds are credited directly back to the original payment source (UPI, Credit/Debit Card, Netbanking) via our payment gateway (Razorpay) within <strong>5 to 7 Indian banking days</strong>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">5. How to File a Refund or Billing Claim</h2>
            <p>
              Submit your claim to <strong className="text-foreground">billing@digisolvnet.com</strong> with your registered email, order reference number, and payment ID. Our finance desk responds within 24 business hours.
            </p>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
