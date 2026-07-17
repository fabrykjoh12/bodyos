import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Supabase client for optional cloud sync.
//
// The project URL and publishable ("anon") key are public by design — they
// ship in every Supabase browser app. Data is protected by row-level security
// (see the `bodyos_app_state` table policies), not by hiding the key, so it is
// safe to commit them. No server or build-time secret is required, which keeps
// the GitHub Pages deploy a plain static build.
//
// The client library (~57 kB gzip) is loaded *dynamically* so it stays out of
// the initial bundle — sync isn't needed for first paint, so it loads as a
// separate chunk a tick after startup.
// ---------------------------------------------------------------------------

const SUPABASE_URL = 'https://bvqvturqupbggxaeihvi.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_NwSspA0U9-nlbty0SVXF8A_o1oVQ-yT';

export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_PUBLISHABLE_KEY.length > 0;

let clientPromise: Promise<SupabaseClient | null> | null = null;

/** Lazily import + memoize the Supabase client. Resolves null if unconfigured. */
export function loadSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // No email links to catch — password auth only for now.
          detectSessionInUrl: false,
        },
      }),
    );
  }
  return clientPromise;
}
