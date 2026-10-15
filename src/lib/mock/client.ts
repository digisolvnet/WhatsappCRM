import {
  MOCK_USER,
  MOCK_PROFILE,
  MOCK_ACCOUNT,
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
} from "./data";

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    document.cookie.includes("wacrm_demo=true") ||
    process.env.NEXT_PUBLIC_DEMO_MODE === "true"
  );
}

function getTableData(table: string): any[] {
  switch (table) {
    case "profiles":
      return [MOCK_PROFILE];
    case "accounts":
      return MOCK_SUBSCRIBERS;
    case "subscription_payments":
      return MOCK_SUBSCRIPTION_PAYMENTS;
    case "platform_billing_settings":
      return [MOCK_PLATFORM_SETTINGS];
    case "tags":
      return MOCK_TAGS;
    case "contacts":
      return MOCK_CONTACTS;
    case "conversations":
      return MOCK_CONVERSATIONS;
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
      return [{ status: "connected", phone_number: "+1 555-0199", display_phone_number: "+1 (555) 0199" }];
    case "messages":
      return Object.values(MOCK_MESSAGES).flat();
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
    const arr = Array.isArray(payload) ? payload : [payload];
    return {
      select: () => ({
        single: async () => ({ data: arr[0], error: null }),
        maybeSingle: async () => ({ data: arr[0], error: null }),
        then: (resolve: any) => resolve({ data: arr, error: null }),
      }),
      then: (resolve: any) => resolve({ data: arr, error: null }),
    };
  }

  upsert(payload: any, options?: any) {
    const arr = Array.isArray(payload) ? payload : [payload];
    return {
      select: () => ({
        single: async () => ({ data: arr[0], error: null }),
        maybeSingle: async () => ({ data: arr[0], error: null }),
        then: (resolve: any) => resolve({ data: arr, error: null }),
      }),
      then: (resolve: any) => resolve({ data: arr, error: null }),
    };
  }

  update(payload: any) {
    return {
      eq: () => ({
        then: (resolve: any) => resolve({ data: payload, error: null }),
      }),
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
        return {
          data: MOCK_CONTACTS.map((c) => ({ contact: c, total_count: MOCK_CONTACTS.length })),
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
    channel: () => ({
      on: function () {
        return this;
      },
      subscribe: () => ({
        unsubscribe: () => {},
      }),
      unsubscribe: () => {},
    }),
    removeChannel: async () => "ok",
    getChannels: () => [],
  };
}
