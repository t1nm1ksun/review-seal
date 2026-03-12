import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const GLOBAL_KEY = '__review_seal_supabase__'
const GLOBAL_KEY_PUBLIC = '__review_seal_supabase_public__'

function ensureConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables. Use demo mode or configure Supabase.')
  }
}

function getOrCreateClient(): SupabaseClient<Database> {
  ensureConfig()
  const existing = (window as unknown as Record<string, SupabaseClient<Database>>)[GLOBAL_KEY]
  if (existing) return existing

  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: 'review-seal-auth',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })

  ;(window as unknown as Record<string, SupabaseClient<Database>>)[GLOBAL_KEY] = client
  return client
}

function getOrCreatePublicClient(): SupabaseClient<Database> {
  ensureConfig()
  const existing = (window as unknown as Record<string, SupabaseClient<Database>>)[GLOBAL_KEY_PUBLIC]
  if (existing) return existing

  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  ;(window as unknown as Record<string, SupabaseClient<Database>>)[GLOBAL_KEY_PUBLIC] = client
  return client
}

// Lazy getters - only initialize when actually used (not in demo mode)
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    return (getOrCreateClient() as any)[prop]
  },
})

export const supabasePublic = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    return (getOrCreatePublicClient() as any)[prop]
  },
})
