"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AlertCircle, Clock, ExternalLink, MessageCircle } from "lucide-react";

export function SubscriptionBanner() {
  const { account, isSuperAdmin } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [subData, setSubData] = useState<{
    status: string;
    daysLeft: number;
    amount: number;
    payLink: string;
    adminWhatsApp: string;
    dueDate: string;
  } | null>(null);

  useEffect(() => {
    // Only fetch for non-superadmin accounts or normal client accounts
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/admin/settings");
        const sData = await res.json();
        const defaultLink = sData.settings?.default_payment_link || "";
        const adminPhone = sData.settings?.super_admin_whatsapp || "";

        // Check current account data
        const accAny = account as any;
        const expiryStr = accAny?.current_period_ends_at;
        if (!expiryStr) return;

        const expiry = new Date(expiryStr);
        const now = new Date();
        const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
        const status = accAny?.subscription_status || (daysLeft < 0 ? "past_due" : "active");

        setSubData({
          status,
          daysLeft,
          amount: accAny?.monthly_price || 49,
          payLink: accAny?.payment_link || defaultLink,
          adminWhatsApp: adminPhone,
          dueDate: expiry.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        });
      } catch {
        // Silently ignore
      }
    };

    if (account) {
      fetchStatus();
    }
  }, [account]);

  if (!subData || dismissed) return null;

  const isPastDue = subData.status === "past_due" || subData.status === "suspended" || subData.daysLeft < 0;
  const isExpiringSoon = subData.status === "active" && subData.daysLeft <= 5 && subData.daysLeft >= 0;

  if (!isPastDue && !isExpiringSoon) return null;

  return (
    <div
      className={`mb-4 rounded-xl border p-4 text-xs shadow-sm transition-all ${
        isPastDue
          ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
          : "border-amber-500/30 bg-amber-500/10 text-amber-200"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5">
          {isPastDue ? (
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
          ) : (
            <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
          )}
          <div>
            <span className="font-semibold text-foreground">
              {isPastDue
                ? "Subscription Renewal Due / Past Due:"
                : `Subscription Renews in ${subData.daysLeft} Day${subData.daysLeft === 1 ? "" : "s"}:`}
            </span>{" "}
            <span>
              {isPastDue
                ? `Your CRM plan expired on ${subData.dueDate}. Please complete the monthly renewal fee of $${subData.amount} to avoid interruption.`
                : `Your monthly renewal of $${subData.amount} is due on ${subData.dueDate}.`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {subData.payLink && (
            <a
              href={subData.payLink}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                isPastDue
                  ? "bg-rose-500 text-white hover:bg-rose-600"
                  : "bg-amber-500 text-black hover:bg-amber-400"
              }`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Pay Renewal Now
            </a>
          )}

          {subData.adminWhatsApp && (
            <a
              href={`https://wa.me/${subData.adminWhatsApp.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
                `Hello Admin, I am writing regarding subscription renewal for ${account?.name || "my account"}.`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/60 px-2.5 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
              WhatsApp Admin
            </a>
          )}

          {!isPastDue && (
            <button
              onClick={() => setDismissed(true)}
              className="text-muted-foreground hover:text-foreground p-1 text-xs"
              title="Dismiss for this session"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
