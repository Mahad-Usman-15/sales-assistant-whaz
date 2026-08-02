import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase client bound to the request's cookies, for Server Components, Route Handlers, and
 * Server Actions.
 *
 * Uses the PUBLISHABLE key, not the secret one — this client acts as the signed-in user. The
 * privileged client lives in ./admin.ts and is imported nowhere else.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set — see .env.example'
    );
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      /**
       * ⚠️ `setAll` takes TWO arguments: (cookies, headers). The second carries
       * `Cache-Control: private, no-store, ...` and MUST be forwarded wherever a response is
       * being constructed. @supabase/ssr's own type docs state the consequence of dropping it:
       * "one user's session token can be served to a different user" by a CDN or reverse proxy.
       *
       * Here — inside a Server Component render — there is no response object to attach headers
       * to, and cookie writes throw. That is expected: the session is refreshed in proxy.ts,
       * which DOES have a response and DOES forward the headers. This no-op catch is the
       * documented pattern, not a shortcut.
       */
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component: cookies are read-only during render.
        }
      },
    },
  });
}
