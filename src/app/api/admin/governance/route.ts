import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/mock/data";
import { MOCK_SUBSCRIBERS, MOCK_ACCOUNT_ID } from "@/lib/mock/data";
import {
  evaluateAbuseRiskScore,
  triggerEmergencyKillSwitch,
  restoreFromKillSwitch,
} from "@/lib/governance/abuse-detector";
import { evaluateFeatureFlag } from "@/lib/governance/feature-flags";
import { listInternalTeamPolicies } from "@/lib/governance/team-policies";
import type { FeatureFlag, PlatformAbuseRecord } from "@/lib/governance/types";

// In-memory governance demo state
const MOCK_ABUSE_RECORDS: PlatformAbuseRecord[] = [
  {
    id: "abuse_rec_1",
    account_id: MOCK_ACCOUNT_ID,
    state: "NORMAL",
    risk_score: 10,
    flags: [],
    evidence_summary: "Healthy operational telemetry. Standard broadcast and webhook traffic.",
    kill_switch_active: false,
    last_reviewed_at: new Date().toISOString(),
    reviewed_by: "system",
    review_notes: "Routine automated telemetry baseline check.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "abuse_rec_2",
    account_id: "acc_demo_flagged",
    state: "REVIEW_REQUIRED",
    risk_score: 55,
    flags: ["abnormal_message_volume", "repeated_failed_auth"],
    evidence_summary: "Sudden spike in outbound volume accompanied by 6 failed password attempts.",
    kill_switch_active: false,
    last_reviewed_at: new Date().toISOString(),
    reviewed_by: "automated_risk_engine",
    review_notes: "Awaiting administrative review.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const MOCK_FEATURE_FLAGS: FeatureFlag[] = [
  {
    flag_key: "ai_sales_agent",
    name: "AI WhatsApp Sales Agent",
    description: "Autonomous LLM chatbot for dynamic customer product recommendations",
    state: "ON",
    eligible_plans: ["pro", "enterprise"],
    rollout_percentage: 100,
    is_emergency_disabled: false,
  },
  {
    flag_key: "multi_currency_orders",
    name: "Multi-Currency Order Checkout",
    description: "Accept payments in USD, EUR, and AED in addition to INR",
    state: "BETA",
    eligible_plans: ["enterprise"],
    rollout_percentage: 50,
    is_emergency_disabled: false,
  },
  {
    flag_key: "custom_webhooks_v2",
    name: "Real-time Event Streaming Webhooks v2",
    description: "Sub-second webhook delivery with signature verification",
    state: "SOON",
    eligible_plans: ["pro", "enterprise"],
    rollout_percentage: 0,
    is_emergency_disabled: false,
  },
];

export async function GET(request: Request) {
  try {
    const isDemo = isDemoMode();

    if (!isDemo) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_super_admin")
        .eq("user_id", user.id)
        .single();

      if (!profile?.is_super_admin) {
        return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
      }
    }

    // Subscription status aggregate counts
    const subscriptionCounts = {
      active: 0,
      trial: 0,
      past_due: 0,
      suspended: 0,
      total: 0,
    };

    if (isDemo) {
      for (const s of MOCK_SUBSCRIBERS) {
        const st = (s.subscription_status || "active").toLowerCase();
        if (st in subscriptionCounts) {
          subscriptionCounts[st as keyof typeof subscriptionCounts]++;
        }
        subscriptionCounts.total++;
      }
    }

    // Abuse counts
    const abuseCounts = {
      NORMAL: 0,
      FLAGGED: 0,
      REVIEW_REQUIRED: 0,
      RESTRICTED: 0,
      SUSPENDED: 0,
    };

    for (const r of MOCK_ABUSE_RECORDS) {
      if (r.state in abuseCounts) {
        abuseCounts[r.state]++;
      }
    }

    const teamPolicies = listInternalTeamPolicies();

    return NextResponse.json({
      governanceOverview: {
        subscriptionCounts,
        abuseCounts,
        activeKillSwitchesCount: MOCK_ABUSE_RECORDS.filter((r) => r.kill_switch_active).length,
      },
      abuseRecords: MOCK_ABUSE_RECORDS,
      featureFlags: MOCK_FEATURE_FLAGS,
      internalTeamPolicies: teamPolicies,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load governance overview" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const isDemo = isDemoMode();
    const body = await request.json();
    const { action, accountId, flagKey, reason, notes } = body;

    if (!isDemo) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_super_admin")
        .eq("user_id", user.id)
        .single();

      if (!profile?.is_super_admin) {
        return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
      }
    }

    // Action 1: Emergency Kill Switch
    if (action === "activate_kill_switch") {
      let rec = MOCK_ABUSE_RECORDS.find((r) => r.account_id === accountId);
      if (!rec) {
        rec = {
          id: `abuse_${Date.now()}`,
          account_id: accountId,
          state: "NORMAL",
          risk_score: 0,
          flags: [],
          evidence_summary: null,
          kill_switch_active: false,
          last_reviewed_at: null,
          reviewed_by: null,
          review_notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        MOCK_ABUSE_RECORDS.push(rec);
      }

      const updated = triggerEmergencyKillSwitch(rec, {
        reason: reason || "Manual Super Admin emergency containment trigger",
        actor: "Super Admin",
      });

      const idx = MOCK_ABUSE_RECORDS.findIndex((r) => r.account_id === accountId);
      MOCK_ABUSE_RECORDS[idx] = updated;

      return NextResponse.json({ success: true, abuseRecord: updated });
    }

    // Action 2: Deactivate Kill Switch / Restore
    if (action === "deactivate_kill_switch") {
      const rec = MOCK_ABUSE_RECORDS.find((r) => r.account_id === accountId);
      if (!rec) {
        return NextResponse.json({ error: "Abuse record not found" }, { status: 404 });
      }

      const updated = restoreFromKillSwitch(rec, {
        notes: notes || "Restored following security inspection",
        actor: "Super Admin",
        targetState: "NORMAL",
      });

      const idx = MOCK_ABUSE_RECORDS.findIndex((r) => r.account_id === accountId);
      MOCK_ABUSE_RECORDS[idx] = updated;

      return NextResponse.json({ success: true, abuseRecord: updated });
    }

    // Action 3: Toggle Feature Flag State
    if (action === "update_feature_flag") {
      const flag = MOCK_FEATURE_FLAGS.find((f) => f.flag_key === flagKey);
      if (!flag) {
        return NextResponse.json({ error: "Feature flag not found" }, { status: 404 });
      }

      if (body.state) flag.state = body.state;
      if (body.is_emergency_disabled !== undefined) {
        flag.is_emergency_disabled = body.is_emergency_disabled;
      }

      return NextResponse.json({ success: true, flag });
    }

    return NextResponse.json({ error: "Unknown governance action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Action failed" }, { status: 500 });
  }
}
