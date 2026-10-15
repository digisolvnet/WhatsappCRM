import { beforeEach, describe, expect, it, vi } from 'vitest'

let userEmail = 'support@digisolvnet.com'
let userId = 'user-super-admin'
let isDbSuperAdmin = true

let mockAccount: any = {
  id: 'acc-123',
  name: 'Acme Corp',
  billing_phone: '+919876543210',
  billing_email: 'acme@test.com',
  monthly_price: 999,
  currency: 'INR',
  payment_link: 'https://pay.example.com/acme',
  current_period_ends_at: new Date(Date.now() + 3 * 86400000).toISOString(),
  reminder_count: 0,
}

const mockProfile = {
  account_id: 'acc-123',
  full_name: 'Acme Admin',
  email: 'acme@test.com',
  role: 'owner',
}

let updatePayload: any = null
let insertedMessagePayload: any = null

function makeMockDbClient() {
  return {
    auth: {
      getUser: vi.fn(async () => {
        if (!userEmail) return { data: { user: null }, error: { message: 'Unauthorized' } }
        return { data: { user: { id: userId, email: userEmail } }, error: null }
      }),
    },
    from: vi.fn((table: string) => {
      const q: any = {
        select: vi.fn(() => q),
        order: vi.fn(() => q),
        limit: vi.fn(() => q),
        eq: vi.fn((col: string, val: any) => {
          if (table === 'profiles' && col === 'user_id') {
            return {
              maybeSingle: vi.fn(async () => ({
                data: {
                  role: isDbSuperAdmin ? 'super_admin' : 'member',
                  is_super_admin: isDbSuperAdmin,
                  account_id: 'acc-admin-main',
                },
                error: null,
              })),
            }
          }
          if (table === 'accounts' && col === 'id') {
            return {
              maybeSingle: vi.fn(async () => ({ data: mockAccount, error: null })),
              single: vi.fn(async () => ({ data: mockAccount, error: null })),
              update: vi.fn((data: any) => {
                updatePayload = data
                return { eq: vi.fn(async () => ({ error: null })) }
              }),
            }
          }
          if (table === 'contacts' && col === 'account_id') {
            return {
              eq: vi.fn((col2: string) => ({
                maybeSingle: vi.fn(async () => ({ data: { id: 'contact-acme-id' }, error: null })),
              })),
            }
          }
          if (table === 'conversations' && col === 'account_id') {
            return {
              eq: vi.fn((col2: string) => ({
                maybeSingle: vi.fn(async () => ({ data: { id: 'conv-acme-id' }, error: null })),
              })),
            }
          }
          if (table === 'profiles' && col === 'account_id') {
            return Promise.resolve({ data: [mockProfile], error: null })
          }
          if (table === 'platform_billing_settings' && col === 'id') {
            return {
              single: vi.fn(async () => ({
                data: {
                  reminder_message_template: 'Hello {{name}}, pay {{amount}} for {{account_name}} here: {{payment_link}}',
                  default_payment_link: 'https://pay.default.com',
                },
                error: null,
              })),
            }
          }
          if (table === 'whatsapp_config') {
            return {
              limit: vi.fn(async () => ({
                data: [
                  {
                    id: 'wac-1',
                    account_id: 'acc-admin-main',
                    phone_number_id: '123456789',
                    access_token: 'encrypted_token',
                    status: 'connected',
                  },
                ],
                error: null,
              })),
            }
          }
          return q
        }),
        update: vi.fn((data: any) => {
          updatePayload = data
          return {
            eq: vi.fn(async () => ({ error: null })),
          }
        }),
        insert: vi.fn((data: any) => {
          if (table === 'messages') {
            insertedMessagePayload = data
          }
          return {
            select: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: { id: `${table}-new-id`, ...data }, error: null })),
              single: vi.fn(async () => ({ data: { id: `${table}-new-id`, ...data }, error: null })),
            })),
          }
        }),
      }
      return q
    }),
  }
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => makeMockDbClient()),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => makeMockDbClient()),
}))

vi.mock('@/lib/whatsapp/meta-api', () => ({
  sendTextMessage: vi.fn(async () => ({ success: true })),
}))

vi.mock('@/lib/whatsapp/encryption', () => ({
  decrypt: vi.fn(() => 'decrypted_access_token'),
}))

import { POST } from './route'

describe('Admin Subscriber Remind Route (/api/admin/subscribers/[id]/remind)', () => {
  beforeEach(() => {
    userEmail = 'support@digisolvnet.com'
    userId = 'user-super-admin'
    isDbSuperAdmin = true
    updatePayload = null
    insertedMessagePayload = null
    delete process.env.NEXT_PUBLIC_DEMO_MODE
    process.env.SUPER_ADMIN_EMAILS = 'support@digisolvnet.com'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_service_key'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co'
    mockAccount = {
      id: 'acc-123',
      name: 'Acme Corp',
      billing_phone: '+919876543210',
      billing_email: 'acme@test.com',
      monthly_price: 999,
      currency: 'INR',
      payment_link: 'https://pay.example.com/acme',
      current_period_ends_at: new Date(Date.now() + 3 * 86400000).toISOString(),
      reminder_count: 0,
    }
  })

  it('rejects non-admin reminder request with 403', async () => {
    userEmail = 'customer@other.com'
    isDbSuperAdmin = false
    const req = new Request('http://localhost/api/admin/subscribers/acc-123/remind', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'acc-123' }) })
    expect(res.status).toBe(403)
  })

  it('formats reminder message, sends via WhatsApp, and records in CRM Inbox', async () => {
    const req = new Request('http://localhost/api/admin/subscribers/acc-123/remind', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'acc-123' }) })
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.sentViaApi).toBe(true)
    expect(json.recipientPhone).toBe('+919876543210')
    expect(json.messageText).toContain('Acme Admin')
    expect(json.messageText).toContain('INR 999')
    expect(json.inboxUrl).toBe('/inbox?c=conv-acme-id')
    expect(json.conversationId).toBe('conv-acme-id')

    // Verify reminder logged directly in CRM Inbox messages table
    expect(insertedMessagePayload).toBeDefined()
    expect(insertedMessagePayload.conversation_id).toBe('conv-acme-id')
    expect(insertedMessagePayload.sender_type).toBe('agent')
    expect(insertedMessagePayload.content_text).toContain('Acme Admin')

    // Verify dbClient executed update on accounts table
    expect(updatePayload).toBeDefined()
    expect(updatePayload.last_reminder_sent_at).toBeDefined()
    expect(updatePayload.reminder_count).toBe(1)
  })

  it('returns 400 error when recipient has no phone number', async () => {
    mockAccount.billing_phone = ''

    const req = new Request('http://localhost/api/admin/subscribers/acc-123/remind', {
      method: 'POST',
      body: JSON.stringify({ phone: '' }),
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'acc-123' }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('No billing phone number specified')
  })
})
