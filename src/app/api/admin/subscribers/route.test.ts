import { beforeEach, describe, expect, it, vi } from 'vitest'

let currentUserEmail = 'support@digisolvnet.com'
let currentUserId = 'user-super-admin'
let isDbSuperAdmin = true

const mockAccounts = [
  {
    id: 'acc-1',
    name: 'Client Alpha',
    subscription_status: 'active',
    plan_name: 'Monthly Pro',
    monthly_price: 999,
    currency: 'INR',
    billing_email: 'client@alpha.com',
    billing_phone: '+919876543210',
    current_period_ends_at: new Date(Date.now() + 15 * 86400000).toISOString(),
    created_at: new Date().toISOString(),
  },
]

const mockProfiles = [
  {
    account_id: 'acc-1',
    user_id: 'user-client-1',
    full_name: 'Alpha Owner',
    email: 'client@alpha.com',
    role: 'owner',
    account_role: 'owner',
    is_super_admin: false,
  },
]

function makeSupabaseMock() {
  return {
    auth: {
      getUser: vi.fn(async () => {
        if (!currentUserEmail) {
          return { data: { user: null }, error: { message: 'Not authenticated' } }
        }
        return {
          data: {
            user: { id: currentUserId, email: currentUserEmail },
          },
          error: null,
        }
      }),
    },
    from: vi.fn((table: string) => {
      let selectedFields = '*'
      const queryObj: any = {
        select: vi.fn((fields = '*') => {
          selectedFields = fields
          return queryObj
        }),
        eq: vi.fn((col: string, val: any) => {
          if (table === 'profiles' && col === 'user_id') {
            return {
              maybeSingle: vi.fn(async () => ({
                data: {
                  role: isDbSuperAdmin ? 'super_admin' : 'member',
                  is_super_admin: isDbSuperAdmin,
                  account_id: 'acc-1',
                },
                error: null,
              })),
            }
          }
          return queryObj
        }),
        in: vi.fn(() => Promise.resolve({ data: mockProfiles, error: null })),
        order: vi.fn(() => Promise.resolve({ data: mockAccounts, error: null })),
        insert: vi.fn((data: any) => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: { id: 'new-acc-id', ...data },
              error: null,
            })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      }
      return queryObj
    }),
  }
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => makeSupabaseMock()),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    ...makeSupabaseMock(),
    auth: {
      admin: {
        createUser: vi.fn(async ({ email, user_metadata }: any) => ({
          data: { user: { id: 'created-user-id', email } },
          error: null,
        })),
      },
    },
  })),
}))

import { GET, POST } from './route'

describe('Admin Subscribers API Route (/api/admin/subscribers)', () => {
  beforeEach(() => {
    currentUserEmail = 'support@digisolvnet.com'
    currentUserId = 'user-super-admin'
    isDbSuperAdmin = true
    process.env.SUPER_ADMIN_EMAILS = 'support@digisolvnet.com'
    delete process.env.NEXT_PUBLIC_DEMO_MODE
  })

  it('rejects unauthenticated requests with 401', async () => {
    currentUserEmail = ''
    const res = await GET()
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('rejects non-super-admin user with 403 Forbidden', async () => {
    currentUserEmail = 'customer@otherdomain.com'
    isDbSuperAdmin = false
    const res = await GET()
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toContain('Super Admin access required')
  })

  it('allows support@digisolvnet.com and returns subscribers list', async () => {
    currentUserEmail = 'support@digisolvnet.com'
    isDbSuperAdmin = true
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.subscribers).toBeDefined()
    expect(Array.isArray(json.subscribers)).toBe(true)
    expect(json.stats).toBeDefined()
    expect(json.stats.totalTenants).toBe(mockAccounts.length)
  })

  it('validates required fields when creating a subscriber (POST)', async () => {
    currentUserEmail = 'support@digisolvnet.com'
    const req = new Request('http://localhost/api/admin/subscribers', {
      method: 'POST',
      body: JSON.stringify({ name: '' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Customer/Business name and login email are required')
  })

  it('creates new subscriber successfully when Super Admin submits valid data', async () => {
    currentUserEmail = 'support@digisolvnet.com'
    const payload = {
      name: 'New Client Enterprise',
      owner_name: 'Rohit Sharma',
      owner_email: 'rohit@enterprise.com',
      phone: '+919876500000',
      plan_name: 'Monthly Pro',
      monthly_price: 999,
      status: 'active',
      trial_days: 14,
    }
    const req = new Request('http://localhost/api/admin/subscribers', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.subscriber).toBeDefined()
    expect(json.subscriber.name).toBe('New Client Enterprise')
  })
})
