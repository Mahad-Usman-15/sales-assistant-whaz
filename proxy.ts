import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Route middleware.
 *
 * ⚠️ The file is `proxy.ts` exporting `proxy`, NOT `middleware.ts` exporting `middleware` — that
 * form does not exist in Next.js 16, and the build throws if both files are present.
 *
 * ⚠️ THIS IS NOT A SECURITY BOUNDARY. It refreshes the session cookie and redirects signed-out
 * visitors to /login, which is a UX convenience. Next.js has shipped middleware-bypass advisories,
 * so every protected surface re-checks independently via server/auth/guard.ts — that is where
 * authorization actually happens (constitution Principle VI, FR-008).
 *
 * It deliberately does NOT read roles or query the database: the guard must re-read status on every
 * request anyway for the deactivation kill-switch, so doing it here would add a round trip to every
 * matched request's TTFB and make routing depend on database uptime.
 */
export async function proxy(request: NextRequest) {
  // ⚠️ Created ONCE and returned as-is at the end. Building a fresh NextResponse after the session
  // is refreshed silently discards the rotated cookies Supabase wrote into this one, which presents
  // as "logged out on every second navigation".
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        /**
         * ⚠️ Two parameters. The second carries `Cache-Control: private, no-store, ...`; dropping
         * it lets a CDN or reverse proxy cache a response containing someone's session cookie and
         * serve it to another user. @supabase/ssr's own types document exactly that consequence.
         */
        setAll(cookiesToSet, headers) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    }
  );

  // Verifies the JWT locally against the project's JWKS — no network round trip, and unlike
  // reading the session it does not trust an unverified token body. Also triggers the refresh
  // that writes cookies through setAll above.
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    const login = new URL('/login', request.url);
    // Preserve where they were headed so the callback can return them there.
    if (request.nextUrl.pathname !== '/') {
      login.searchParams.set('next', request.nextUrl.pathname);
    }
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  /**
   * Pages only. Excluded: Next's own assets, the auth surfaces themselves, the favicon, and
   * ⚠️ **all of `/api`**.
   *
   * API routes must NOT be matched. Middleware runs first, so a redirect here would win — an
   * unauthenticated `POST /api/generate` would receive a 302 to an HTML login page instead of the
   * `401 { error: 'unauthenticated' }` the contract specifies, and ProposalForm's 401 branch would
   * never fire. Routes answer with status codes; pages redirect. Each API route enforces its own
   * access with requireUser(), which is the boundary that actually counts.
   */
  matcher: ['/((?!api|_next/static|_next/image|login|auth/callback|icon.png|favicon.ico).*)'],
};
