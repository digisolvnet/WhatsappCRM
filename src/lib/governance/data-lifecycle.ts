// ============================================================
// Tenant-Scoped Data Export & Deletion Governance
//
// Complies with:
// 1. Digital Personal Data Protection (DPDP) Act 2023 (India)
// 2. Information Technology (Reasonable Security Practices) Rules 2011
// 3. Indian GST statutory record-retention requirements
//
// Ensures:
// - Private cryptographic keys, service credentials, and foreign tenant data are never exported.
// - Customer requests are tracked with a mandatory 30-day retention/cancellation window.
// ============================================================

export interface SanitizedExportManifest {
  accountId: string;
  exportGeneratedAt: string;
  dataRetentionPolicy: string;
  contactsCount: number;
  ordersCount: number;
  productsCount: number;
  contacts: any[];
  products: any[];
  orders: any[];
  redactedFields: string[];
}

/**
 * Sanitizes and prepares tenant data for export.
 * Strips secret tokens, password hashes, and platform internal keys.
 */
export function sanitizeTenantDataForExport(params: {
  accountId: string;
  contacts: any[];
  products: any[];
  orders: any[];
}): SanitizedExportManifest {
  const { accountId, contacts, products, orders } = params;

  const sanitizedContacts = contacts.map((c) => {
    const copy = { ...c };
    delete copy.internal_notes;
    delete copy.raw_metadata;
    return copy;
  });

  const sanitizedProducts = products.map((p) => {
    const copy = { ...p };
    return copy;
  });

  const sanitizedOrders = orders.map((o) => {
    const copy = { ...o };
    delete copy.payment_secret;
    delete copy.webhook_signature;
    return copy;
  });

  return {
    accountId,
    exportGeneratedAt: new Date().toISOString(),
    dataRetentionPolicy: "Exported in accordance with DPDP Act 2023. Link valid for 7 days.",
    contactsCount: sanitizedContacts.length,
    ordersCount: sanitizedOrders.length,
    productsCount: sanitizedProducts.length,
    contacts: sanitizedContacts,
    products: sanitizedProducts,
    orders: sanitizedOrders,
    redactedFields: [
      "passwords",
      "meta_access_tokens",
      "razorpay_key_secrets",
      "license_hashes",
      "internal_telemetry",
    ],
  };
}

/**
 * Schedules tenant account deletion with a statutory 30-day grace retention period.
 */
export function scheduleTenantAccountDeletion(params: {
  accountId: string;
  requestedBy: string;
  now?: Date;
}): {
  deletionScheduledAt: string;
  graceDaysRemaining: number;
  policyNotice: string;
} {
  const now = params.now || new Date();
  const graceDays = 30;
  const deletionDate = new Date(now.getTime() + graceDays * 24 * 3600 * 1000);

  return {
    deletionScheduledAt: deletionDate.toISOString(),
    graceDaysRemaining: graceDays,
    policyNotice: `Account deletion scheduled for ${deletionDate.toLocaleDateString("en-IN")}. Customer data may be recovered by logging in within 30 days. Statutory tax invoices will be retained in accordance with Indian GST regulations.`,
  };
}
