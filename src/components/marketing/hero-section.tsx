"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, CheckCircle2, Shield, MessageSquare, CreditCard, Users, Zap } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32 bg-gradient-to-b from-background via-background/95 to-card/30">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold tracking-wide shadow-sm animate-pulse">
            <Shield className="w-3.5 h-3.5" />
            <span>Official Meta WhatsApp Cloud API (v21.0+) Compliant</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Turn WhatsApp into Your Highest-Converting{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400">
              Sales Engine
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Stop losing leads in messy personal chats. Unify team messaging, automate 24/7 customer follow-ups, organize Kanban deals, and collect payments directly inside WhatsApp.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Link
              href="/pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-semibold px-6 py-3.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Start 7-Day Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-semibold px-6 py-3.5 rounded-xl border border-border bg-card/80 backdrop-blur hover:bg-accent text-foreground transition-all shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              Explore Interactive Demo
            </Link>
          </div>

          {/* Value Props Bullet points */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Zero Unofficial Bans</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Multi-Agent Shared Inbox</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Razorpay UPI Payment Links</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>No-Code Visual Bot Flows</span>
            </div>
          </div>
        </div>

        {/* Real Product UI Mockup / Showcase */}
        <div className="mt-12 lg:mt-16 relative mx-auto max-w-5xl rounded-2xl border border-border/70 bg-card/90 shadow-2xl overflow-hidden backdrop-blur-sm">
          {/* Mock Browser Header */}
          <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-muted/40">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="text-xs font-mono px-3 py-1 rounded-md bg-background/70 border border-border/50 text-muted-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>https://crm.digisolvnet.com/inbox</span>
            </div>
            <div className="text-[11px] text-muted-foreground font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Live Workspace
            </div>
          </div>

          {/* CRM Interface Simulation */}
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[460px] bg-background">
            {/* Sidebar / Conversation List (4 cols) */}
            <div className="md:col-span-4 border-r border-border p-3 space-y-2 bg-muted/10">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Active Chats (3)
                </span>
                <span className="text-[10px] font-medium bg-emerald-500/15 text-emerald-500 px-1.5 py-0.5 rounded-full">
                  Meta v21 Connected
                </span>
              </div>

              {/* Chat Card 1 (Active) */}
              <div className="p-2.5 rounded-xl bg-card border border-emerald-500/40 shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Vikram Sharma</span>
                  <span className="text-[10px] text-muted-foreground">Just now</span>
                </div>
                <p className="text-[11px] text-foreground font-medium truncate">
                  "Please send payment link for Diwali Decorative Lights pack"
                </p>
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
                    VIP Retailer
                  </span>
                  <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-500 border border-amber-500/20">
                    Deal: ₹4,500
                  </span>
                </div>
              </div>

              {/* Chat Card 2 */}
              <div className="p-2.5 rounded-xl border border-border/50 hover:bg-muted/40 transition-colors space-y-1 opacity-70">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">Priya Patel</span>
                  <span className="text-[10px] text-muted-foreground">12m ago</span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  "Thanks, the order delivery tracking details received."
                </p>
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-500">
                    Fulfilled
                  </span>
                </div>
              </div>

              {/* Chat Card 3 */}
              <div className="p-2.5 rounded-xl border border-border/50 hover:bg-muted/40 transition-colors space-y-1 opacity-70">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">Rohan Mehta</span>
                  <span className="text-[10px] text-muted-foreground">1h ago</span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  "Bot answered catalog questions. Asking for human agent."
                </p>
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-500">
                    AI Auto-Handled
                  </span>
                </div>
              </div>
            </div>

            {/* Chat Conversation View (5 cols) */}
            <div className="md:col-span-5 p-4 flex flex-col justify-between border-r border-border bg-card/20">
              <div className="space-y-3">
                {/* Incoming Message */}
                <div className="flex flex-col items-start space-y-1 max-w-[85%]">
                  <div className="p-3 rounded-2xl rounded-tl-sm bg-muted text-xs text-foreground leading-relaxed shadow-sm">
                    Hi! I need 5 units of the Premium Fairy Lights & 2 Laser Curtain sets. What is the total?
                  </div>
                  <span className="text-[9px] text-muted-foreground pl-1">10:42 AM</span>
                </div>

                {/* Outgoing Bot / Agent Message */}
                <div className="flex flex-col items-end space-y-1 ml-auto max-w-[88%]">
                  <div className="p-3 rounded-2xl rounded-tr-sm bg-emerald-600 text-white text-xs leading-relaxed shadow-sm">
                    Hello Vikram! That comes to ₹4,500 with our festival 15% discount applied. Generating your instant payment link now!
                  </div>
                  <span className="text-[9px] text-muted-foreground pr-1">10:43 AM • Delivered</span>
                </div>

                {/* In-Chat Razorpay Payment Card */}
                <div className="ml-auto w-full max-w-[90%] p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-950/20 dark:bg-emerald-950/40 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span className="flex items-center gap-1.5 text-emerald-500">
                      <CreditCard className="w-4 h-4" />
                      Razorpay Payment Link
                    </span>
                    <span className="text-xs text-foreground font-extrabold">₹4,500.00</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Order #DIGI-9421 • Supports UPI, GPay, PhonePe, Cards & NetBanking.
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30">
                      Status: Active Link
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">rzp.io/i/9421</span>
                  </div>
                </div>
              </div>

              {/* Chat Input Bar */}
              <div className="pt-3 border-t border-border mt-3 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a message or select quick template..."
                  className="flex-1 text-xs bg-muted/60 border border-border/80 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  readOnly
                  value="Payment received notification queued"
                />
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                >
                  Send
                </button>
              </div>
            </div>

            {/* Right Panel: Lead & Deal Context (3 cols) */}
            <div className="hidden md:flex md:col-span-3 p-4 flex-col gap-4 bg-muted/5 text-xs">
              <div className="space-y-1 border-b border-border pb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Contact Insights
                </span>
                <div className="text-sm font-bold text-foreground">Vikram Sharma</div>
                <div className="text-[11px] text-muted-foreground">+91 98765 43210</div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Kanban Deal Stage
                </span>
                <div className="p-2 rounded-lg border border-border bg-card space-y-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Diwali Bulk Order</span>
                    <span className="text-emerald-500 font-bold">₹4,500</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">Stage: Ready for Payment</div>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Assigned Team Member
                </span>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-[10px]">
                    A
                  </div>
                  <span className="text-[11px] font-medium text-foreground">Agent Rahul (Online)</span>
                </div>
              </div>

              <div className="mt-auto p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-600 dark:text-emerald-400">
                ⚡ Automated WhatsApp reminder scheduled 24h before expiry.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
