"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

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
}

export default function AdminCrmPage() {
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

  // Platform Settings State
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isRunningCron, setIsRunningCron] = useState(false);

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
        toast.success("Payment reminder sent to customer's WhatsApp!");
        if (data.directWhatsAppUrl) {
          // Open direct link option
          toast.info("WhatsApp message dispatched", {
            action: {
              label: "Open in WhatsApp",
              onClick: () => window.open(data.directWhatsAppUrl, "_blank"),
            },
          });
        }
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

  if (!authLoading && !isSuperAdmin && !isOwner) {
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
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search business, owner, phone..."
                className="w-full rounded-lg border border-border bg-card pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
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
                <Send className="h-4 w-4 text-emerald-400" />
                Send WhatsApp Payment Reminder
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
                {isSendingReminder ? "Sending via WhatsApp API..." : "Send Automatic WhatsApp Message"}
              </button>

              {remindingSub.billing_phone && (
                <a
                  href={`https://wa.me/${remindingSub.billing_phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
                    reminderCustomMsg ||
                      (settings?.reminder_message_template || "")
                        .replace(/{{name}}/g, remindingSub.owner_name)
                        .replace(/{{account_name}}/g, remindingSub.name)
                        .replace(
                          /{{due_date}}/g,
                          new Date(remindingSub.current_period_ends_at).toLocaleDateString()
                        )
                        .replace(/{{amount}}/g, `$${remindingSub.monthly_price}`)
                        .replace(/{{payment_link}}/g, remindingSub.payment_link || settings?.default_payment_link || "")
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full rounded-lg border border-border bg-muted py-2 text-xs font-medium text-center text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Or Open in WhatsApp Web / App
                </a>
              )}
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
    </div>
  );
}
