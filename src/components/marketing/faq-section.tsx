"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

export function FaqSection() {
  const faqs = [
    {
      q: "What is DIGISOLVNET WaCRM and how does it connect to WhatsApp?",
      a: "DIGISOLVNET WaCRM connects directly to the official Meta WhatsApp Business Cloud API (v21.0+). Unlike unofficial browser-automation or QR-code scraping bots that risk permanent phone number bans, our solution connects through Meta's approved infrastructure, ensuring high delivery speed, zero ban risks, and support for interactive message buttons.",
    },
    {
      q: "What are the phone number requirements to get started?",
      a: "You need a phone number that is not currently active on consumer WhatsApp or the WhatsApp Business mobile app. You can either use a fresh virtual/SIM number, or permanently delete the WhatsApp account from an existing SIM before registering it on Meta's Cloud API. Landline and toll-free numbers are also fully supported via voice-call OTP verification.",
    },
    {
      q: "How does billing and subscription renewal work?",
      a: "Your DIGISOLVNET WaCRM plan covers your CRM software license, shared team inbox seats, visual flow builder, and database hosting. We send automated WhatsApp and email reminders 3 days, 1 day, and on the day of subscription expiry with an instant renewal link. You can renew seamlessly via UPI, credit/debit cards, or net banking.",
    },
    {
      q: "Are Meta WhatsApp conversation fees included?",
      a: "Meta charges per-conversation fees directly through your Meta Business Manager payment method based on your country and category (Service vs Marketing vs Utility). Customer-initiated service chats within a 24-hour window are free or low-cost, while business-initiated broadcast templates are billed at Meta's standard public rates. DIGISOLVNET adds zero markup on Meta's fees.",
    },
    {
      q: "Who owns my customer data and chat history?",
      a: "You own 100% of your data. All customer contacts, tags, conversation logs, deal pipelines, and payment records reside inside your isolated Supabase Postgres database protected by Row Level Security (RLS). We never sell, share, or inspect your tenant database.",
    },
    {
      q: "How do in-chat Razorpay payment links work?",
      a: "You simply connect your own Razorpay Key ID and Secret in your workspace Settings. When chatting with a customer, agents or bot flows can generate an official Razorpay payment link. When the customer pays via UPI (PhonePe, GPay, Paytm) or card, an HMAC-verified webhook automatically marks the order as paid in real-time.",
    },
    {
      q: "Can I cancel my subscription? What is the refund policy?",
      a: "Yes, you can cancel your subscription at any time without long-term lock-in. We offer a 7-day full-featured free trial so you can thoroughly test the platform before committing. Monthly subscription renewals are non-refundable once the billing period has commenced, as outlined in our Refund and Cancellation Policy.",
    },
    {
      q: "What kind of support is included?",
      a: "Starter plans include email support with a 48-hour response window. Professional plans include priority WhatsApp support with a 12-hour turnaround. Business Scale plans include a dedicated account manager and assistance with Meta Business Manager verification and WhatsApp template approvals.",
    },
  ];

  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 lg:py-28 bg-background border-t border-border">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold uppercase tracking-wider">
            Clear Answers
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-base text-muted-foreground">
            Everything you need to know about the official WhatsApp Cloud API, setup, numbers, and billing.
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full py-5 px-6 flex items-center justify-between text-left gap-4 hover:bg-muted/30 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-bold text-foreground">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-emerald-500" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-sm text-muted-foreground leading-relaxed border-t border-border/40">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
