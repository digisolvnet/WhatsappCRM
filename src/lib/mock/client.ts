import {
  MOCK_USER,
  MOCK_PROFILE,
  MOCK_PROFILES,
  MOCK_ACCOUNT,
  MOCK_ACCOUNT_ID,
  MOCK_USER_ID,
  MOCK_TAGS,
  MOCK_CONTACTS,
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
  MOCK_PIPELINES,
  MOCK_STAGES,
  MOCK_DEALS,
  MOCK_AUTOMATIONS,
  MOCK_BROADCASTS,
  MOCK_SUBSCRIBERS,
  MOCK_SUBSCRIPTION_PAYMENTS,
  MOCK_PLATFORM_SETTINGS,
  MOCK_PAYMENT_GATEWAYS,
  MOCK_CRM_PAYMENT_LINKS,
} from "./data";

export function isDemoMode(): boolean {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  }
  return (
    document.cookie.includes("wacrm_demo=true") ||
    process.env.NEXT_PUBLIC_DEMO_MODE === "true"
  );
}

const STORAGE_KEY_CONVS = "wacrm:mock:conversations";
const STORAGE_KEY_MSGS = "wacrm:mock:messages";
const STORAGE_KEY_CONTACTS = "wacrm:mock:contacts";

export function getMockContacts(): any[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CONTACTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return MOCK_CONTACTS;
}

export function getMockConversations(): any[] {
  let convs = MOCK_CONVERSATIONS;
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CONVS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) convs = parsed;
      }
    } catch {}
  }

  // Ensure every conversation has contact joined and account_id attached
  const contacts = getMockContacts();
  return convs.map((c) => {
    if (!c.contact && c.contact_id) {
      const found = contacts.find((ct) => ct.id === c.contact_id);
      if (found) return { ...c, account_id: c.account_id || MOCK_ACCOUNT_ID, contact: found };
    }
    return { ...c, account_id: c.account_id || MOCK_ACCOUNT_ID };
  });
}

export function getMockMessages(convId?: string): any[] {
  let msgsMap = MOCK_MESSAGES;
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MSGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") msgsMap = parsed;
      }
    } catch {}
  }

  if (convId) {
    return msgsMap[convId] ? [...msgsMap[convId]] : [];
  }
  return Object.values(msgsMap).flat();
}

export function syncMockContact(contact: any) {
  const current = getMockContacts();
  const idx = current.findIndex((c) => c.id === contact.id || (contact.phone && c.phone === contact.phone));
  if (idx >= 0) {
    current[idx] = { ...current[idx], ...contact };
  } else {
    current.unshift(contact);
  }
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(current));
    } catch {}
  }
}

export function syncMockConversation(conv: any) {
  const current = getMockConversations();
  const idx = current.findIndex((c) => c.id === conv.id);
  if (idx >= 0) {
    current[idx] = { ...current[idx], ...conv };
    // Move to top
    if (idx > 0) {
      const [item] = current.splice(idx, 1);
      current.unshift(item);
    }
  } else {
    current.unshift(conv);
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_CONVS, JSON.stringify(current));
    } catch {}
  }
}

export function syncMockMessage(msg: any) {
  let msgsMap: Record<string, any[]> = MOCK_MESSAGES;
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MSGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") msgsMap = parsed;
      }
    } catch {}
  }

  const convId = msg.conversation_id;
  if (!msgsMap[convId]) {
    msgsMap[convId] = [];
  }
  const existingIdx = msgsMap[convId].findIndex((m) => m.id === msg.id);
  if (existingIdx >= 0) {
    msgsMap[convId][existingIdx] = { ...msgsMap[convId][existingIdx], ...msg };
  } else {
    msgsMap[convId].push(msg);
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_MSGS, JSON.stringify(msgsMap));
    } catch {}
  }

  // Also update parent conversation preview
  const currentConvs = getMockConversations();
  const conv = currentConvs.find((c) => c.id === convId);
  if (conv) {
    conv.last_message_text = msg.content_text || msg.message || "[Message]";
    conv.last_message_at = msg.created_at || new Date().toISOString();
    conv.status = "open";
    syncMockConversation(conv);
  }
}

function getTableData(table: string): any[] {
  switch (table) {
    case "profiles":
      return MOCK_PROFILES;
    case "accounts":
      return MOCK_SUBSCRIBERS;
    case "subscription_payments":
      return MOCK_SUBSCRIPTION_PAYMENTS;
    case "platform_billing_settings":
      return [MOCK_PLATFORM_SETTINGS];
    case "tags":
      return MOCK_TAGS;
    case "contacts":
      return getMockContacts();
    case "conversations":
      return getMockConversations();
    case "pipelines":
      return MOCK_PIPELINES;
    case "pipeline_stages":
      return MOCK_STAGES;
    case "deals":
      return MOCK_DEALS;
    case "automations":
      return MOCK_AUTOMATIONS;
    case "broadcasts":
      return MOCK_BROADCASTS;
    case "contact_tags":
      return [
        { id: "ct-1", contact_id: "contact-1", tag_id: "tag-1" },
        { id: "ct-2", contact_id: "contact-1", tag_id: "tag-3" },
        { id: "ct-3", contact_id: "contact-2", tag_id: "tag-2" },
      ];
    case "whatsapp_config":
      return [
        {
          id: "mock-wa-config-1",
          account_id: MOCK_ACCOUNT_ID,
          user_id: MOCK_USER_ID,
          status: "connected",
          phone_number: "+1 555-0199",
          display_phone_number: "+1 (555) 0199",
          phone_number_id: "mock-phone-num-id",
          waba_id: "mock-waba-id",
          access_token: "mock-access-token",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
    case "messages":
      return getMockMessages();
    case "account_payment_gateways":
      return MOCK_PAYMENT_GATEWAYS;
    case "crm_payment_links":
      return MOCK_CRM_PAYMENT_LINKS;
    default:
      return [];
  }
}

class MockQueryBuilder {
  private table: string;
  private data: any[];
  private isSingle = false;

  constructor(table: string) {
    this.table = table;
    this.data = [...getTableData(table)];
  }

  select(columns = "*", options?: { count?: string; head?: boolean }) {
    if (options?.head) {
      this.data = [];
    }
    return this;
  }

  eq(column: string, value: any) {
    this.data = this.data.filter((item) => item[column] === value);
    return this;
  }

  neq(column: string, value: any) {
    this.data = this.data.filter((item) => item[column] !== value);
    return this;
  }

  in(column: string, values: any[]) {
    this.data = this.data.filter((item) => values.includes(item[column]));
    return this;
  }

  is(column: string, value: any) {
    this.data = this.data.filter((item) => item[column] === value);
    return this;
  }

  or(filterStr: string) {
    return this;
  }

  gt(column: string, value: any) {
    return this;
  }

  gte(column: string, value: any) {
    return this;
  }

  lte(column: string, value: any) {
    return this;
  }

  lt(column: string, value: any) {
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    const ascending = options?.ascending ?? true;
    this.data.sort((a, b) => {
      const valA = a[column] ?? "";
      const valB = b[column] ?? "";
      if (valA < valB) return ascending ? -1 : 1;
      if (valA > valB) return ascending ? 1 : -1;
      return 0;
    });
    return this;
  }

  range(from: number, to: number) {
    this.data = this.data.slice(from, to + 1);
    return this;
  }

  limit(count: number) {
    this.data = this.data.slice(0, count);
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isSingle = true;
    return this;
  }

  insert(payload: any) {
    const rawArr = Array.isArray(payload) ? payload : [payload];
    const insertedItems = rawArr.map((item) => {
      const fullItem = {
        id: item.id || `${this.table === "messages" ? "msg" : this.table.slice(0, 4)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        created_at: item.created_at || new Date().toISOString(),
        ...item,
      };

      if (this.table === "messages") {
        syncMockMessage(fullItem);
      } else if (this.table === "conversations") {
        syncMockConversation(fullItem);
      } else if (this.table === "contacts") {
        syncMockContact(fullItem);
      }

      return fullItem;
    });

    return {
      select: () => ({
        single: async () => ({ data: insertedItems[0], error: null }),
        maybeSingle: async () => ({ data: insertedItems[0], error: null }),
        then: (resolve: any) => resolve({ data: insertedItems, error: null }),
      }),
      then: (resolve: any) => resolve({ data: insertedItems, error: null }),
    };
  }

  upsert(payload: any, options?: any) {
    return this.insert(payload);
  }

  update(payload: any) {
    const table = this.table;
    return {
      eq: (column: string, value: any) => {
        if (table === "conversations") {
          const convs = getMockConversations();
          const target = convs.find((c) => c[column] === value);
          if (target) {
            Object.assign(target, payload);
            syncMockConversation(target);
          }
        } else if (table === "messages") {
          const msgs = getMockMessages();
          const target = msgs.find((m) => m[column] === value);
          if (target) {
            Object.assign(target, payload);
            syncMockMessage(target);
          }
        }
        return {
          then: (resolve: any) => resolve({ data: payload, error: null }),
        };
      },
      then: (resolve: any) => resolve({ data: payload, error: null }),
    };
  }

  delete() {
    return {
      eq: () => ({
        then: (resolve: any) => resolve({ data: null, error: null }),
      }),
      in: () => ({
        then: (resolve: any) => resolve({ data: null, error: null }),
      }),
      then: (resolve: any) => resolve({ data: null, error: null }),
    };
  }

  then(resolve: (res: { data: any; count: number; error: null }) => void) {
    const resultData = this.isSingle ? (this.data[0] ?? null) : this.data;
    return Promise.resolve({
      data: resultData,
      count: this.data.length,
      error: null,
    }).then(resolve);
  }
}

export function createMockClient(): any {
  return {
    from: (table: string) => new MockQueryBuilder(table),
    rpc: async (fn: string, params?: any) => {
      if (fn === "filter_contacts_by_tags") {
        const contacts = getMockContacts();
        return {
          data: contacts.map((c) => ({ contact: c, total_count: contacts.length })),
          error: null,
        };
      }
      return { data: null, error: null };
    },
    auth: {
      getSession: async () => ({
        data: {
          session: {
            user: MOCK_USER,
            access_token: "mock-token",
          },
        },
        error: null,
      }),
      getUser: async () => ({
        data: { user: MOCK_USER },
        error: null,
      }),
      signInWithPassword: async () => ({
        data: { user: MOCK_USER, session: { access_token: "mock-token" } },
        error: null,
      }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      }),
    },
    channel: () => {
      const channelObj: any = {
        on: function () {
          return channelObj;
        },
        subscribe: () => ({
          unsubscribe: () => {},
        }),
        unsubscribe: () => {},
      };
      return channelObj;
    },
    removeChannel: async () => "ok",
    getChannels: () => [],
  };
}
