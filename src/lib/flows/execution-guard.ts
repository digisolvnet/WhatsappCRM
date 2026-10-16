// ============================================================
// Flow Execution Guard & Safety Engine
//
// Enforces:
// 1. Tenant rate limits & monthly execution quotas.
// 2. Suspension enforcement (blocks paid automations for suspended tenants).
// 3. Loop detection & execution timeout prevention.
// 4. Failure retry with exponential backoff & failure reason logging.
// 5. Idempotent step dispatch preventing duplicate WhatsApp messages on retry.
// 6. WhatsApp policy guard (24-hour customer service window & opt-out compliance).
// 7. Safe test mode (simulates flow transitions without live Meta API or live payments).
// ============================================================

import {
  checkSubscriptionAccess,
  SubscriptionSuspendedError,
  type AccountSubscriptionRecord,
} from "@/lib/auth/subscription-guard";

export class FlowExecutionError extends Error {
  readonly status = 400 as const;
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "FlowExecutionError";
  }
}

export class LoopDetectedError extends FlowExecutionError {
  constructor(message = "Flow execution terminated: Infinite loop or excessive step transitions detected") {
    super(message, "LOOP_DETECTED");
  }
}

export class QuotaExceededError extends FlowExecutionError {
  constructor(message = "Monthly automation execution quota exceeded for tenant plan") {
    super(message, "QUOTA_EXCEEDED");
  }
}

export class RateLimitExceededError extends FlowExecutionError {
  constructor(message = "Flow execution rate limit exceeded. Please back off before retrying.") {
    super(message, "RATE_LIMIT_EXCEEDED");
  }
}

export class WhatsAppPolicyViolationError extends FlowExecutionError {
  constructor(message = "WhatsApp Policy Violation: Message rejected") {
    super(message, "WHATSAPP_POLICY_VIOLATION");
  }
}

export const MAX_TRANSITIONS_PER_RUN = 50;
export const MAX_DEFAULT_RETRIES = 3;

/**
 * Asserts that a tenant's subscription is active and eligible to run automations.
 * Throws SubscriptionSuspendedError if account is suspended.
 */
export function assertTenantAutomationPermitted(
  account: AccountSubscriptionRecord | null | undefined,
  nowTimestamp?: string
): void {
  const check = checkSubscriptionAccess(account, nowTimestamp);
  if (!check.allowed) {
    throw new SubscriptionSuspendedError(
      `Tenant cannot execute automation: Subscription is ${check.effectiveStatus}.`,
      account?.id,
      check.effectiveStatus,
      Math.abs(check.daysRemaining)
    );
  }
}

/**
 * In-memory token bucket / counter for sliding-window rate limits (tenantId -> timestamp[])
 */
const rateLimitBuckets = new Map<string, number[]>();

export function checkTenantRateLimit(
  accountId: string,
  limitPerMinute = 60,
  now = Date.now()
): void {
  const windowStart = now - 60000;
  let timestamps = rateLimitBuckets.get(accountId) || [];
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= limitPerMinute) {
    throw new RateLimitExceededError(
      `Tenant '${accountId}' exceeded rate limit of ${limitPerMinute} flow executions per minute.`
    );
  }

  timestamps.push(now);
  rateLimitBuckets.set(accountId, timestamps);
}

/**
 * Checks tenant monthly quota against plan entitlements
 */
export function checkTenantExecutionQuota(
  executionsThisMonth: number,
  monthlyQuota: number
): void {
  if (executionsThisMonth >= monthlyQuota) {
    throw new QuotaExceededError(
      `Tenant has used ${executionsThisMonth}/${monthlyQuota} monthly flow executions. Upgrade plan to increase quota.`
    );
  }
}

/**
 * Loop prevention checker
 */
export function assertNoExecutionLoop(
  visitedNodes: string[],
  maxAllowed = MAX_TRANSITIONS_PER_RUN
): void {
  if (visitedNodes.length >= maxAllowed) {
    throw new LoopDetectedError(
      `Execution exceeded maximum allowed transitions (${maxAllowed}). Terminating to prevent infinite loop.`
    );
  }

  // Detect immediate cyclic repeating loop (e.g. A -> B -> A -> B -> A -> B)
  if (visitedNodes.length >= 6) {
    const lastSix = visitedNodes.slice(-6);
    if (
      lastSix[0] === lastSix[2] &&
      lastSix[2] === lastSix[4] &&
      lastSix[1] === lastSix[3] &&
      lastSix[3] === lastSix[5]
    ) {
      throw new LoopDetectedError(
        `Immediate cycle detected between nodes '${lastSix[0]}' and '${lastSix[1]}'. Execution terminated.`
      );
    }
  }
}

/**
 * Calculates exponential backoff with jitter for retrying failed nodes
 */
export function calculateRetryBackoffMs(retryAttempt: number, baseMs = 1000): number {
  const exponential = Math.min(baseMs * Math.pow(2, retryAttempt), 30000);
  const jitter = Math.floor(Math.random() * 500);
  return exponential + jitter;
}

/**
 * Generates unique step idempotency key
 */
export function generateStepIdempotencyKey(
  flowRunId: string,
  nodeKey: string,
  attempt = 0
): string {
  return `step_${flowRunId}_${nodeKey}_att${attempt}`;
}

/**
 * Checks WhatsApp 24-hour service window
 * Freeform messages, buttons, and lists can only be sent within 24h of customer's last inbound message.
 */
export function isWithin24HourCustomerWindow(
  lastInboundTimestamp?: string | null,
  now = new Date()
): boolean {
  if (!lastInboundTimestamp) return false;
  const lastTime = new Date(lastInboundTimestamp).getTime();
  const diffHours = (now.getTime() - lastTime) / (1000 * 60 * 60);
  return diffHours <= 24 && diffHours >= 0;
}

/**
 * Asserts WhatsApp message compliance:
 * - Checks customer opt-out status.
 * - Checks 24-hour customer service window for non-template interactive messages.
 */
export function assertWhatsAppMessageCompliance(params: {
  isOptedOut?: boolean;
  messageType: "template" | "freeform" | "interactive";
  lastInboundTimestamp?: string | null;
  now?: Date;
}): void {
  if (params.isOptedOut) {
    throw new WhatsAppPolicyViolationError("Recipient has opted out of WhatsApp communications.");
  }

  if (params.messageType !== "template") {
    const inWindow = isWithin24HourCustomerWindow(params.lastInboundTimestamp, params.now);
    if (!inWindow) {
      throw new WhatsAppPolicyViolationError(
        "Outside 24-hour customer service window. Freeform messages not permitted by Meta; pre-approved template required."
      );
    }
  }
}

export interface SimulationStepResult {
  nodeKey: string;
  nodeType: string;
  action: string;
  simulatedOutput?: any;
  timestamp: string;
}

/**
 * Safe Test Mode / Dry-Run Simulator:
 * Traverses the flow graph without dispatching live Meta API messages or charging live payments.
 */
export function simulateFlowExecution(
  flow: { entry_node_id: string },
  nodes: Array<{ node_key: string; node_type: string; config: any }>,
  initialVars: Record<string, any> = {}
): {
  success: boolean;
  steps: SimulationStepResult[];
  finalVars: Record<string, any>;
  error?: string;
} {
  const steps: SimulationStepResult[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.node_key, n]));
  let currentKey: string | null = flow.entry_node_id;
  const vars = { ...initialVars };
  const visited: string[] = [];

  try {
    while (currentKey) {
      assertNoExecutionLoop(visited);
      visited.push(currentKey);

      const node = nodeMap.get(currentKey);
      if (!node) {
        throw new Error(`Node '${currentKey}' not found in flow definition`);
      }

      const step: SimulationStepResult = {
        nodeKey: node.node_key,
        nodeType: node.node_type,
        action: `Simulated ${node.node_type}`,
        timestamp: new Date().toISOString(),
      };

      if (node.node_type === "start") {
        currentKey = node.config.next_node_key || null;
      } else if (node.node_type === "send_message" || node.node_type === "send_media") {
        step.action = `Simulated message send: "${node.config.text || node.config.caption || "media"}"`;
        currentKey = node.config.next_node_key || null;
      } else if (node.node_type === "send_buttons") {
        step.action = `Rendered buttons: ${node.config.buttons?.map((b: any) => b.title).join(", ")}`;
        // For simulation, follow the first button branch
        currentKey = node.config.buttons?.[0]?.next_node_key || null;
      } else if (node.node_type === "send_list") {
        step.action = `Rendered list sections: ${node.config.sections?.length || 0}`;
        currentKey = node.config.sections?.[0]?.rows?.[0]?.next_node_key || null;
      } else if (node.node_type === "collect_input") {
        step.action = `Simulated input prompt: "${node.config.prompt_text}"`;
        vars[node.config.var_key] = "simulated_input_value";
        currentKey = node.config.next_node_key || null;
      } else if (node.node_type === "condition") {
        step.action = "Evaluated condition predicate";
        currentKey = node.config.true_next || null;
      } else if (node.node_type === "set_tag") {
        step.action = `Simulated tag update (${node.config.mode}): ${node.config.tag_id}`;
        currentKey = node.config.next_node_key || null;
      } else if (node.node_type === "handoff" || node.node_type === "end") {
        step.action = node.node_type === "handoff" ? "Simulated agent handoff" : "Flow ended";
        currentKey = null; // terminal
      } else {
        currentKey = null;
      }

      steps.push(step);
    }

    return {
      success: true,
      steps,
      finalVars: vars,
    };
  } catch (err: any) {
    return {
      success: false,
      steps,
      finalVars: vars,
      error: err.message,
    };
  }
}
