"use client";

import { useState } from "react";
import { Store, ShoppingBag, Stethoscope, GraduationCap, Building2, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

export function UseCasesSection() {
  const useCases = [
    {
      id: "retail",
      title: "Retail Shops & Local Stores",
      icon: Store,
      badge: "Local Commerce",
      tagline: "Turn local foot traffic and festive inquiries into loyal, paying repeat customers.",
      challenges: [
        "Losing customer numbers on personal staff phones when staff leaves.",
        "Manual calculation of festive discounts, product options, and order receipts.",
        "Delay in collecting cash or sharing QR codes manually.",
      ],
      solutions: [
        "Single official WhatsApp number used simultaneously across all cashiers and sales assistants.",
        "Instant in-chat Razorpay payment links supporting UPI apps (PhonePe, GPay, Paytm).",
        "Automated customer tagging (VIP, Festive Shopper, Wholesale) for seasonal broadcasts.",
      ],
      highlight: "Perfect for electronics, clothing boutiques, jewelry, festive lights, and grocery outlets.",
    },
    {
      id: "ecommerce",
      title: "D2C Brands & E-Commerce",
      icon: ShoppingBag,
      badge: "High Velocity",
      tagline: "Recover abandoned checkout inquiries and automate post-purchase delivery updates.",
      challenges: [
        "High customer acquisition cost with low conversion on static website forms.",
        "Customer support tickets delayed due to disconnected email channels.",
        "Lack of interactive communication during transit and delivery.",
      ],
      solutions: [
        "Click-to-WhatsApp ads route directly into CRM inbox with pre-filled product SKU questions.",
        "Interactive chatbot flows answer common sizing, warranty, and return inquiries 24/7.",
        "Automated order confirmation and dispatch notification templates sent instantly.",
      ],
      highlight: "Boosts conversion rates by up to 3x compared to slow traditional email marketing.",
    },
    {
      id: "services",
      title: "Clinics, Salons & Service Providers",
      icon: Stethoscope,
      badge: "Appointments",
      tagline: "Automate appointment booking reminders and collect consultation fee deposits.",
      challenges: [
        "Patients or clients missing appointments without prior cancellation notice.",
        "Receptionists overwhelmed by repeated questions about pricing and timings.",
        "Unpaid consultation invoices requiring uncomfortable manual follow-up calls.",
      ],
      solutions: [
        "Interactive appointment confirmation buttons ('Confirm', 'Reschedule', 'Cancel').",
        "Automated payment reminders sent 24 hours prior with instant advance fee link.",
        "Detailed client history notes attached to customer profiles for team visibility.",
      ],
      highlight: "Eliminates no-shows and streamlines front-desk administrative overhead.",
    },
    {
      id: "coaching",
      title: "Coaching Institutes & Educators",
      icon: GraduationCap,
      badge: "Education & EdTech",
      tagline: "Streamline student admissions, batch timetable broadcasts, and monthly tuition dues.",
      challenges: [
        "Inquiries from parents getting lost across multiple counsellor numbers.",
        "Difficulty in broadcasting exam schedules and timetable changes reliably.",
        "Fee collection delays requiring days of manual accounting and reminder calls.",
      ],
      solutions: [
        "Lead capture from webinars and social campaigns into visual Kanban admission pipelines.",
        "Batch-segmented broadcast messages with 98%+ open rates within 15 minutes.",
        "Automated monthly tuition payment links with automated payment confirmation receipts.",
      ],
      highlight: "Built for tuition centres, test-prep institutes, language schools, and fitness coaches.",
    },
    {
      id: "realestate",
      title: "Real Estate & B2B Agencies",
      icon: Building2,
      badge: "High Ticket Deals",
      tagline: "Organize high-value buyer leads, schedule property site visits, and close faster.",
      challenges: [
        "High-ticket inquiries neglected due to lack of structured deal stage tracking.",
        "Brochures, site photos, and floor plans sent haphazardly across personal chats.",
        "No audit trail of which property consultant spoke with which prospective buyer.",
      ],
      solutions: [
        "Custom pipeline stages: New Lead → Site Visit Booked → Negotiation → Token Paid.",
        "Instant brochure delivery via interactive PDF media templates.",
        "Conversation assignment to dedicated property consultants with activity audit logs.",
      ],
      highlight: "Essential for developers, brokers, creative agencies, and IT service providers.",
    },
  ];

  const [activeTab, setActiveTab] = useState(useCases[0].id);
  const activeCase = useCases.find((c) => c.id === activeTab) || useCases[0];
  const ActiveIcon = activeCase.icon;

  return (
    <section id="use-cases" className="py-20 lg:py-28 bg-background border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold uppercase tracking-wider">
            Tailored For Growth
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Built for Modern Businesses That Sell via WhatsApp
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            See how different industries use DIGISOLVNET WaCRM to automate sales, eliminate chaos, and drive revenue.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {useCases.map((uc) => {
            const Icon = uc.icon;
            const isSelected = activeTab === uc.id;
            return (
              <button
                key={uc.id}
                type="button"
                onClick={() => setActiveTab(uc.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isSelected
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{uc.title}</span>
              </button>
            );
          })}
        </div>

        {/* Active Use Case Card */}
        <div className="p-8 lg:p-12 rounded-3xl border border-border bg-card/60 backdrop-blur-sm shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-border pb-8">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <ActiveIcon className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                    {activeCase.badge}
                  </span>
                  <h3 className="text-2xl font-bold text-foreground">
                    {activeCase.title}
                  </h3>
                </div>
              </div>
              <p className="text-base text-muted-foreground pt-1">
                {activeCase.tagline}
              </p>
            </div>

            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 transition-colors shadow-sm self-start lg:self-center"
            >
              Get Started for {activeCase.title.split(" ")[0]}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
            {/* Common Bottlenecks */}
            <div className="space-y-4 p-6 rounded-2xl bg-destructive/5 border border-destructive/20">
              <h4 className="text-sm font-bold uppercase tracking-wider text-destructive flex items-center gap-2">
                <span>The Traditional Problem</span>
              </h4>
              <ul className="space-y-3">
                {activeCase.challenges.map((challenge, cIdx) => (
                  <li key={cIdx} className="text-sm text-foreground/80 flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                    <span>{challenge}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* DIGISOLVNET WaCRM Solution */}
            <div className="space-y-4 p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
              <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-2">
                <span>The DIGISOLVNET WaCRM Solution</span>
              </h4>
              <ul className="space-y-3">
                {activeCase.solutions.map((solution, sIdx) => (
                  <li key={sIdx} className="text-sm text-foreground/90 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{solution}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 p-4 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground text-center">
            💡 <strong className="text-foreground">Industry Fit:</strong> {activeCase.highlight}
          </div>
        </div>
      </div>
    </section>
  );
}
