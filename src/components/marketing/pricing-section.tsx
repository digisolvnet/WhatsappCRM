"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";
import {
  PRICING_PLANS,
  ANNUAL_DISCOUNT_PERCENTAGE,
  type PricingPlan,
} from "@/lib/plans/config";

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");

  return (
    <section id="pricing" className="py-20 lg:py-28 bg-background border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold uppercase tracking-wider">
            Simple, Transparent Pricing
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Plans That Scale With Your Conversation Volume
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            All plans include full access to the official Meta WhatsApp Cloud API connection with zero markups on Meta utility fees.
          </p>

          {/* Controls: Billing Cycle + Currency Toggle */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            {/* Billing Cycle Switch */}
            <div className="flex items-center p-1 rounded-xl bg-muted/60 border border-border">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  billingCycle === "monthly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("annual")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  billingCycle === "annual"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Annual Billing</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-400 text-emerald-950 font-bold">
                  Save {ANNUAL_DISCOUNT_PERCENTAGE}%
                </span>
              </button>
            </div>

            {/* Currency Switch */}
            <div className="flex items-center p-1 rounded-xl bg-muted/60 border border-border">
              <button
                type="button"
                onClick={() => setCurrency("INR")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currency === "INR"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                ₹ INR
              </button>
              <button
                type="button"
                onClick={() => setCurrency("USD")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currency === "USD"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                $ USD
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {PRICING_PLANS.map((plan) => {
            const price =
              billingCycle === "annual"
                ? plan.pricing[currency].annual
                : plan.pricing[currency].monthly;

            const symbol = currency === "INR" ? "₹" : "$";

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between p-8 rounded-3xl border transition-all ${
                  plan.popular
                    ? "border-emerald-500 bg-card shadow-2xl shadow-emerald-500/10 ring-2 ring-emerald-500/30"
                    : "border-border bg-card/60 hover:border-border/80"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Most Popular</span>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Title & Tagline */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-foreground">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-muted-foreground min-h-[32px] leading-relaxed">
                      {plan.tagline}
                    </p>
                  </div>

                  {/* Pricing Block */}
                  <div className="space-y-1 pb-4 border-b border-border">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold tracking-tight text-foreground">
                        {symbol}
                        {price.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        / month
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {billingCycle === "annual"
                        ? `Billed annually (${symbol}${(price * 12).toLocaleString()}/yr)`
                        : "Billed monthly, cancel anytime"}
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 pt-1">
                      Includes {plan.trialDays}-day full-featured free trial
                    </div>
                  </div>

                  {/* Entitlement Limits Summary */}
                  <div className="space-y-2 bg-muted/40 p-3 rounded-xl border border-border/60 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Team Seats:</span>
                      <span className="font-semibold text-foreground">{plan.limits.teamMembers}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Contacts:</span>
                      <span className="font-semibold text-foreground">{plan.limits.contacts}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Broadcasts:</span>
                      <span className="font-semibold text-foreground">{plan.limits.broadcastsPerMonth}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Bot Flows:</span>
                      <span className="font-semibold text-foreground">{plan.limits.flows}</span>
                    </div>
                  </div>

                  {/* Highlights Bullet List */}
                  <div className="space-y-2.5 pt-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Features Included:
                    </span>
                    <ul className="space-y-2.5 text-xs">
                      {plan.highlightFeatures.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2 text-foreground/90">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Primary Purchase Journey CTA (Non-payment sign-up flow) */}
                <div className="pt-8">
                  <Link
                    href={`/signup?plan=${plan.id}&billing=${billingCycle}&currency=${currency}`}
                    className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all shadow-sm ${
                      plan.popular
                        ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/20"
                        : "bg-muted/80 text-foreground hover:bg-accent border border-border"
                    }`}
                  >
                    <span>Start {plan.trialDays}-Day Free Trial</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <p className="text-[10px] text-center text-muted-foreground pt-2">
                    No credit card required to start trial.
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security & Ownership Disclaimer */}
        <div className="mt-12 p-4 rounded-2xl bg-card border border-border/80 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>
              <strong>100% Data Privacy & Ownership:</strong> Your customer phone numbers, chat logs, and financial records reside exclusively in your isolated Supabase tenant.
            </span>
          </div>
          <Link
            href="/subscription-policy"
            className="text-emerald-500 hover:underline shrink-0 font-medium"
          >
            Review Subscription Policy →
          </Link>
        </div>
      </div>
    </section>
  );
}
