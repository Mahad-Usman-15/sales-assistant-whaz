import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/server/auth/supabase';
import { prisma } from '@/server/db/client';

// The Supabase client and Prisma both need full Node.
export const runtime = 'nodejs';

/**
 * Where the emailed sign-in link lands.
 *
 * A Route Handler rather than a Server Action because the browser *navigates* here: it must
 * exchange the code for a session, set cookies, and redirect. Excluded from the proxy matcher —
 * it has to be reachable without a session.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  const fail = (reason: string) => NextResponse.redirect(`${origin}/login?error=${reason}`);

  if (!code) return fail('link_expired');

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  // Expired, already-used, or tampered-with code. Same message either way — which link failed and
  // why is not something to disclose here.
  if (error || !data.user) return fail('link_expired');

  /**
   * Idempotent reconcile.
   *
   * The `handle_new_auth_user` trigger is authoritative and has already run for anyone created
   * through the normal path. This exists for users who pre-date the trigger, where no app_user row
   * would otherwise exist. Deny-by-default: INACTIVE, SALES, exactly as the trigger would do for
   * someone with no invitation (FR-005).
   *
   * ⚠️ It must NOT create an ACTIVE member or read a role from anywhere the user controls — that
   * would make this route a way to grant yourself access. Roles come only from a server-owned
   * invitation, which is the trigger's job.
   */
  let member;
  try {
    member = await prisma.appUser.upsert({
      where: { id: data.user.id },
      update: {},
      create: {
        id: data.user.id,
        email: data.user.email ?? '',
        role: 'SALES',
        status: 'INACTIVE',
      },
      select: { status: true },
    });
  } catch (dbError) {
    console.error('[auth/callback] member lookup failed:', dbError);
    return fail('exchange_failed');
  }

  // Authenticated but not authorized. This is where access is disclosed — never at request time
  // on the sign-in form (FR-043).
  if (member.status !== 'ACTIVE') return fail('no_access');

  // Only same-origin relative paths, so `?next=https://evil.example` cannot make this an open
  // redirect.
  const destination = next?.startsWith('/') && !next.startsWith('//') ? next : '/';
  return NextResponse.redirect(`${origin}${destination}`);
}
