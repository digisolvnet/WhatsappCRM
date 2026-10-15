"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  ShieldCheck,
  Users,
  DollarSign,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Send,
  Plus,
  CheckCircle2,
  XCircle,
  ExternalLink,
  MessageSquare,
  Settings,
  CreditCard,
  Phone,
  Mail,
  Calendar,
  ChevronRight,
  Filter,
  ArrowUpRight,
  Trash2,
  Copy,
  Check,
  UserPlus,
  Key,
  Eye,
  EyeOff,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { syncMockContact, syncMockConversation, syncMockMessage } from "@/lib/mock/client";

interface Subscriber {
  id: string;
  name: string;
  owner_name: string;
  owner_email: string;
  billing_phone: string;
  subscription_status: "trial" | "active" | "past_due" | "suspended" | "canceled";
  plan_name: string;
  monthly_price: number;
  currency: string;
  current_period_start: string;
  current_period_ends_at: string;
  payment_link?: string;
  auto_reminder_enabled?: boolean;
  last_reminder_sent_at?: string | null;
  reminder_count?: number;
  notes?: string;
  created_at: string;
}

interface Stats {
  totalTenants: number;
  activeTenants: number;
  pastDueTenants: number;
  expiringSoon: number;
  mrr: number;
}

interface PlatformSettings {
  default_monthly_price: number;
  default_currency: string;
  default_trial_days: number;
  default_payment_link: string;
  super_admin_whatsapp: string;
  reminder_message_template: string;
  razorpay_enabled?: boolean;
  razorpay_key_id?: string;
  razorpay_key_secret?: string;
  razorpay_webhook_secret?: string;
}

export default function AdminCrmPage() {
  const router = useRouter();
  const { isSuperAdmin, isOwner, loading: authLoading } = useAuth();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"subscribers" | "settings">("subscribers");

  // Dialogs
  const [renewingSub, setRenewingSub] = useState<Subscriber | null>(null);
  const [renewDays, setRenewDays] = useState(30);
  const [renewAmount, setRenewAmount] = useState<number>(49);
  const [renewMethod, setRenewMethod] = useState("UPI / Stripe / Bank");
  const [renewRef, setRenewRef] = useState("");
  const [isRenewing, setIsRenewing] = useState(false);

  const [remindingSub, setRemindingSub] = useState<Subscriber | null>(null);
  const [reminderCustomMsg, setReminderCustomMsg] = useState("");
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  const [editingSub, setEditingSub] = useState<Subscriber | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Create Customer Dialog State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    phone?: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    owner_name: "",
    owner_email: "",
    password: "Pass@" + Math.floor(1000 + Math.random() * 9000),
    billing_phone: "",
    plan_name: "Monthly Pro",
    monthly_price: 999,
    currency: "INR",
    subscription_status: "active" as "active" | "trial",
    duration_days: 30,
    payment_link: "",
    notes: "",
  });

  // Delete Customer State
  const [deletingSub, setDeletingSub] = useState<Subscriber | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Platform Settings State
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isRunningCron, setIsRunningCron] = useState(false);
  const [showRzpSecret, setShowRzpSecret] = useState(false);
  const [copiedAdminWebhook, setCopiedAdminWebhook] = useState(false);
  const [isRazorpayPaying, setIsRazorpayPaying] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/subscribers");
      const data = await res.json();
      if (res.ok) {
        setSubscribers(data.subscribers || []);
        setStats(data.stats || null);
      } else {
        toast.error(data.error || "Failed to load subscribers");
      }

      const sRes = await fetch("/api/admin/settings");
      const sData = await sRes.json();
      if (sRes.ok && sData.settings) {
        setSettings(sData.settings);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRenew = async () => {
    if (!renewingSub) return;
    setIsRenewing(true);
    try {
      const res = await fetch(`/api/admin/subscribers/${renewingSub.id}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          days: renewDays,
          amount: renewAmount || renewingSub.monthly_price,
          paymentMethod: renewMethod,
          referenceId: renewRef,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Subscription renewed successfully!");
        setRenewingSub(null);
        loadData();
      } else {
        toast.error(data.error || "Renewal failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error");
    } finally {
      setIsRenewing(false);
    }
  };

  const handlePayWithRazorpay = async () => {
    if (!renewingSub) return;
    setIsRazorpayPaying(true);
    try {
      const months = Math.max(1, Math.round(renewDays / 30));
      const res = await fetch("/api/payments/razorpay/checkout-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriber_id: renewingSub.id,
          months,
        }),
      });

      const orderData = await res.json();
      if (!res.ok) {
        throw new Error(orderData.error || "Failed to create Razorpay checkout order");
      }

      // Check if Razorpay script is loaded in browser window
      if (typeof window !== "undefined" && !(window as any).Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve) => (script.onload = resolve));
      }

      if (typeof window !== "undefined" && (window as any).Razorpay) {
        const options = {
          key: orderData.keyId,
          amount: Math.round(orderData.amount * 100),
          currency: orderData.currency || "INR",
          name: "WaCRM SaaS Subscription",
          description: `Subscription renewal for ${renewingSub.name} (${renewDays} days)`,
          order_id: orderData.orderId,
          handler: async function (response: any) {
            try {
              const verifyRes = await fetch("/api/payments/razorpay/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  order_id: response.razorpay_order_id,
                  payment_id: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                  subscriber_id: renewingSub.id,
                  months,
                }),
              });
              const vData = await verifyRes.json();
              if (verifyRes.ok) {
                toast.success(vData.message || "Payment verified and subscription activated!");
                setRenewingSub(null);
                loadData();
              } else {
                toast.error(vData.error || "Payment verification failed");
              }
            } catch (err: any) {
              toast.error(err.message || "Failed to verify payment");
            }
          },
          prefill: {
            name: renewingSub.owner_name || renewingSub.name,
            email: renewingSub.owner_email,
            contact: renewingSub.billing_phone,
          },
          theme: {
            color: "#10b981",
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        // Fallback for demo simulation if Razorpay JS couldn't load
        const demoVerify = await fetch("/api/payments/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: orderData.orderId,
            payment_id: `pay_demo_${Date.now()}`,
            signature: "demo_sig_manual",
            subscriber_id: renewingSub.id,
            months,
          }),
        });
        const vData = await demoVerify.json();
        if (demoVerify.ok) {
          toast.success(vData.message || "Payment completed in Demo Mode!");
          setRenewingSub(null);
          loadData();
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process Razorpay payment");
    } finally {
      setIsRazorpayPaying(false);
    }
  };

  const handleSendReminder = async (sub: Subscriber, customText?: string) => {
    setIsSendingReminder(true);
    try {
      const res = await fetch(`/api/admin/subscribers/${sub.id}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customMessage: customText || reminderCustomMsg || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.mockData) {
          if (data.mockData.contact) syncMockContact(data.mockData.contact);
          if (data.mockData.conversation) syncMockConversation(data.mockData.conversation);
          if (data.mockData.message) syncMockMessage(data.mockData.message);
        }
        toast.success("Payment reminder sent & saved to CRM Inbox!");
        const targetUrl = data.inboxUrl || (data.conversationId ? `/inbox?c=${data.conversationId}` : `/inbox?c=conv-sub-${sub.id}`);
        toast.info("Message is active in CRM Inbox", {
          action: {
            label: "Open in CRM Inbox",
            onClick: () => router.push(targetUrl),
          },
        });
        setRemindingSub(null);
        loadData();
      } else {
        toast.error(data.error || "Failed to send reminder");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error");
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleToggleStatus = async (sub: Subscriber) => {
    const nextStatus = sub.subscription_status === "active" ? "suspended" : "active";
    try {
      const res = await fetch(`/api/admin/subscribers/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription_status: nextStatus }),
      });
      if (res.ok) {
        toast.success(`Account ${nextStatus === "active" ? "activated" : "suspended"}`);
        loadData();
      } else {
        toast.error("Failed to update status");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingSub) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/subscribers/${editingSub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingSub),
      });
      if (res.ok) {
        toast.success("Subscriber updated successfully");
        setEditingSub(null);
        loadData();
      } else {
        toast.error("Failed to save subscriber");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.owner_email) {
      toast.error("Please enter Business name and Customer email");
      return;
    }
    setIsCreatingCustomer(true);
    try {
      const res = await fetch("/api/admin/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Customer account created successfully!");
        setCreatedCredentials({
          name: newCustomer.name,
          email: data.credentials?.email || newCustomer.owner_email,
          password: data.credentials?.password || newCustomer.password,
          phone: newCustomer.billing_phone,
        });
        setIsCreateModalOpen(false);
        // Reset form
        setNewCustomer({
          name: "",
          owner_name: "",
          owner_email: "",
          password: "Pass@" + Math.floor(1000 + Math.random() * 9000),
          billing_phone: "",
          plan_name: "Monthly Pro",
          monthly_price: settings?.default_monthly_price || 999,
          currency: settings?.default_currency || "INR",
          subscription_status: "active",
          duration_days: 30,
          payment_link: settings?.default_payment_link || "",
          notes: "",
        });
        loadData();
      } else {
        toast.error(data.error || "Failed to create customer");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error while creating customer");
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleDeleteSubscriber = async () => {
    if (!deletingSub) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/subscribers/${deletingSub.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Customer deleted successfully");
        setDeletingSub(null);
        loadData();
      } else {
        toast.error(data.error || "Failed to delete customer");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `🎉 Welcome to WhatsApp CRM!\nHere are your login credentials:\n\n🌐 Login URL: ${window.location.origin}/login\n📧 Email: ${createdCredentials.email}\n🔑 Password: ${createdCredentials.password}\n\nPlease login and start connecting your WhatsApp!`;
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    toast.success("Login details copied to clipboard!");
    setTimeout(() => setCopiedKey(false), 3000);
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success("Platform billing settings saved successfully");
      } else {
        toast.error("Failed to save settings");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleRunDailyCron = async () => {
    setIsRunningCron(true);
    try {
      const res = await fetch("/api/cron/subscription-reminders", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          `Processed ${data.totalProcessed || 0} account(s). Automated reminders delivered!`
        );
        loadData();
      } else {
        toast.error(data.error || "Cron trigger failed");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsRunningCron(false);
    }
  };

  // Filter subscribers
  const filteredSubscribers = subscribers.filter((sub) => {
    const matchesSearch =
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.owner_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.billing_phone.includes(searchQuery);

    if (!matchesSearch) return false;
    if (statusFilter === "all") return true;
    if (statusFilter === "expiring") {
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
      const exp = new Date(sub.current_period_ends_at);
      return sub.subscription_status === "active" && exp <= in7Days && exp >= now;
    }
    return sub.subscription_status === statusFilter;
  });

  if (!authLoading && !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 max-w-lg mx-auto">
        <div className="h-14 w-14 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center mb-4">
          <ShieldCheck className="h-7 w-7 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Super Admin Access Required</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          This portal is reserved for Platform Super Administrators to manage tenant subscriptions, billing, and automated reminders.
        </p>
        <div className="mt-5 rounded-xl border border-border bg-card p-4 text-left w-full text-xs text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">How to grant Super Admin access:</p>
          <p>
            1. Add your login email to <code className="bg-muted px-1.5 py-0.5 rounded text-primary">SUPER_ADMIN_EMAILS</code> in Vercel project environment variables.
          </p>
          <p>
            2. Or run this in Supabase SQL Editor:
          </p>
          <pre className="bg-muted p-2 rounded text-[11px] overflow-x-auto text-foreground">
{`UPDATE profiles SET is_super_admin = TRUE WHERE email = 'your-email@domain.com';`}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Admin CRM — Subscription Manager
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Super Admin
                </span>
              </h1>
              <p className="text-xs text-muted-foreground">
                Manage client monthly subscriptions, payment links, access control & automated WhatsApp renewal reminders.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunDailyCron}
            disabled={isRunningCron}
            className="flex items-center gap-2 rounded-lg bg-secondary px-3.5 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors disabled:opacity-50"
            title="Scan all accounts and send payment reminders for due subscriptions"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRunningCron ? "animate-spin text-primary" : ""}`} />
            {isRunningCron ? "Sending Reminders..." : "Run Daily Auto-Reminders"}
          </button>

          <button
            onClick={loadData}
            className="rounded-lg bg-muted p-2 text-muted-foreground hover:text-foreground border border-border"
            title="Refresh List"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Monthly Revenue (MRR)</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              ${stats.mrr.toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">From active monthly plans</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Active Tenants</span>
              <Users className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {stats.activeTenants}{" "}
              <span className="text-xs font-normal text-muted-foreground">/ {stats.totalTenants} total</span>
            </div>
            <p className="text-[11px] text-emerald-400 mt-1">Using WhatsApp CRM</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Expiring Soon (≤ 7d)</span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400">{stats.expiringSoon}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Due for renewal reminder</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Past Due / Suspended</span>
              <AlertTriangle className="h-4 w-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-rose-400">{stats.pastDueTenants}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Requires renewal payment</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("subscribers")}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "subscribers"
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Client Subscriptions ({subscribers.length})
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "settings"
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings className="h-4 w-4" />
          Payment Links & Reminder Settings
        </button>
      </div>

      {/* Tab 1: Subscribers List */}
      {activeTab === "subscribers" && (
        <div className="space-y-4">
          {/* Action Header & Search */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 text-xs font-semibold shadow-sm transition-colors shrink-0"
              >
                <UserPlus className="h-4 w-4" />
                + Create Customer
              </button>

              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search business, owner, phone..."
                  className="w-full rounded-lg border border-border bg-card pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {[
                { id: "all", label: "All" },
                { id: "active", label: "Active" },
                { id: "expiring", label: "Expiring (≤7d)" },
                { id: "trial", label: "Trial" },
                { id: "past_due", label: "Past Due" },
                { id: "suspended", label: "Suspended" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    statusFilter === f.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Client Workspace / Business</th>
                    <th className="px-4 py-3">WhatsApp Number</th>
                    <th className="px-4 py-3">Plan & Fee</th>
                    <th className="px-4 py-3">Subscription Expiry</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSubscribers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No subscribers found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSubscribers.map((sub) => {
                      const expiry = new Date(sub.current_period_ends_at);
                      const now = new Date();
                      const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
                      const isExpired = daysLeft < 0;

                      return (
                        <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-foreground text-sm">{sub.name}</div>
                            <div className="text-muted-foreground text-[11px] flex items-center gap-1.5 mt-0.5">
                              <span>{sub.owner_name}</span>
                              <span>•</span>
                              <span>{sub.owner_email}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            {sub.billing_phone ? (
                              <a
                                href={`https://wa.me/${sub.billing_phone.replace(/[^\d]/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-400 hover:underline font-mono"
                              >
                                <Phone className="h-3 w-3" />
                                {sub.billing_phone}
                              </a>
                            ) : (
                              <span className="text-muted-foreground italic">No phone added</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-medium text-foreground">{sub.plan_name}</div>
                            <div className="text-muted-foreground text-[11px]">
                              ${sub.monthly_price}/month
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-medium text-foreground">
                              {expiry.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </div>
                            <div className="text-[11px] mt-0.5">
                              {isExpired ? (
                                <span className="text-rose-400 font-medium">Expired {Math.abs(daysLeft)}d ago</span>
                              ) : daysLeft <= 3 ? (
                                <span className="text-amber-400 font-semibold">{daysLeft} days left</span>
                              ) : (
                                <span className="text-muted-foreground">{daysLeft} days left</span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                                sub.subscription_status === "active"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : sub.subscription_status === "trial"
                                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                                  : sub.subscription_status === "past_due"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                              }`}
                            >
                              {sub.subscription_status}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                            {/* Renew Button */}
                            <button
                              onClick={() => {
                                setRenewingSub(sub);
                                setRenewAmount(sub.monthly_price || 49);
                              }}
                              className="inline-flex items-center gap-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-2.5 py-1 font-medium text-xs border border-emerald-500/30 transition-colors"
                              title="Customer paid: Extend subscription by 30 days"
                            >
                              <Plus className="h-3 w-3" />
                              Renew (+30d)
                            </button>

                            {/* WhatsApp Reminder Button */}
                            <button
                              onClick={() => {
                                setRemindingSub(sub);
                              }}
                              className="inline-flex items-center gap-1 rounded bg-muted hover:bg-muted/80 text-foreground px-2.5 py-1 font-medium text-xs border border-border transition-colors"
                              title="Send payment reminder to customer via WhatsApp"
                            >
                              <Send className="h-3 w-3 text-emerald-400" />
                              Remind
                            </button>

                            {/* CRM Inbox Chat Button */}
                            <button
                              onClick={() => router.push(`/inbox?c=conv-sub-${sub.id}`)}
                              className="inline-flex items-center gap-1 rounded bg-muted hover:bg-muted/80 text-foreground px-2 py-1 text-xs border border-border"
                              title="Open customer conversation in CRM Inbox"
                            >
                              <MessageSquare className="h-3 w-3 text-emerald-400" />
                              Inbox
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => setEditingSub({ ...sub })}
                              className="inline-flex items-center gap-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground px-2 py-1 text-xs border border-border"
                              title="Edit custom plan or payment link"
                            >
                              Edit
                            </button>

                            {/* Suspend / Activate Toggle */}
                            <button
                              onClick={() => handleToggleStatus(sub)}
                              className={`inline-flex items-center rounded px-2 py-1 text-xs border transition-colors ${
                                sub.subscription_status === "active"
                                  ? "border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                                  : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                              }`}
                              title={sub.subscription_status === "active" ? "Suspend access" : "Activate access"}
                            >
                              {sub.subscription_status === "active" ? "Suspend" : "Activate"}
                            </button>

                            {/* Delete Customer */}
                            <button
                              onClick={() => setDeletingSub(sub)}
                              className="inline-flex items-center rounded p-1 text-xs border border-border text-muted-foreground hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                              title="Delete customer account"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Settings & Payment Links */}
      {activeTab === "settings" && settings && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment Link Settings */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <CreditCard className="h-5 w-5 text-emerald-400" />
              <div>
                <h3 className="font-semibold text-foreground text-sm">Payment Link & Pricing Defaults</h3>
                <p className="text-xs text-muted-foreground">
                  Where customers pay their monthly fee (Razorpay, Stripe, UPI, or PayPal)
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground font-medium mb-1">
                  Default Payment Link (Stripe Checkout / Razorpay / UPI URL)
                </label>
                <input
                  type="text"
                  value={settings.default_payment_link}
                  onChange={(e) =>
                    setSettings({ ...settings, default_payment_link: e.target.value })
                  }
                  placeholder="https://buy.stripe.com/... or https://rzp.io/l/..."
                  className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  This link will be included in the WhatsApp reminder message sent to clients.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground font-medium mb-1">
                    Default Monthly Price
                  </label>
                  <input
                    type="number"
                    value={settings.default_monthly_price}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        default_monthly_price: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground font-medium mb-1">
                    Currency (USD, INR, EUR...)
                  </label>
                  <input
                    type="text"
                    value={settings.default_currency}
                    onChange={(e) =>
                      setSettings({ ...settings, default_currency: e.target.value })
                    }
                    className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">
                  Super Admin WhatsApp Support Number
                </label>
                <input
                  type="text"
                  value={settings.super_admin_whatsapp}
                  onChange={(e) =>
                    setSettings({ ...settings, super_admin_whatsapp: e.target.value })
                  }
                  placeholder="+14155552671"
                  className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Shown on expired client screens so they can contact you for assistance.
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="w-full rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSavingSettings ? "Saving Settings..." : "Save Pricing & Payment Settings"}
              </button>
            </div>
          </div>

          {/* Automated WhatsApp Reminder Template */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <MessageSquare className="h-5 w-5 text-emerald-400" />
              <div>
                <h3 className="font-semibold text-foreground text-sm">Automated WhatsApp Reminder Template</h3>
                <p className="text-xs text-muted-foreground">
                  The exact WhatsApp message sent automatically before subscription renewal
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground font-medium mb-1">
                  WhatsApp Message Body
                </label>
                <textarea
                  rows={6}
                  value={settings.reminder_message_template}
                  onChange={(e) =>
                    setSettings({ ...settings, reminder_message_template: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans leading-relaxed"
                />
              </div>

              <div className="rounded-lg bg-muted/50 p-2.5 text-[11px] space-y-1 text-muted-foreground border border-border">
                <span className="font-semibold text-foreground">Available Variables:</span>
                <div className="flex flex-wrap gap-2 text-emerald-400 font-mono text-[10px]">
                  <span>{`{{name}}`}</span>
                  <span>{`{{account_name}}`}</span>
                  <span>{`{{due_date}}`}</span>
                  <span>{`{{amount}}`}</span>
                  <span>{`{{payment_link}}`}</span>
                </div>
              </div>

              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-[11px] text-emerald-300">
                <p className="font-medium">📅 Automatic Schedule:</p>
                <p className="text-muted-foreground mt-0.5">
                  Reminders are sent 3 days before expiry, 1 day before, and on the due date. Once renewed, reminders stop automatically.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="w-full rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSavingSettings ? "Saving Settings..." : "Save Reminder Template"}
              </button>
            </div>
          </div>

          {/* Razorpay Platform Payment Gateway Card */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 md:col-span-2">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-400" />
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Razorpay Payment Gateway (Super Admin SaaS Billing)</h3>
                  <p className="text-xs text-muted-foreground">
                    Accept online subscriber payments with instant auto-renewal via UPI, Cards, and NetBanking
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settings.razorpay_enabled)}
                  onChange={(e) =>
                    setSettings({ ...settings, razorpay_enabled: e.target.checked })
                  }
                  className="rounded border-border text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="text-xs font-semibold text-foreground">Enable Razorpay</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-muted-foreground font-medium mb-1">
                  Razorpay Key ID
                </label>
                <input
                  type="text"
                  value={settings.razorpay_key_id || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, razorpay_key_id: e.target.value })
                  }
                  placeholder="rzp_live_... or rzp_test_..."
                  className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  From Razorpay Dashboard → Settings → API Keys
                </span>
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">
                  Razorpay Key Secret
                </label>
                <div className="relative">
                  <input
                    type={showRzpSecret ? "text" : "password"}
                    value={settings.razorpay_key_secret || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, razorpay_key_secret: e.target.value })
                    }
                    placeholder="Key Secret from Razorpay Dashboard"
                    className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRzpSecret(!showRzpSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showRzpSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Used for server-side cryptographic signature verification
                </span>
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">
                  Razorpay Webhook Secret (Optional)
                </label>
                <input
                  type="text"
                  value={settings.razorpay_webhook_secret || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, razorpay_webhook_secret: e.target.value })
                  }
                  placeholder="Webhook Secret entered in Razorpay Dashboard"
                  className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">
                  Razorpay Webhook URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== "undefined" ? `${window.location.origin}/api/payments/razorpay/webhook` : "/api/payments/razorpay/webhook"}
                    className="w-full rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs text-foreground font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        navigator.clipboard.writeText(`${window.location.origin}/api/payments/razorpay/webhook`);
                        setCopiedAdminWebhook(true);
                        toast.success("Webhook URL copied to clipboard");
                        setTimeout(() => setCopiedAdminWebhook(false), 2000);
                      }
                    }}
                    className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors flex items-center gap-1 shrink-0"
                  >
                    {copiedAdminWebhook ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedAdminWebhook ? "Copied" : "Copy"}
                  </button>
                </div>
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Add to Razorpay Webhooks (Events: payment_link.paid, order.paid, payment.captured)
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {isSavingSettings ? "Saving Settings..." : "Save Razorpay Gateway Settings"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENEW MODAL */}
      {renewingSub && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-400" />
                Renew Subscription for {renewingSub.name}
              </h3>
              <button
                onClick={() => setRenewingSub(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1 font-medium">Extend Period By</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { days: 30, label: "+30 Days (1 Mo)" },
                    { days: 90, label: "+90 Days (3 Mo)" },
                    { days: 365, label: "+1 Year" },
                  ].map((d) => (
                    <button
                      key={d.days}
                      type="button"
                      onClick={() => setRenewDays(d.days)}
                      className={`rounded-lg py-2 border text-xs font-semibold transition-colors ${
                        renewDays === d.days
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : "border-border bg-muted/30 text-muted-foreground"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-medium">Amount Received ($)</label>
                <input
                  type="number"
                  value={renewAmount}
                  onChange={(e) => setRenewAmount(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-foreground text-xs"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-medium">Payment Method</label>
                <select
                  value={renewMethod}
                  onChange={(e) => setRenewMethod(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-foreground text-xs"
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Stripe">Stripe Payment Link</option>
                  <option value="Razorpay">Razorpay</option>
                  <option value="Bank Transfer">Direct Bank Transfer</option>
                  <option value="Cash / Manual">Cash / Other</option>
                </select>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-medium">
                  Transaction / Reference ID (Optional)
                </label>
                <input
                  type="text"
                  value={renewRef}
                  onChange={(e) => setRenewRef(e.target.value)}
                  placeholder="e.g. UPI-12948192 or ch_3N..."
                  className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-foreground text-xs font-mono"
                />
              </div>
            </div>

            {settings?.razorpay_enabled && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4" /> Instant Online Checkout
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {renewingSub.currency || "INR"} {renewAmount}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handlePayWithRazorpay}
                  disabled={isRazorpayPaying}
                  className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isRazorpayPaying ? "Opening Razorpay..." : "⚡ Pay & Activate with Razorpay (UPI / Card / NetBanking)"}
                </button>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRenewingSub(null)}
                className="flex-1 rounded-lg border border-border bg-muted py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenew}
                disabled={isRenewing}
                className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {isRenewing ? "Renewing..." : "Confirm & Renew (+30d)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEND REMINDER MODAL */}
      {remindingSub && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-400" />
                Send Subscription Reminder (CRM Inbox)
              </h3>
              <button
                onClick={() => setRemindingSub(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-lg bg-muted/40 p-3 border border-border space-y-1">
                <div className="font-semibold text-foreground">{remindingSub.name}</div>
                <div className="text-muted-foreground">Recipient WhatsApp: <span className="text-emerald-400 font-mono">{remindingSub.billing_phone || "Not set"}</span></div>
                <div className="text-muted-foreground">Plan Fee: <span className="font-semibold text-foreground">${remindingSub.monthly_price}/mo</span></div>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-medium">Reminder Message Preview</label>
                <textarea
                  rows={5}
                  value={
                    reminderCustomMsg ||
                    (settings?.reminder_message_template || "")
                      .replace(/{{name}}/g, remindingSub.owner_name)
                      .replace(/{{account_name}}/g, remindingSub.name)
                      .replace(
                        /{{due_date}}/g,
                        new Date(remindingSub.current_period_ends_at).toLocaleDateString()
                      )
                      .replace(/{{amount}}/g, `$${remindingSub.monthly_price}`)
                      .replace(/{{payment_link}}/g, remindingSub.payment_link || settings?.default_payment_link || "https://example.com/pay")
                  }
                  onChange={(e) => setReminderCustomMsg(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-foreground text-xs leading-relaxed"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleSendReminder(remindingSub)}
                disabled={isSendingReminder || !remindingSub.billing_phone}
                className="w-full rounded-lg bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {isSendingReminder ? "Sending via CRM WhatsApp..." : "Send from CRM Inbox"}
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetId = remindingSub.id;
                  setRemindingSub(null);
                  router.push(`/inbox?c=conv-sub-${targetId}`);
                }}
                className="w-full rounded-lg border border-border bg-muted/60 py-2.5 text-xs font-medium text-center text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                Open in CRM Inbox
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SUBSCRIBER MODAL */}
      {editingSub && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-foreground text-sm">Edit Subscriber — {editingSub.name}</h3>
              <button onClick={() => setEditingSub(null)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1 font-medium">WhatsApp Billing Phone</label>
                <input
                  type="text"
                  value={editingSub.billing_phone}
                  onChange={(e) => setEditingSub({ ...editingSub, billing_phone: e.target.value })}
                  placeholder="+14155552671"
                  className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-foreground text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1 font-medium">Plan Name</label>
                  <input
                    type="text"
                    value={editingSub.plan_name}
                    onChange={(e) => setEditingSub({ ...editingSub, plan_name: e.target.value })}
                    className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-foreground text-xs"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1 font-medium">Monthly Price ($)</label>
                  <input
                    type="number"
                    value={editingSub.monthly_price}
                    onChange={(e) => setEditingSub({ ...editingSub, monthly_price: Number(e.target.value) })}
                    className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-foreground text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-medium">Custom Payment Link (Optional)</label>
                <input
                  type="text"
                  value={editingSub.payment_link || ""}
                  onChange={(e) => setEditingSub({ ...editingSub, payment_link: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-foreground text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-medium">Admin Notes</label>
                <input
                  type="text"
                  value={editingSub.notes || ""}
                  onChange={(e) => setEditingSub({ ...editingSub, notes: e.target.value })}
                  placeholder="e.g. Custom agreement, discounts..."
                  className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-foreground text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingSub(null)}
                className="flex-1 rounded-lg border border-border bg-muted py-2 text-xs font-medium text-muted-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="flex-1 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground"
              >
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CUSTOMER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-emerald-500" />
                Create Customer Account & Subscription
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
              {/* Business & Owner Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1 font-medium">
                    Business / Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="e.g. Acme Enterprises"
                    className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-foreground text-xs"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1 font-medium">
                    Owner Full Name
                  </label>
                  <input
                    type="text"
                    value={newCustomer.owner_name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, owner_name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-foreground text-xs"
                  />
                </div>
              </div>

              {/* Login Credentials */}
              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
                <p className="font-semibold text-foreground flex items-center gap-1.5 text-[11px]">
                  <Key className="h-3.5 w-3.5 text-primary" />
                  Client Login Credentials
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-muted-foreground mb-1 font-medium">
                      Login Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={newCustomer.owner_email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, owner_email: e.target.value })}
                      placeholder="client@company.com"
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground mb-1 font-medium">
                      Initial Password *
                    </label>
                    <input
                      type="text"
                      required
                      value={newCustomer.password}
                      onChange={(e) => setNewCustomer({ ...newCustomer, password: e.target.value })}
                      placeholder="e.g. Pass@1234"
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* WhatsApp Phone & Plan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1 font-medium">
                    WhatsApp Phone (with Country Code)
                  </label>
                  <input
                    type="text"
                    value={newCustomer.billing_phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, billing_phone: e.target.value })}
                    placeholder="+919876543210"
                    className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-foreground text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1 font-medium">Plan Name</label>
                  <select
                    value={newCustomer.plan_name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, plan_name: e.target.value })}
                    className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-foreground text-xs"
                  >
                    <option value="Monthly Pro">Monthly Pro</option>
                    <option value="Starter">Starter Plan</option>
                    <option value="Business Plus">Business Plus</option>
                    <option value="Enterprise">Enterprise</option>
                    <option value="Custom Plan">Custom Plan</option>
                  </select>
                </div>
              </div>

              {/* Price, Currency, Duration */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1 font-medium">Fee</label>
                  <input
                    type="number"
                    value={newCustomer.monthly_price}
                    onChange={(e) => setNewCustomer({ ...newCustomer, monthly_price: Number(e.target.value) })}
                    className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-foreground text-xs"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1 font-medium">Currency</label>
                  <select
                    value={newCustomer.currency}
                    onChange={(e) => setNewCustomer({ ...newCustomer, currency: e.target.value })}
                    className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-foreground text-xs"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AED">AED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1 font-medium">Validity</label>
                  <select
                    value={newCustomer.duration_days}
                    onChange={(e) => setNewCustomer({ ...newCustomer, duration_days: Number(e.target.value) })}
                    className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-foreground text-xs font-medium"
                  >
                    <option value={14}>14 Days (Trial)</option>
                    <option value={30}>30 Days (1 Month)</option>
                    <option value={60}>60 Days (2 Months)</option>
                    <option value={90}>90 Days (3 Months)</option>
                    <option value={180}>180 Days (6 Months)</option>
                    <option value={365}>365 Days (1 Year)</option>
                  </select>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-muted-foreground mb-1 font-medium">Initial Status</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="subscription_status"
                      value="active"
                      checked={newCustomer.subscription_status === "active"}
                      onChange={() => setNewCustomer({ ...newCustomer, subscription_status: "active" })}
                      className="text-emerald-500"
                    />
                    <span className="text-foreground">Active (Payment Received)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="subscription_status"
                      value="trial"
                      checked={newCustomer.subscription_status === "trial"}
                      onChange={() => setNewCustomer({ ...newCustomer, subscription_status: "trial" })}
                      className="text-primary"
                    />
                    <span className="text-foreground">Free Trial</span>
                  </label>
                </div>
              </div>

              {/* Payment Link & Notes */}
              <div>
                <label className="block text-muted-foreground mb-1 font-medium">
                  Custom Payment Link (Optional)
                </label>
                <input
                  type="text"
                  value={newCustomer.payment_link}
                  onChange={(e) => setNewCustomer({ ...newCustomer, payment_link: e.target.value })}
                  placeholder="https://rzp.io/l/... or UPI link"
                  className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-foreground text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-medium">Notes (Internal)</label>
                <input
                  type="text"
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                  placeholder="e.g. Paid via GPay, Ref #9812..."
                  className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-foreground text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 rounded-lg border border-border bg-muted py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCustomer}
                  className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
                >
                  {isCreatingCustomer ? "Creating Account..." : "Create & Activate Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREDENTIALS SUCCESS MODAL */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                Customer Account Created!
              </h3>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2.5 text-xs">
              <p className="text-muted-foreground text-[11px]">
                Share these login details with <strong className="text-foreground">{createdCredentials.name}</strong>:
              </p>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Portal URL:</span>
                <span className="font-mono text-primary">{typeof window !== "undefined" ? window.location.origin : ""}/login</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Login Email:</span>
                <span className="font-mono text-foreground font-semibold">{createdCredentials.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Password:</span>
                <span className="font-mono text-emerald-400 font-bold bg-muted px-2 py-0.5 rounded">{createdCredentials.password}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {copiedKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedKey ? "Copied!" : "Copy Login Credentials"}
              </button>

              {createdCredentials.phone && (
                <button
                  type="button"
                  onClick={() => {
                    const msg = encodeURIComponent(
                      `🎉 Welcome to WhatsApp CRM!\nHere are your account login details:\n\n🌐 Portal: ${window.location.origin}/login\n📧 Email: ${createdCredentials.email}\n🔑 Password: ${createdCredentials.password}\n\nPlease login to start messaging your customers!`
                    );
                    window.open(
                      `https://wa.me/${createdCredentials.phone.replace(/[^\d]/g, "")}?text=${msg}`,
                      "_blank"
                    );
                  }}
                  className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600/25 border border-emerald-500/30 py-2 text-xs font-semibold transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send Credentials via WhatsApp
                </button>
              )}

              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="rounded-lg border border-border bg-muted py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CUSTOMER MODAL */}
      {deletingSub && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Delete Customer Account</h3>
                <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-foreground bg-muted/40 p-3 rounded-lg border border-border">
              Are you sure you want to delete <strong>{deletingSub.name}</strong> ({deletingSub.owner_email})? Their account and access will be permanently removed.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSub(null)}
                className="flex-1 rounded-lg border border-border bg-muted py-2 text-xs font-medium text-muted-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubscriber}
                disabled={isDeleting}
                className="flex-1 rounded-lg bg-rose-600 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
