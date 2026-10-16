import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Data Retention & Account Closure — DIGISOLVNET WaCRM",
  description: "Data retention, export, and account deletion policies for DIGISOLVNET WhatsApp CRM.",
};

export default function DataRetentionPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-emerald-500/20 selection:text-emerald-500">
      <MarketingNavbar />
      <main className="flex-1 py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8 text-sm text-muted-foreground leading-relaxed">
          <div className="space-y-2 border-b border-border pb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Data Retention, Deletion & Account Closure Policy
            </h1>
            <p className="text-xs text-muted-foreground">
              Last Updated: October 16, 2026 • DIGISOLVNET Solutions (India)
            </p>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300">
            <strong>LEGAL NOTICE:</strong> This policy outlines operational data retention schedules for DIGISOLVNET CRM in India, complying with the Digital Personal Data Protection (DPDP) Act 2023, Information Technology Act 2000, and Indian GST statutory invoice rules. Specific enterprise data processing terms should be reviewed by qualified legal counsel.
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">1. Data Ownership & Retention Principles</h2>
            <p>
              You (the subscriber) retain complete ownership of all customer contacts, catalogues, order details, and conversation histories stored within your tenant account. We retain your operational tenant data only for as long as your account remains active or as required by applicable laws.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">2. Active Subscription Retention Schedules</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Contact Records & Tags:</strong> Retained indefinitely until archived or deleted by you.</li>
              <li><strong>Message Logs & Telemetry:</strong> Delivered WhatsApp message delivery status records are retained for 12 months for diagnostic purposes.</li>
              <li><strong>Inbound Media Attachments:</strong> Media mirrored in temporary tenant storage is retained for 90 days before cold-tier archival.</li>
              <li><strong>Statutory Invoices & Billing Records:</strong> Retained for 8 years in strict compliance with Section 36 of the Central Goods and Services Tax (CGST) Act 2017.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">3. Account Expiration & 30-Day Grace Window</h2>
            <p>
              When a subscription expires, your account enters a 3-day operational grace period, followed by suspended access. All tenant data is preserved intact for a minimum of <strong className="text-foreground">30 days</strong> post-expiration to allow seamless renewal without data loss.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">4. Self-Service Data Export</h2>
            <p>
              Account owners can request a complete tenant data export at any time via the Settings panel. The export manifest bundles all contacts, orders, products, and templates in machine-readable JSON/CSV format. To protect security, cryptographic tokens and secret keys are purged from the export bundle.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">5. Account Closure & Right to Erasure (DPDP Act 2023)</h2>
            <p>
              Upon submitting an account closure request, all operational tenant databases, contacts, automations, and WhatsApp pairings are permanently purged following a statutory 30-day cancellation recovery window. Statutory financial tax records remain archived as required by Indian tax legislation.
            </p>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
