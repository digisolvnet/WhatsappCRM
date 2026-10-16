import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Database, Server, Code, Users, ArrowRight } from "lucide-react";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "About Us & Engineering Mission — DIGISOLVNET WaCRM",
  description:
    "Learn about DIGISOLVNET WaCRM, our self-hostable and hosted WhatsApp CRM platform, our focus on data sovereignty, and official Meta Cloud API integration.",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-emerald-500/20 selection:text-emerald-500">
      <MarketingNavbar />
      <main className="flex-1 py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header */}
          <div className="space-y-4 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold uppercase tracking-wider">
              Engineering First
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              Built for Businesses That Demand Reliability & Data Sovereignty
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              DIGISOLVNET builds digital solutions and developer-grade CRM platforms for businesses transitioning to WhatsApp-first commerce.
            </p>
          </div>

          {/* Core Philosophy Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
            <div className="p-6 rounded-2xl border border-border bg-card space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                Strict Meta Official Standards
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We never use web-scraping or reverse-engineered protocols. By building solely on the official WhatsApp Business Cloud API (v21.0+), your phone number reputation remains completely secure from account bans.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                100% Tenant Data Isolation
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every business workspace is partitioned using Postgres Row-Level Security (RLS) in Supabase. Your customer phone numbers, internal sales notes, and transaction values are never pooled or mixed.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                Self-Hostable or Fully Managed
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Whether you want to run WaCRM on your private VPS / Docker infrastructure or deploy instantly on our managed cloud, our modern Next.js 16 stack guarantees complete operational freedom.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
                <Code className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                Developer-Grade Extensibility
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Full REST API (v1), outbound event webhooks, and visual React Flow automation engines allow you to synchronize WhatsApp order events directly into ERPs, CRMs, or accounting tools.
              </p>
            </div>
          </div>

          {/* Contact / Get Started */}
          <div className="p-8 rounded-3xl border border-border bg-card/60 backdrop-blur-sm text-center space-y-4">
            <h3 className="text-xl font-bold text-foreground">
              Have Questions or Need a Custom Onboarding?
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Our engineering and solutions team is ready to help you configure your Meta Cloud API and payment integrations.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-2">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 transition-colors shadow-sm"
              >
                Talk to Solutions Engineer
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-foreground font-semibold text-sm hover:bg-accent transition-colors"
              >
                View Plans & Pricing
              </Link>
            </div>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
