import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Helper to check if we're in a build context (Next.js build time)
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build'

// Client-side Supabase client
// Use dummy values during build time to allow compilation
export const supabase = createClient<Database>(
  supabaseUrl || (isBuildTime ? 'https://placeholder.supabase.co' : ''),
  supabaseAnonKey || (isBuildTime ? 'placeholder-key' : '')
)

// Server-side admin client (use with caution!)
// Only create if service role key is available, otherwise use regular client
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient<Database>(
      supabaseUrl || (isBuildTime ? 'https://placeholder.supabase.co' : ''),
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : supabase

// Runtime validation helper - call this in API routes
export function validateSupabaseConfig(): void {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  if (!supabaseServiceRoleKey) {
    console.warn('[Supabase] SUPABASE_SERVICE_ROLE_KEY not set - using anon key for admin operations (not recommended for production)')
  }
}
