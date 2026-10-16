// ============================================================
// Enterprise Feature Flags & Entitlement Controls
//
// Supports States:
// - ON: Fully active for eligible plans
// - OFF: Disabled globally
// - SOON: Informational teaser, inactive
// - BETA: Opt-in for eligible accounts
// - TRIAL: Active during trial evaluation
// - SCHEDULED: Automatically enables at scheduled_release_at timestamp
//
// Enforces server-side emergency kill-switches and audit trails.
// ============================================================

import { FeatureFlag, FeatureFlagState } from "./types";

export interface FeatureEvaluationResult {
  enabled: boolean;
  state: FeatureFlagState;
  reason?: string;
  isBeta?: boolean;
  isComingSoon?: boolean;
}

export function evaluateFeatureFlag(
  flag: FeatureFlag,
  context: {
    planTier: string;
    isTrial?: boolean;
    now?: Date;
  }
): FeatureEvaluationResult {
  // Emergency disable overrides all rules
  if (flag.is_emergency_disabled) {
    return {
      enabled: false,
      state: flag.state,
      reason: "Feature is temporarily emergency disabled by platform security administrators.",
    };
  }

  // Global OFF
  if (flag.state === "OFF") {
    return {
      enabled: false,
      state: "OFF",
      reason: "Feature is currently turned off.",
    };
  }

  // Coming Soon
  if (flag.state === "SOON") {
    return {
      enabled: false,
      state: "SOON",
      isComingSoon: true,
      reason: "Feature is coming soon in an upcoming platform release.",
    };
  }

  // Scheduled Release
  if (flag.state === "SCHEDULED") {
    const now = context.now || new Date();
    if (!flag.scheduled_release_at || new Date(flag.scheduled_release_at) > now) {
      return {
        enabled: false,
        state: "SCHEDULED",
        reason: `Feature is scheduled for release on ${flag.scheduled_release_at || "future date"}.`,
      };
    }
  }

  // Plan Entitlement Check (Starter, Pro, Enterprise)
  const normalizedTier = (context.planTier || "starter").toLowerCase();
  const isPlanEligible = flag.eligible_plans.map((p) => p.toLowerCase()).includes(normalizedTier);

  if (!isPlanEligible) {
    return {
      enabled: false,
      state: flag.state,
      reason: `Feature requires an upgraded plan tier (Available on: ${flag.eligible_plans.join(", ")}).`,
    };
  }

  // Trial state check
  if (flag.state === "TRIAL" && !context.isTrial) {
    return {
      enabled: false,
      state: "TRIAL",
      reason: "Feature is only enabled during active trial periods.",
    };
  }

  return {
    enabled: true,
    state: flag.state,
    isBeta: flag.state === "BETA",
  };
}
