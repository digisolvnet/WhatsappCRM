import { beforeEach, describe, expect, it, vi } from 'vitest'

let userEmail = 'support@digisolvnet.com'
let userId = 'user-super-admin'
let isDbSuperAdmin = true

const mockSettings = {
  id: 'default',
  default_monthly_price: 999,
  default_currency: 'INR',
  default_trial_days: 14,
  default_payment_link: 'https://pay.example.com',
  super_admin_whatsapp: '+919876543210',
  reminder_days_before: [3, 1, 0],
  reminder_message_template: 'Reminder for {{name}}',
}

let upsertedSettings: any = null

function makeMockSupabase() {
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
        eq: vi.fn((col: string, val: any) => {
          if (table === 'profiles' && col === 'user_id') {
            return {
              maybeSingle: vi.fn(async () => ({
                data: { role: isDbSuperAdmin ? 'super_admin' : 'member', is_super_admin: isDbSuperAdmin },
                error: null,
              })),
            }
          }
          if (table === 'platform_billing_settings' && col === 'id') {
            return {
              single: vi.fn(async () => ({ data: mockSettings, error: null })),
            }
          }
          return q
        }),
        upsert: vi.fn((data: any) => {
          upsertedSettings = data
          return {
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { ...mockSettings, ...data }, error: null })),
            })),
          }
        }),
      }
      return q
    }),
  }
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => makeMockSupabase()),
}))

import { GET, POST } from './route'

describe('Admin Platform Settings API Route (/api/admin/settings)', () => {
  beforeEach(() => {
    userEmail = 'support@digisolvnet.com'
    userId = 'user-super-admin'
    isDbSuperAdmin = true
    upsertedSettings = null
    delete process.env.NEXT_PUBLIC_DEMO_MODE
    process.env.SUPER_ADMIN_EMAILS = 'support@digisolvnet.com'
  })

  it('allows fetching platform settings via GET', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.settings).toBeDefined()
    expect(json.settings.default_currency).toBe('INR')
    expect(json.settings.default_monthly_price).toBe(999)
  })

  it('rejects unauthorized POST to update settings with 403', async () => {
    userEmail = 'tenant@client.com'
    isDbSuperAdmin = false
    const req = new Request('http://localhost/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify({ default_monthly_price: 1999 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('allows Super Admin to update platform settings via POST', async () => {
    const req = new Request('http://localhost/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify({
        default_monthly_price: 1299,
        default_currency: 'INR',
        default_trial_days: 7,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(upsertedSettings.default_monthly_price).toBe(1299)
    expect(upsertedSettings.default_currency).toBe('INR')
    expect(upsertedSettings.default_trial_days).toBe(7)
  })
})
