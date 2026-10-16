"use client";

import {
  MessageSquare,
  Users,
  Tag,
  Clock,
  Send,
  Bot,
  BrainCircuit,
  CreditCard,
  Kanban,
  BarChart3,
  Workflow,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export function FeaturesSection() {
  const features = [
    {
      icon: MessageSquare,
      title: "Multi-Agent Shared Inbox",
      badge: "Real-time",
      description:
        "Connect your official WhatsApp Business number and let your entire sales and support team collaborate in one central place with real-time sync, internal notes, and agent assignments.",
      available: true,
    },
    {
      icon: Users,
      title: "Contact Management & 360° Profiles",
      badge: "Included",
      description:
        "Maintain clean customer profiles with conversation history, custom fields, lifetime transaction values, and automatic duplicate detection to keep your database pristine.",
      available: true,
    },
    {
      icon: Tag,
      title: "Smart Labels & Segmentation",
      badge: "Organized",
      description:
        "Categorize leads and customers by VIP, Wholesale, Due Payment, or New Inquiry. Filter contacts instantly to launch targeted campaigns.",
      available: true,
    },
    {
      icon: Clock,
      title: "Automated Customer Follow-ups",
      badge: "No-code",
      description:
        "Never drop a lead again. Configure delayed check-ins, payment reminder alerts, and appointment confirmations that trigger automatically based on deal stage changes.",
      available: true,
    },
    {
      icon: Send,
      title: "Broadcast Campaigns (Official Meta Rules)",
      badge: "Meta Compliant",
      description:
        "Send personalized broadcast notifications using Meta-approved pre-registered message templates. Built-in compliance checks protect your quality rating and avoid bans.",
      available: true,
    },
    {
      icon: Bot,
      title: "Visual No-Code Chatbot Flow Designer",
      badge: "Drag & Drop",
      description:
        "Build multi-step interactive conversation journeys with buttons, list pickers, conditional branches, and keyword triggers using our visual React Flow canvas.",
      available: true,
    },
    {
      icon: BrainCircuit,
      title: "AI Knowledge Base & Smart Assistant",
      badge: "BYO Key",
      description:
        "Empower your agents with AI draft generation and automated replies grounded in your company's indexed documents, with seamless fallback to human agents.",
      available: true,
    },
    {
      icon: CreditCard,
      title: "Instant In-Chat Razorpay Payment Links",
      badge: "UPI & Cards",
      description:
        "Generate and send Razorpay payment links straight from the chat thread. Real-time HMAC-verified webhook updates mark deals as paid and trigger order receipts instantly.",
      available: true,
    },
    {
      icon: Kanban,
      title: "Visual Kanban Sales Pipelines",
      badge: "Drag & Drop",
      description:
        "Track deals from initial inquiry to final delivery across customizable pipeline stages. Monitor pipeline revenue velocity and identify bottlenecks at a glance.",
      available: true,
    },
    {
      icon: BarChart3,
      title: "Live CRM & Campaign Analytics",
      badge: "Telemetry",
      description:
        "Measure incoming vs outgoing message volumes, agent response latencies, broadcast delivery read-rates, and monthly recurring revenue across workspaces.",
      available: true,
    },
    {
      icon: Workflow,
      title: "Automations & Webhook Engine",
      badge: "Triggers",
      description:
        "Connect CRM events to your internal systems via outbound webhooks. Trigger automatic tag addition, stage movements, and contact syncs with loop-prevention guards.",
      available: true,
    },
    {
      icon: Sparkles,
      title: "Voice Note Speech-to-Text & Catalog",
      badge: "Coming Soon",
      description:
        "Upcoming: Automated voice note transcription for incoming audio clips and native in-app WhatsApp catalog browsing for direct inventory purchases.",
      available: false,
      comingSoon: true,
    },
  ];

  return (
    <section id="features" className="py-20 lg:py-28 bg-card/20 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold uppercase tracking-wider">
            Enterprise Architecture
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Everything You Need to Sell, Serve & Scale on WhatsApp
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Built on official Meta WhatsApp Cloud API standards, Supabase Row Level Security, and enterprise-grade payment infrastructure.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className={`relative flex flex-col justify-between p-6 rounded-2xl border transition-all duration-200 ${
                  feature.comingSoon
                    ? "border-border/60 bg-muted/20 opacity-80"
                    : "border-border bg-card/80 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                        feature.comingSoon
                          ? "bg-muted text-muted-foreground border-border"
                          : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        feature.comingSoon
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                          : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      }`}
                    >
                      {feature.badge}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>

                {feature.comingSoon && (
                  <div className="mt-4 pt-3 border-t border-border/50 text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>In active development on our product roadmap.</span>
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
