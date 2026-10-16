import type { Metadata } from "next";
import { Shield, AlertTriangle, CheckCircle2, Clock, ThumbsUp, ArrowRight } from "lucide-react";
import Link from "next/link";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "WhatsApp Cloud API Compliance & Best Practices — DIGISOLVNET WaCRM",
  description:
    "Official guidelines on WhatsApp 24-hour customer service windows, pre-approved message templates, quality rating tiers, and opt-in management.",
};

export default function WhatsAppGuidePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-emerald-500/20 selection:text-emerald-500">
      <MarketingNavbar />
      <main className="flex-1 py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-10 text-sm text-muted-foreground leading-relaxed">
          <div className="space-y-3 border-b border-border pb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold uppercase tracking-wider">
              Meta Official Guidelines
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              WhatsApp Business Cloud API Compliance Guide
            </h1>
            <p className="text-base text-muted-foreground">
              Essential rules and best practices to keep your phone number quality rating high and prevent messaging restrictions.
            </p>
          </div>

          {/* Core Concept 1: The 24-Hour Customer Service Window */}
          <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
            <div className="flex items-center gap-2 text-foreground font-bold text-base">
              <Clock className="w-5 h-5 text-emerald-500" />
              <span>1. The 24-Hour Customer Care Window</span>
            </div>
            <p>
              When an end customer sends you a WhatsApp message, Meta opens a rolling <strong>24-hour customer service window</strong>. During this window:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-foreground/80">
              <li>Your agents and bot flows can send free-form text, images, documents, and interactive buttons without requiring pre-approval.</li>
              <li>Once the 24 hours expire without a customer reply, free-form messages cannot be sent. You must re-engage using a <strong>Meta-approved Message Template</strong>.</li>
            </ul>
          </div>

          {/* Core Concept 2: Message Template Categories */}
          <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
            <div className="flex items-center gap-2 text-foreground font-bold text-base">
              <Shield className="w-5 h-5 text-emerald-500" />
              <span>2. Message Template Categories</span>
            </div>
            <p>
              All business-initiated outreach outside the 24-hour window must use templates registered and approved by Meta. Categories include:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <span className="font-bold text-foreground block">Utility</span>
                <span className="text-muted-foreground">Order confirmations, payment receipts, appointment reminders, and shipping updates.</span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <span className="font-bold text-foreground block">Authentication</span>
                <span className="text-muted-foreground">One-time passwords (OTP) and login verification codes with security buttons.</span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <span className="font-bold text-foreground block">Marketing</span>
                <span className="text-muted-foreground">Promotional offers, festive discounts, new product launches, and re-engagement campaigns.</span>
              </div>
            </div>
          </div>

          {/* Core Concept 3: Phone Number Quality Rating & Tiers */}
          <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
            <div className="flex items-center gap-2 text-foreground font-bold text-base">
              <ThumbsUp className="w-5 h-5 text-emerald-500" />
              <span>3. Phone Number Quality Rating & Messaging Limits</span>
            </div>
            <p>
              Meta tracks how recipients respond to your messages. If users report or block your number, your Quality Rating moves from <strong>Green (High)</strong> to <strong>Yellow (Medium)</strong> or <strong>Red (Low)</strong>.
            </p>
            <p className="text-xs">
              <strong>Messaging Limits:</strong> Newly registered Cloud API numbers start at Tier 1 (1,000 unique business-initiated customers per 24 hours). As you send high-quality messages with low block rates, Meta automatically upgrades your limit to 10,000, 100,000, and eventually Unlimited.
            </p>
          </div>

          {/* Core Concept 4: Unsubscribe and Opt-Out Best Practices */}
          <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
            <div className="flex items-center gap-2 text-foreground font-bold text-base">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>4. Mandatory Opt-Out & Quick Replies</span>
            </div>
            <p>
              Always give customers an easy way to opt out directly on promotional broadcasts:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-foreground/80">
              <li>Add a Quick-Reply button such as <strong>"Stop Promotions"</strong> or <strong>"Unsubscribe"</strong> on marketing templates.</li>
              <li>When a customer clicks Stop, WaCRM's automation engine can automatically remove their marketing tag, protecting your number from being reported as spam.</li>
            </ul>
          </div>

          {/* CTA */}
          <div className="p-8 rounded-3xl border border-border bg-card/60 backdrop-blur-sm text-center space-y-4">
            <h3 className="text-lg font-bold text-foreground">
              Ready to Connect Your Official WhatsApp Number?
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Follow our quickstart documentation to configure your Phone Number ID and Webhooks.
            </p>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-500 transition-colors shadow-sm"
            >
              Read Quickstart Setup Guide
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
