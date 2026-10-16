// ============================================================
// Multi-Tiered Abuse Detection & Risk Controls Engine
//
// Monitors operational metadata WITHOUT inspecting private message contents:
// 1. Abnormal message volume bursts
// 2. Repeated failed authentication attempts
// 3. Rate-limit violations
// 4. WhatsApp provider compliance warnings
// 5. Payment disputes / chargebacks
//
// States: NORMAL -> FLAGGED -> REVIEW_REQUIRED -> RESTRICTED -> SUSPENDED
// Includes Emergency Kill Switch for immediate containment.
// ============================================================

import { AbuseState, AbuseSignals, PlatformAbuseRecord } from "./types";

export function evaluateAbuseRiskScore(signals: AbuseSignals): {
  score: number;
  flags: string[];
  recommendedState: AbuseState;
  evidence: string;
} {
  let score = 0;
  const flags: string[] = [];
  const evidenceParts: string[] = [];

  if (signals.abnormalVolume) {
    score += 25;
    flags.push("abnormal_message_volume");
    evidenceParts.push("Outbound message frequency spiked beyond 300% of historical tenant baseline.");
  }

  if (signals.failedAuthAttempts && signals.failedAuthAttempts >= 5) {
    score += Math.min(30, signals.failedAuthAttempts * 5);
    flags.push("repeated_failed_auth");
    evidenceParts.push(`${signals.failedAuthAttempts} failed login/authentication attempts recorded within 15 minutes.`);
  }

  if (signals.rateLimitBreaches && signals.rateLimitBreaches >= 3) {
    score += 20;
    flags.push("rate_limit_breached");
    evidenceParts.push(`API rate limits exceeded ${signals.rateLimitBreaches} times in rolling window.`);
  }

  if (signals.whatsappWarnings && signals.whatsappWarnings > 0) {
    score += 35;
    flags.push("whatsapp_provider_warning");
    evidenceParts.push(`Received ${signals.whatsappWarnings} policy/spam warning(s) from WhatsApp Cloud API.`);
  }

  if (signals.paymentDisputes && signals.paymentDisputes > 0) {
    score += 40;
    flags.push("payment_chargeback_dispute");
    evidenceParts.push(`${signals.paymentDisputes} payment chargeback or dispute event(s) logged.`);
  }

  score = Math.min(100, Math.max(0, score));

  let recommendedState: AbuseState = "NORMAL";
  if (score >= 90) {
    recommendedState = "SUSPENDED";
  } else if (score >= 70) {
    recommendedState = "RESTRICTED";
  } else if (score >= 45) {
    recommendedState = "REVIEW_REQUIRED";
  } else if (score >= 20) {
    recommendedState = "FLAGGED";
  }

  return {
    score,
    flags,
    recommendedState,
    evidence: evidenceParts.join(" ") || "No abnormal telemetry observed.",
  };
}

/**
 * Activates Emergency Kill Switch for compromised accounts or abusive activity.
 * Immediately sets account to SUSPENDED state and cuts off automations & messaging.
 */
export function triggerEmergencyKillSwitch(
  record: PlatformAbuseRecord,
  params: {
    reason: string;
    actor: string;
  }
): PlatformAbuseRecord {
  return {
    ...record,
    state: "SUSPENDED",
    kill_switch_active: true,
    risk_score: 100,
    flags: Array.from(new Set([...record.flags, "emergency_kill_switch_active"])),
    last_reviewed_at: new Date().toISOString(),
    reviewed_by: params.actor,
    review_notes: `EMERGENCY KILL SWITCH ACTIVATED: ${params.reason}`,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Restores account after verified administrative review.
 */
export function restoreFromKillSwitch(
  record: PlatformAbuseRecord,
  params: {
    notes: string;
    actor: string;
    targetState?: AbuseState;
  }
): PlatformAbuseRecord {
  return {
    ...record,
    state: params.targetState || "NORMAL",
    kill_switch_active: false,
    risk_score: 0,
    flags: record.flags.filter((f) => f !== "emergency_kill_switch_active"),
    last_reviewed_at: new Date().toISOString(),
    reviewed_by: params.actor,
    review_notes: `KILL SWITCH RELEASED: ${params.notes}`,
    updated_at: new Date().toISOString(),
  };
}
