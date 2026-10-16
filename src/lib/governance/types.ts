// ============================================================
// Governance, Risk Controls, Abuse Detection & Team Policies Types
// ============================================================

export type AbuseState =
  | "NORMAL"
  | "FLAGGED"
  | "REVIEW_REQUIRED"
  | "RESTRICTED"
  | "SUSPENDED";

export interface AbuseSignals {
  abnormalVolume?: boolean;
  failedAuthAttempts?: number;
  rateLimitBreaches?: number;
  whatsappWarnings?: number;
  paymentDisputes?: number;
  excessiveErrors?: number;
}

export interface PlatformAbuseRecord {
  id: string;
  account_id: string;
  state: AbuseState;
  risk_score: number; // 0-100
  flags: string[];
  evidence_summary: string | null;
  kill_switch_active: boolean;
  last_reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type FeatureFlagState =
  | "ON"
  | "OFF"
  | "SOON"
  | "BETA"
  | "TRIAL"
  | "SCHEDULED";

export interface FeatureFlag {
  id?: string;
  flag_key: string;
  name: string;
  description?: string;
  state: FeatureFlagState;
  eligible_plans: string[];
  rollout_percentage: number;
  is_emergency_disabled: boolean;
  scheduled_release_at?: string | null;
  audit_history?: Array<{
    changed_by: string;
    timestamp: string;
    previous_state: FeatureFlagState;
    new_state: FeatureFlagState;
    reason: string;
  }>;
}

export interface DataExportRequest {
  id: string;
  account_id: string;
  requested_by: string;
  request_type: "export" | "deletion";
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  export_file_url?: string | null;
  download_expires_at?: string | null;
  deletion_scheduled_at?: string | null;
  created_at: string;
  completed_at?: string | null;
}

// ------------------------------------------------------------
// Internal Team Policies (Future Use Documentation)
// Note: DIGISOLVNET currently operates with zero employees.
// These records are future-ready governance templates.
// ------------------------------------------------------------
export interface InternalTeamPolicy {
  slug: string;
  title: string;
  category: "hr" | "security" | "operations" | "engineering";
  summary: string;
  effectiveDate: string;
  reviewFrequencyMonths: number;
  applicableRoles: string[];
  guidance: string[];
  disclaimer: string;
}
