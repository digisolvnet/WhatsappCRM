import crypto from "crypto";

export interface CreatePaymentLinkParams {
  keyId: string;
  keySecret: string;
  amount: number; // in standard currency units, e.g. 500 for ₹500
  currency?: string;
  description: string;
  customer?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  callbackUrl?: string;
}

export interface RazorpayPaymentLinkResponse {
  id: string;
  short_url: string;
  status: string;
  amount: number;
  currency: string;
  description: string;
}

export interface CreateOrderParams {
  keyId: string;
  keySecret: string;
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status: string;
}

/**
 * Creates a standard Razorpay Payment Link (supports UPI, GPay, PhonePe, Cards, NetBanking, Wallets).
 */
export async function createRazorpayPaymentLink(
  params: CreatePaymentLinkParams
): Promise<RazorpayPaymentLinkResponse> {
  const {
    keyId,
    keySecret,
    amount,
    currency = "INR",
    description,
    customer,
    notes = {},
    callbackUrl,
  } = params;

  const isDemo =
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
    !keyId ||
    !keySecret ||
    keyId.includes("dummy") ||
    keyId.includes("placeholder");

  // In demo mode or if placeholder keys are supplied, return an interactive simulated payment link
  if (isDemo) {
    const mockId = `plink_demo_${Date.now()}`;
    return {
      id: mockId,
      short_url: `https://rzp.io/i/${mockId.replace("plink_", "")}`,
      status: "created",
      amount,
      currency,
      description,
    };
  }

  const amountInSubunits = Math.round(amount * 100);
  const cleanPhone = customer?.contact ? customer.contact.replace(/[^\d+]/g, "") : undefined;

  const payload: any = {
    amount: amountInSubunits,
    currency: currency.toUpperCase(),
    accept_partial: false,
    description: description.slice(0, 255),
    notes,
    reminder_enable: true,
  };

  if (customer && (customer.name || customer.email || cleanPhone)) {
    payload.customer = {
      name: customer.name || "Customer",
      email: customer.email || undefined,
      contact: cleanPhone || undefined,
    };
  }

  if (callbackUrl) {
    payload.callback_url = callbackUrl;
    payload.callback_method = "get";
  }

  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

  const response = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errMessage = data?.error?.description || data?.error?.message || `Razorpay error: HTTP ${response.status}`;
    throw new Error(errMessage);
  }

  return {
    id: data.id,
    short_url: data.short_url,
    status: data.status,
    amount: data.amount / 100,
    currency: data.currency,
    description: data.description,
  };
}

/**
 * Creates a standard Razorpay Order for Checkout popup / button.
 */
export async function createRazorpayOrder(
  params: CreateOrderParams
): Promise<RazorpayOrderResponse> {
  const { keyId, keySecret, amount, currency = "INR", receipt, notes = {} } = params;

  const isDemo =
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
    !keyId ||
    !keySecret ||
    keyId.includes("dummy") ||
    keyId.includes("placeholder");

  if (isDemo) {
    const mockOrderId = `order_demo_${Date.now()}`;
    return {
      id: mockOrderId,
      amount,
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      status: "created",
    };
  }

  const amountInSubunits = Math.round(amount * 100);
  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify({
      amount: amountInSubunits,
      currency: currency.toUpperCase(),
      receipt: receipt || `rcpt_${Date.now()}`,
      notes,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errMessage = data?.error?.description || data?.error?.message || `Razorpay order creation failed: HTTP ${response.status}`;
    throw new Error(errMessage);
  }

  return {
    id: data.id,
    amount: data.amount / 100,
    currency: data.currency,
    receipt: data.receipt,
    status: data.status,
  };
}

/**
 * Verifies Razorpay checkout payment signature.
 */
export function verifyRazorpayPaymentSignature({
  keySecret,
  orderId,
  paymentId,
  signature,
}: {
  keySecret: string;
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true" && signature.startsWith("demo_sig_")) {
    return true;
  }
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");
  return expectedSignature === signature;
}

/**
 * Verifies Razorpay webhook payload signature.
 */
export function verifyRazorpayWebhookSignature({
  webhookSecret,
  rawPayload,
  signature,
}: {
  webhookSecret: string;
  rawPayload: string;
  signature: string;
}): boolean {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true" && signature === "demo_webhook_signature") {
    return true;
  }
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawPayload)
    .digest("hex");
  return expectedSignature === signature;
}
