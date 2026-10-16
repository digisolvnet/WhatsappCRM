"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";

export function CtaBanner() {
  return (
    <section className="py-16 lg:py-24 bg-gradient-to-br from-emerald-950/40 via-card to-background border-t border-border">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" />
          Zero Setup Friction
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight">
          Ready to Upgrade Your WhatsApp Business Operations?
        </h2>

        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Join modern brands and retailers using DIGISOLVNET WaCRM to automate leads, collaborate across team agents, and collect instant UPI payments.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/pricing"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-semibold px-8 py-4 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 shadow-xl shadow-emerald-600/20 transition-all hover:scale-[1.02]"
          >
            Start Your 7-Day Free Trial
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-semibold px-8 py-4 rounded-xl border border-border bg-card hover:bg-accent text-foreground transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            Launch Live Interactive Demo
          </Link>
        </div>
      </div>
    </section>
  );
}
