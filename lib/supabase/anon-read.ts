import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Module-cached anonymous Supabase client for cookie-free, RLS-respecting
 * read-only queries. Suitable for `unstable_cache`-wrapped functions on the
 * server (cookie-bound clients can't be used inside cached scopes — calling
 * `cookies()` from within `unstable_cache` throws).
 *
 * RLS still enforces visibility, so this is safe to use only for queries
 * whose results don't depend on the calling user's identity (public counts,
 * landing-page samples, sitemap entries, etc.).
 */
let cached: SupabaseClient | null = null

export function createAnonReadClient(): SupabaseClient {
  if (cached) return cached
  cached = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
  return cached
}
