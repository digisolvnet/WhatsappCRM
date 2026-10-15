import { beforeEach, describe, expect, it, vi } from 'vitest'

let authUser: any = { id: 'usr-123', email: 'support@digisolvnet.com' }
let existingProfile: any = null
let existingAccount: any = null
let upsertedProfile: any = null

function makeMockDb() {
  return {
    auth: {
      getUser: vi.fn(async () => {
        if (!authUser) return { data: { user: null }, error: { message: 'No session' } }
        return { data: { user: authUser }, error: null }
      }),
    },
    from: vi.fn((table: string) => {
      const q: any = {
        select: vi.fn(() => q),
        eq: vi.fn((col: string, val: any) => {
          if (table === 'profiles' && col === 'user_id') {
            return {
              maybeSingle: vi.fn(async () => ({ data: existingProfile, error: null })),
            }
          }
          if (table === 'accounts' && col === 'id') {
            return {
              maybeSingle: vi.fn(async () => ({ data: existingAccount, error: null })),
            }
          }
          return q
        }),
        or: vi.fn(() => q),
        order: vi.fn(() => q),
        limit: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: existingAccount, error: null })),
        })),
        upsert: vi.fn((data: any) => {
          upsertedProfile = data
          return {
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { id: 'prof-id', ...data }, error: null })),
            })),
          }
        }),
        insert: vi.fn((data: any) => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: { id: 'new-id', ...data }, error: null })),
          })),
        })),
        update: vi.fn((data: any) => ({
          eq: vi.fn(async () => ({ error: null })),
        })),
      }
      return q
    }),
  }
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => makeMockDb()),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => makeMockDb()),
}))

import { POST } from './route'

describe('Account Bootstrap API Route (/api/account/bootstrap)', () => {
  beforeEach(() => {
    authUser = { id: 'usr-123', email: 'support@digisolvnet.com' }
    existingProfile = null
    existingAccount = { id: 'acc-main', name: 'DIGISOLVNET Admin Workspace' }
    upsertedProfile = null
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_key'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co'
  })

  it('returns 401 when user is not authenticated', async () => {
    authUser = null
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it('bootstraps super admin profile for support@digisolvnet.com when missing', async () => {
    const res = await POST()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.profile.is_super_admin).toBe(true)
    expect(json.profile.role).toBe('super_admin')

    // Verify profile was provisioned as super_admin
    expect(upsertedProfile).toBeDefined()
    expect(upsertedProfile.user_id).toBe('usr-123')
    expect(upsertedProfile.email).toBe('support@digisolvnet.com')
    expect(upsertedProfile.role).toBe('super_admin')
    expect(upsertedProfile.is_super_admin).toBe(true)
    expect(upsertedProfile.account_id).toBe('acc-main')
  })
})
