import { beforeEach, describe, expect, it, vi } from 'vitest'

let userEmail = 'support@digisolvnet.com'
let userId = 'user-super-admin'
let isDbSuperAdmin = true

const mockAccount = {
  id: 'acc-789',
  name: 'Delta Corp',
  subscription_status: 'trial',
  monthly_price: 999,
  currency: 'INR',
}

let patchUpdates: any = null
let deletedId: string | null = null

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
          if (table === 'accounts' && col === 'id') {
            return {
              select: vi.fn(() => ({
                single: vi.fn(async () => ({ data: { ...mockAccount, ...patchUpdates }, error: null })),
              })),
            }
          }
          return q
        }),
        update: vi.fn((updates: any) => {
          patchUpdates = updates
          return {
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => ({ data: { ...mockAccount, ...updates }, error: null })),
              })),
            })),
          }
        }),
        delete: vi.fn(() => ({
          eq: vi.fn((col: string, val: string) => {
            deletedId = val
            return Promise.resolve({ error: null })
          }),
        })),
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

import { PATCH, DELETE } from './route'

describe('Admin Subscriber Detail Route (/api/admin/subscribers/[id])', () => {
  beforeEach(() => {
    userEmail = 'support@digisolvnet.com'
    userId = 'user-super-admin'
    isDbSuperAdmin = true
    patchUpdates = null
    deletedId = null
    delete process.env.NEXT_PUBLIC_DEMO_MODE
    process.env.SUPER_ADMIN_EMAILS = 'support@digisolvnet.com'
  })

  it('rejects unauthorized PATCH requests with 403', async () => {
    userEmail = 'regular@tenant.com'
    isDbSuperAdmin = false
    const req = new Request('http://localhost/api/admin/subscribers/acc-789', {
      method: 'PATCH',
      body: JSON.stringify({ subscription_status: 'active' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'acc-789' }) })
    expect(res.status).toBe(403)
  })

  it('allows Super Admin to update subscriber subscription status (PATCH)', async () => {
    const req = new Request('http://localhost/api/admin/subscribers/acc-789', {
      method: 'PATCH',
      body: JSON.stringify({
        subscription_status: 'active',
        monthly_price: 1499,
        notes: 'VIP customer',
      }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'acc-789' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(patchUpdates.subscription_status).toBe('active')
    expect(patchUpdates.monthly_price).toBe(1499)
    expect(patchUpdates.notes).toBe('VIP customer')
  })

  it('rejects unauthorized DELETE requests with 403', async () => {
    userEmail = 'regular@tenant.com'
    isDbSuperAdmin = false
    const req = new Request('http://localhost/api/admin/subscribers/acc-789', {
      method: 'DELETE',
    })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'acc-789' }) })
    expect(res.status).toBe(403)
  })

  it('allows Super Admin to delete subscriber account (DELETE)', async () => {
    const req = new Request('http://localhost/api/admin/subscribers/acc-789', {
      method: 'DELETE',
    })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'acc-789' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(deletedId).toBe('acc-789')
  })
})
