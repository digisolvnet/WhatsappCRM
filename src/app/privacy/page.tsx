import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Privacy Policy — DIGISOLVNET WaCRM",
  description: "Privacy Policy for DIGISOLVNET WhatsApp CRM software platform, data protection, and Meta Cloud API telemetry.",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-emerald-500/20 selection:text-emerald-500">
      <MarketingNavbar />
      <main className="flex-1 py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8 text-sm text-muted-foreground leading-relaxed">
          <div className="space-y-2 border-b border-border pb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-xs text-muted-foreground">
              Last Updated: October 15, 2026 • DIGISOLVNET Solutions
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">1. Introduction & Scope</h2>
            <p>
              DIGISOLVNET ("we", "us", or "our") respects your privacy and is committed to protecting the personal and customer data processed through our WhatsApp CRM application ("WaCRM" or the "Platform"). This Privacy Policy explains what information is collected, how it is processed, and your data ownership rights.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">2. Customer Data Sovereignty & Tenant Isolation</h2>
            <p>
              When you use WaCRM to communicate with your end customers, you act as the Data Controller of your customer data, and DIGISOLVNET operates solely as a Data Processor.
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Your customer contacts, phone numbers, conversation histories, tags, and internal notes are isolated in your dedicated tenant database governed by Postgres Row-Level Security (RLS).</li>
              <li>We never sell, rent, commercialize, or aggregate your customer data for third-party advertising or model training.</li>
              <li>Stored credentials such as Meta WhatsApp Access Tokens and AI API keys are encrypted at rest using industry-standard AES-256-GCM encryption.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">3. Information We Collect</h2>
            <p>We collect only the information necessary to provide and maintain the software service:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Account Profile Information:</strong> Business name, administrator email address, billing phone number, and password hash (managed via Supabase Auth).</li>
              <li><strong>Meta WhatsApp API Metadata:</strong> Phone Number ID, WhatsApp Business Account ID (WABA ID), and webhook verification signatures required to route inbound messages.</li>
              <li><strong>Billing Records:</strong> Subscription status, billing cycle, transaction references, and renewal dates. Payment card numbers are never collected or processed on our servers; payments are processed securely through certified payment gateways (e.g. Razorpay).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">4. Webhooks & Inbound Media Mirroring</h2>
            <p>
              Inbound WhatsApp messages and media files sent by your end customers are delivered via official Meta Cloud API webhooks. To ensure media availability after Meta's temporary download URLs expire, media files (voice notes, images, PDFs) are stored securely in your private Supabase storage bucket accessible only by authorized members of your workspace.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">5. Data Retention & Deletion Rights</h2>
            <p>
              You maintain the right to export or delete your customer contacts, conversation histories, or entire account workspace at any time directly through the CRM dashboard or by submitting a written request to <strong className="text-foreground">support@digisolvnet.com</strong>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">6. Contact Information</h2>
            <p>
              For data privacy inquiries or Data Processing Addendum (DPA) requests, please contact our compliance desk at: <strong className="text-foreground">support@digisolvnet.com</strong>.
            </p>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
