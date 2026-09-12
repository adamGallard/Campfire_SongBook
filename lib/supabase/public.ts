import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Cookie-free client for public reads. Using this instead of the request-scoped
 * client keeps the songbook statically cacheable — there is no session to vary
 * on, and RLS still limits anon to published songs.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
