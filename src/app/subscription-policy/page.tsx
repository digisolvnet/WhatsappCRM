import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Subscription & Cancellation Policy — DIGISOLVNET WaCRM",
  description: "Subscription billing cycles, renewal procedures, grace periods, and cancellation guidelines for DIGISOLVNET WaCRM.",
};

export default function SubscriptionPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-emerald-500/20 selection:text-emerald-500">
      <MarketingNavbar />
      <main className="flex-1 py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8 text-sm text-muted-foreground leading-relaxed">
          <div className="space-y-2 border-b border-border pb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Subscription & Cancellation Policy
            </h1>
            <p className="text-xs text-muted-foreground">
              Last Updated: October 15, 2026 • DIGISOLVNET Solutions
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">1. Subscription Plans & Free Trial</h2>
            <p>
              DIGISOLVNET WaCRM offers tiered subscription plans (Starter Growth, Professional, and Business Scale) on monthly and annual billing cycles. New accounts receive a complimentary 7-day full-featured free trial to test the software without requiring advance payment.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">2. Renewal Reminders & Automated Notifications</h2>
            <p>
              To prevent disruption to your critical WhatsApp business communications, our system triggers automated subscription renewal alerts:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>3 Days Prior to Expiry:</strong> First renewal notice via WhatsApp and email with an instant renewal payment link.</li>
              <li><strong>1 Day Prior to Expiry:</strong> Second courtesy reminder.</li>
              <li><strong>On Due Date:</strong> Final expiration notice.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">3. Grace Period & Account Suspension</h2>
            <p>
              If a renewal payment is not completed by the expiry date, accounts enter a 3-day grace period where incoming messages are still logged. After the grace period expires without renewal:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Outbound broadcast campaigns and active chatbot automations are paused.</li>
              <li>Existing customer contacts and historical message logs remain safely stored in your database for 30 days.</li>
              <li>Full access is restored immediately upon completing the pending renewal payment.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">4. How to Cancel Your Subscription</h2>
            <p>
              You can cancel your subscription at any time:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>Navigate to <strong>Settings → Billing & Subscription</strong> in your WaCRM dashboard.</li>
              <li>Click <strong>Cancel Subscription</strong> or submit a cancellation request to <strong>support@digisolvnet.com</strong>.</li>
              <li>Your workspace will remain active until the end of your currently paid billing period, with no further renewal charges.</li>
            </ol>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
