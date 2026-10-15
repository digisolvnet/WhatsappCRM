import { beforeEach, describe, expect, it, vi } from 'vitest'

let userEmail = 'support@digisolvnet.com'
let userId = 'user-super-admin'
let isDbSuperAdmin = true

const mockAccount = {
  id: 'acc-456',
  name: 'Beta Tech',
  subscription_status: 'past_due',
  monthly_price: 999,
  currency: 'INR',
  current_period_ends_at: new Date(Date.now() - 2 * 86400000).toISOString(),
}

let updatedAccountPayload: any = null
let paymentRecordPayload: any = null

function makeMockSupabase() {
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: userId, email: userEmail } },
        error: null,
      })),
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
          if (table === 'accounts' && col === 'id') {
            return {
              single: vi.fn(async () => ({ data: mockAccount, error: null })),
              select: vi.fn(() => ({
                single: vi.fn(async () => ({ data: { ...mockAccount, ...updatedAccountPayload }, error: null })),
              })),
            }
          }
          return q
        }),
        update: vi.fn((data: any) => {
          updatedAccountPayload = data
          return {
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => ({ data: { ...mockAccount, ...data }, error: null })),
              })),
            })),
          }
        }),
        insert: vi.fn((data: any) => {
          paymentRecordPayload = data
          return Promise.resolve({ data, error: null })
        }),
      }
      return q
    }),
  }
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => makeMockSupabase()),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => makeMockSupabase()),
}))

import { POST } from './route'

describe('Admin Subscriber Renew Route (/api/admin/subscribers/[id]/renew)', () => {
  beforeEach(() => {
    userEmail = 'support@digisolvnet.com'
    userId = 'user-super-admin'
    isDbSuperAdmin = true
    updatedAccountPayload = null
    paymentRecordPayload = null
    delete process.env.NEXT_PUBLIC_DEMO_MODE
    process.env.SUPER_ADMIN_EMAILS = 'support@digisolvnet.com'
  })

  it('rejects non-admin renewal request with 403', async () => {
    userEmail = 'unauthorized@user.com'
    isDbSuperAdmin = false
    const req = new Request('http://localhost/api/admin/subscribers/acc-456/renew', {
      method: 'POST',
      body: JSON.stringify({ days: 30 }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'acc-456' }) })
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toContain('Super Admin access required')
  })

  it('renews subscription for 30 days and logs payment record', async () => {
    const req = new Request('http://localhost/api/admin/subscribers/acc-456/renew', {
      method: 'POST',
      body: JSON.stringify({
        days: 30,
        amount: 999,
        paymentMethod: 'upi',
        referenceId: 'UPI-REF-998877',
      }),
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'acc-456' }) })
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.message).toContain('extended by 30 days')

    // Verify account status became active
    expect(updatedAccountPayload.subscription_status).toBe('active')
    expect(updatedAccountPayload.reminder_count).toBe(0)

    // Verify payment was recorded
    expect(paymentRecordPayload).toBeDefined()
    expect(paymentRecordPayload.amount).toBe(999)
    expect(paymentRecordPayload.payment_method).toBe('upi')
    expect(paymentRecordPayload.reference_id).toBe('UPI-REF-998877')
    expect(paymentRecordPayload.account_id).toBe('acc-456')
  })
})
