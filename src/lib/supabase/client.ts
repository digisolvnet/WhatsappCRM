import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isDemoMode, createMockClient } from '@/lib/mock/client'

// Singleton instance — one client shared across the whole browser session.
// Creating multiple clients causes auth-lock contention ("Lock was released
// because another request stole it") and intermittent fetch failures.
let browserClient: SupabaseClient | undefined
let mockClientSingleton: any | undefined

export function createClient() {
  if (isDemoMode()) {
    if (!mockClientSingleton) {
      mockClientSingleton = createMockClient()
    }
    return mockClientSingleton
  }

  if (browserClient) return browserClient

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return browserClient
}
