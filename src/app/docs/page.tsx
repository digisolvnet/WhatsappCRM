import type { Metadata } from "next";
import Link from "next/link";
import { Terminal, ShieldCheck, Key, Webhook, CreditCard, Send, ArrowRight } from "lucide-react";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Documentation & Meta API Setup Guide — DIGISOLVNET WaCRM",
  description:
    "Step-by-step setup guide for connecting Meta WhatsApp Business Cloud API, Webhooks, Razorpay payments, and template approval in DIGISOLVNET WaCRM.",
};

export default function DocsPage() {
  const steps = [
    {
      num: "1",
      title: "Prerequisites & Phone Number Selection",
      icon: Terminal,
      content:
        "Ensure you have a Meta for Developers account (developers.facebook.com) and a Meta Business Portfolio. You will need a phone number that is not currently registered on regular WhatsApp or WhatsApp Business mobile apps.",
    },
    {
      num: "2",
      title: "Retrieve Meta Cloud API Credentials",
      icon: Key,
      content:
        "Inside your Meta App dashboard under WhatsApp → API Setup, note down your Phone Number ID, WhatsApp Business Account ID (WABA ID), and generate a Permanent System User Access Token with 'whatsapp_business_messaging' and 'whatsapp_business_management' permissions.",
    },
    {
      num: "3",
      title: "Enter Credentials into WaCRM Settings",
      icon: ShieldCheck,
      content:
        "Log into your DIGISOLVNET WaCRM dashboard and navigate to Settings → WhatsApp. Paste your Phone Number ID, WABA ID, and System User Token. Your token is automatically encrypted with AES-256-GCM before database storage.",
    },
    {
      num: "4",
      title: "Configure Webhooks in Meta Dashboard",
      icon: Webhook,
      content:
        "In Meta App Dashboard → WhatsApp → Configuration, set your Callback URL to: 'https://your-crm-domain.com/api/whatsapp/webhook'. Set your Verify Token to match the verify token displayed in your WaCRM Settings. Subscribe to the 'messages' and 'message_template_status_update' webhook fields.",
    },
    {
      num: "5",
      title: "Connect Razorpay for In-Chat Payment Links",
      icon: CreditCard,
      content:
        "Go to Settings → Payments & Razorpay in WaCRM. Paste your Razorpay Key ID and Key Secret from your Razorpay Dashboard (Settings → API Keys). In Razorpay Webhooks, add your webhook URL to receive 'payment_link.paid' and 'order.paid' events.",
    },
    {
      num: "6",
      title: "Send Test Message & Launch Live Conversations",
      icon: Send,
      content:
        "Open the WaCRM Inbox. Send a test message or template to your own phone number. Tap an interactive button or reply to verify that incoming webhook messages appear in real-time.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-emerald-500/20 selection:text-emerald-500">
      <MarketingNavbar />
      <main className="flex-1 py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header */}
          <div className="space-y-4 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold uppercase tracking-wider">
              Setup & Configuration
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              Official WhatsApp Cloud API Quickstart
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Follow this step-by-step technical walkthrough to connect your official WhatsApp Business number and start receiving customer messages.
            </p>
          </div>

          {/* Steps List */}
          <div className="space-y-6 pt-4">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center font-bold text-xs">
                      {step.num}
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-muted text-foreground flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h2 className="text-base font-bold text-foreground">
                      {step.title}
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-11">
                    {step.content}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Help Box */}
          <div className="p-8 rounded-3xl border border-border bg-card/60 backdrop-blur-sm text-center space-y-4">
            <h3 className="text-xl font-bold text-foreground">
              Need Assistance with Meta Verification?
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Our support team can assist you with Meta Business Portfolio verification, green tick badge applications, and template review guidelines.
            </p>
            <div className="pt-2">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 transition-colors shadow-sm"
              >
                Request Onboarding Help
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
