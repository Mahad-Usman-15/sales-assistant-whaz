import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The privileged Supabase client, for admin-API operations: inviting users and banning them.
 *
 * ⚠️ THIS IS THE ONLY MODULE PERMITTED TO READ `SUPABASE_SECRET_KEY`. The key bypasses row-level
 * access control entirely. Two rules, both binding (constitution: Security Requirements):
 *
 *   1. Never import this module outside `server/`. `import 'server-only'` makes a client-graph
 *      import fail the build rather than shipping the key to a browser.
 *   2. The variable is never prefixed `NEXT_PUBLIC_`. That prefix inlines a value into the client
 *      bundle at build time, which for this key would publish full database access.
 *
 * No session handling: this client acts as the service role, never as a user. Hence
 * autoRefreshToken/persistSession/detectSessionInUrl all off — leaving them on would have it try
 * to manage a session that does not exist.
 */
let cached: SupabaseClient | undefined;

export function createAdminSupabase(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set — see .env.example'
    );
  }

  cached = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  return cached;
}
