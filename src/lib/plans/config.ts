// ============================================================
// Server-side & Client-safe Single Source of Truth for Plan Config
// Configurable plan definitions, currency, pricing and entitlements.
// ============================================================

export interface PlanFeature {
  name: string;
  included: boolean | string;
  tooltip?: string;
  comingSoon?: boolean;
}

export interface PlanCategory {
  category: string;
  features: {
    name: string;
    starter: boolean | string;
    pro: boolean | string;
    enterprise: boolean | string;
    comingSoon?: boolean;
    note?: string;
  }[];
}

export interface PricingPlan {
  id: "starter" | "pro" | "enterprise";
  name: string;
  tagline: string;
  popular?: boolean;
  pricing: {
    INR: {
      monthly: number;
      annual: number; // per month billed annually
    };
    USD: {
      monthly: number;
      annual: number; // per month billed annually
    };
  };
  trialDays: number;
  highlightFeatures: string[];
  limits: {
    teamMembers: string;
    contacts: string;
    broadcastsPerMonth: string;
    flows: string;
    paymentLinks: string;
    aiResponses: string;
  };
}

export const ANNUAL_DISCOUNT_PERCENTAGE = 20;

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter Growth",
    tagline: "Essential WhatsApp CRM & shared inbox for small retailers and local businesses.",
    popular: false,
    pricing: {
      INR: {
        monthly: 999,
        annual: 799,
      },
      USD: {
        monthly: 19,
        annual: 15,
      },
    },
    trialDays: 7,
    highlightFeatures: [
      "Official Meta WhatsApp Cloud API connection",
      "Shared Team Inbox (Up to 2 team members)",
      "Up to 2,500 active customer contacts",
      "Customer tags, notes & lifecycle stages",
      "Deal Pipelines & visual Kanban sales board",
      "In-Chat Razorpay payment links",
      "Pre-approved template messaging",
    ],
    limits: {
      teamMembers: "2 Team Agents",
      contacts: "2,500 Contacts",
      broadcastsPerMonth: "5 Campaigns / mo",
      flows: "3 Automation Flows",
      paymentLinks: "Unlimited",
      aiResponses: "500 AI Assistant replies / mo",
    },
  },
  {
    id: "pro",
    name: "Professional",
    tagline: "High-velocity sales, multi-agent inbox, and visual bot automation for growing brands.",
    popular: true,
    pricing: {
      INR: {
        monthly: 2499,
        annual: 1999,
      },
      USD: {
        monthly: 49,
        annual: 39,
      },
    },
    trialDays: 7,
    highlightFeatures: [
      "Everything in Starter, plus:",
      "Shared Team Inbox for 5 team members",
      "Up to 15,000 active customer contacts",
      "Visual drag-and-drop Flow builder",
      "Unlimited sales pipelines & stages",
      "AI Knowledge Base with vector document search",
      "Broadcast campaigns with recipient segmentation",
      "Webhook & developer API keys access",
    ],
    limits: {
      teamMembers: "5 Team Agents",
      contacts: "15,000 Contacts",
      broadcastsPerMonth: "25 Campaigns / mo",
      flows: "15 Automation Flows",
      paymentLinks: "Unlimited",
      aiResponses: "3,000 AI Assistant replies / mo",
    },
  },
  {
    id: "enterprise",
    name: "Business Scale",
    tagline: "Unlimited volume, priority routing, custom webhooks, and enterprise support.",
    popular: false,
    pricing: {
      INR: {
        monthly: 5999,
        annual: 4799,
      },
      USD: {
        monthly: 99,
        annual: 79,
      },
    },
    trialDays: 14,
    highlightFeatures: [
      "Everything in Professional, plus:",
      "Up to 20 team members with role-based permissions",
      "Up to 100,000 customer contacts",
      "Unlimited visual automation flows & triggers",
      "Priority WhatsApp message delivery pipeline",
      "Dedicated account onboarding & WhatsApp template approval help",
      "Custom webhook endpoints & API integration",
    ],
    limits: {
      teamMembers: "20 Team Agents",
      contacts: "100,000 Contacts",
      broadcastsPerMonth: "Unlimited",
      flows: "Unlimited",
      paymentLinks: "Unlimited",
      aiResponses: "15,000 AI Assistant replies / mo",
    },
  },
];

export const FEATURE_COMPARISON_CATEGORIES: PlanCategory[] = [
  {
    category: "WhatsApp Cloud API & Messaging",
    features: [
      {
        name: "Official Meta WhatsApp Cloud API (v21.0+)",
        starter: true,
        pro: true,
        enterprise: true,
        note: "Direct connection with Meta — zero unofficial bans",
      },
      {
        name: "Shared Team Inbox & Multi-Agent Collaboration",
        starter: "2 Agents",
        pro: "5 Agents",
        enterprise: "20 Agents",
      },
      {
        name: "Inbound Media Mirroring (Images, Voice, PDFs)",
        starter: true,
        pro: true,
        enterprise: true,
      },
      {
        name: "Template Message Sync & Submission to Meta",
        starter: true,
        pro: true,
        enterprise: true,
      },
      {
        name: "Interactive Messages (Buttons, Lists, Quick Replies)",
        starter: true,
        pro: true,
        enterprise: true,
      },
      {
        name: "Multi-Number Rotation / WABA Pooling",
        starter: false,
        pro: false,
        enterprise: false,
        comingSoon: true,
        note: "Roadmap: Automated failover across multiple phone numbers",
      },
    ],
  },
  {
    category: "CRM, Contacts & Pipeline Management",
    features: [
      {
        name: "Contact Capacity",
        starter: "2,500",
        pro: "15,000",
        enterprise: "100,000",
      },
      {
        name: "Customer Tagging, Custom Fields & Notes",
        starter: true,
        pro: true,
        enterprise: true,
      },
      {
        name: "Visual Kanban Sales Pipelines",
        starter: "1 Pipeline",
        pro: "Unlimited",
        enterprise: "Unlimited",
      },
      {
        name: "CSV Import & Export with Duplicate Detection",
        starter: true,
        pro: true,
        enterprise: true,
      },
      {
        name: "Internal Team Mentions & Conversation Assignment",
        starter: true,
        pro: true,
        enterprise: true,
      },
    ],
  },
  {
    category: "Payments & Order Transactions",
    features: [
      {
        name: "Razorpay In-Chat Payment Links (UPI, Cards, NetBanking)",
        starter: true,
        pro: true,
        enterprise: true,
      },
      {
        name: "Real-time Payment Webhook Verification (HMAC-SHA256)",
        starter: true,
        pro: true,
        enterprise: true,
      },
      {
        name: "In-Inbox Payment Receipt & Status Tracking",
        starter: true,
        pro: true,
        enterprise: true,
      },
      {
        name: "Direct WhatsApp Native Commerce Catalog Checkout",
        starter: false,
        pro: false,
        enterprise: false,
        comingSoon: true,
        note: "Roadmap: WhatsApp Native In-App Catalog Checkout",
      },
    ],
  },
  {
    category: "Automation, Flows & AI Assistant",
    features: [
      {
        name: "Visual No-Code Flow Builder (React Flow)",
        starter: "3 Flows",
        pro: "15 Flows",
        enterprise: "Unlimited",
      },
      {
        name: "Event-based Automation Rules (Tags, Stages, Keywords)",
        starter: true,
        pro: true,
        enterprise: true,
      },
      {
        name: "AI Auto-Reply & Smart Reply Drafter",
        starter: "Basic",
        pro: "Advanced + Knowledge Base",
        enterprise: "Custom Persona + Knowledge Base",
      },
      {
        name: "Knowledge Base Vector Search (pgvector)",
        starter: false,
        pro: true,
        enterprise: true,
      },
      {
        name: "Voice Note Speech-to-Text Transcription",
        starter: false,
        pro: false,
        enterprise: false,
        comingSoon: true,
        note: "Roadmap: Automated audio transcription for incoming voice messages",
      },
    ],
  },
  {
    category: "Security, API & Support",
    features: [
      {
        name: "Postgres Row Level Security (RLS) Tenant Isolation",
        starter: true,
        pro: true,
        enterprise: true,
      },
      {
        name: "AES-256-GCM Credential Encryption",
        starter: true,
        pro: true,
        enterprise: true,
      },
      {
        name: "Public REST API (v1) & Webhook Outbound Events",
        starter: false,
        pro: true,
        enterprise: true,
      },
      {
        name: "Support SLA",
        starter: "Email (48h)",
        pro: "Priority WhatsApp (12h)",
        enterprise: "Dedicated Manager (2h)",
      },
    ],
  },
];
