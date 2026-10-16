"use client";

import {
  QrCode,
  MessageCircle,
  ShoppingBag,
  FileCheck2,
  CreditCard,
  Truck,
  Repeat,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export function WorkflowSection() {
  const steps = [
    {
      step: "01",
      title: "Discovery & Inbound",
      icon: QrCode,
      tag: "Lead Capture",
      description:
        "Prospects discover you via website Click-to-WhatsApp widgets, Instagram/Facebook ads, or in-store QR codes and initiate a conversation with a single tap.",
    },
    {
      step: "02",
      title: "Instant Triage & Conversation",
      icon: MessageCircle,
      tag: "Zero Delay",
      description:
        "Our 24/7 visual chatbot flow greets the user immediately, answers common FAQs, and routes complex inquiries to the appropriate team agent.",
    },
    {
      step: "03",
      title: "Product / Service Selection",
      icon: ShoppingBag,
      tag: "Interactive UI",
      description:
        "Share interactive WhatsApp button menus, product PDFs, or price lists directly within the thread so the customer can pick their desired package.",
    },
    {
      step: "04",
      title: "Deal & Order Creation",
      icon: FileCheck2,
      tag: "Kanban Sync",
      description:
        "The agent records customer details, attaches order line items, and moves the deal into 'Payment Pending' on the visual Kanban sales pipeline.",
    },
    {
      step: "05",
      title: "Instant In-Chat Payment",
      icon: CreditCard,
      tag: "Razorpay / UPI",
      description:
        "Generate a secure Razorpay payment link directly from the chat. Customers pay in seconds via GPay, PhonePe, Paytm, Cards, or NetBanking without leaving WhatsApp.",
    },
    {
      step: "06",
      title: "Automated Fulfilment & Tracking",
      icon: Truck,
      tag: "Real-time Webhook",
      description:
        "The HMAC-verified Razorpay webhook automatically marks the order as paid, generates a digital receipt in the inbox, and dispatches tracking details.",
    },
    {
      step: "07",
      title: "Review & Repeat Purchases",
      icon: Repeat,
      tag: "Retention Loop",
      description:
        "Post-delivery automation checks in for customer ratings, handles warranty questions, and enrolls happy buyers into seasonal loyalty broadcasts.",
    },
  ];

  return (
    <section id="workflow" className="py-20 lg:py-28 bg-card/20 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold uppercase tracking-wider">
            End-To-End Journey
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            The Complete WhatsApp Sales & Order Lifecycle
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            See how lead discovery seamlessly converts into confirmed orders, instant payments, and automated customer retention.
          </p>
        </div>

        {/* Workflow Timeline Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="relative p-6 rounded-2xl border border-border bg-card shadow-sm hover:border-emerald-500/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-muted-foreground/30 font-mono">
                      {item.step}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {item.tag}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-foreground">
                      {item.title}
                    </h3>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-muted-foreground/40">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Final Callout Card */}
          <div className="p-6 rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 via-card to-background flex flex-col justify-center items-center text-center space-y-3 shadow-md">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-foreground">
              Ready to automate your WhatsApp sales cycle?
            </h4>
            <p className="text-xs text-muted-foreground max-w-xs">
              Connect your Meta Cloud API number and start processing customer conversations today.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
