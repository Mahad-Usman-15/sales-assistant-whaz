import 'server-only';
import { cache } from 'react';
import { createServerSupabase } from './supabase';
import { prisma } from '../db/client';
import { ForbiddenError, StoreUnavailableError, UnauthenticatedError } from '../errors';
import type { Role } from '../../lib/rbac-schema';

/**
 * THE authorization boundary (constitution Principle VI).
 *
 * `proxy.ts` redirects unauthenticated requests, but it is a routing convenience and NOT a security
 * boundary — Next.js has shipped middleware-bypass advisories, and a redirect is not a check. Every
 * protected surface calls one of these functions independently.
 *
 * Role and status are re-read from `app_user` on EVERY call, never from a token claim and never
 * from Supabase `user_metadata` (which the subject can write — that would be a
 * privilege-escalation primitive). This is what makes deactivation take effect on the member's very
 * next request instead of whenever their token happens to expire (FR-006).
 */

/** 30-day sliding session (FR-041). */
const SESSION_MAX_IDLE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * `last_seen_at` is on the request path, so it is written coarsely rather than every time. One
 * write per hour per member is enough to slide a 30-day window and keeps this a read in the
 * overwhelming majority of requests.
 */
const LAST_SEEN_REFRESH_MS = 60 * 60 * 1000;

declare const adminBrand: unique symbol;

export interface Actor {
  readonly id: string;
  readonly email: string;
  readonly role: Role;
}

/**
 * An actor proven to be an active Admin.
 *
 * The brand is a non-exported unique symbol, so no code outside this module can construct an
 * `AdminActor` — only `requireAdmin()` can. Repository functions that take `AdminActor` as their
 * first parameter therefore CANNOT be called without having passed the guard, and a missing
 * authorization check becomes a compile error rather than something a reviewer must spot
 * (constitution: "where a rule can be enforced by the type system ... it MUST be").
 */
export interface AdminActor extends Actor {
  readonly role: 'ADMIN';
  readonly [adminBrand]: true;
}

/**
 * Prisma error codes that mean "the datastore is unreachable", as distinct from "the query was
 * wrong". Only these become StoreUnavailableError -> 503; anything else is a real bug and must
 * surface as one rather than being disguised as a transient outage.
 *   P1000 auth failed · P1001 unreachable · P1002 timed out · P1008 operation timed out
 *   P1017 server closed the connection · P2024 pool timeout
 */
const UNAVAILABLE_CODES = new Set(['P1000', 'P1001', 'P1002', 'P1008', 'P1017', 'P2024']);

function isUnavailable(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  if (typeof code === 'string') {
    if (UNAVAILABLE_CODES.has(code)) return true;
    // Raw driver-level failures surface with libuv/socket codes rather than Prisma's.
    if (['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET', 'ENETUNREACH'].includes(code)) {
      return true;
    }
  }
  return false;
}

/**
 * Resolves the caller to an active member, or throws.
 *
 * `cache()` memoises per request, so a page rendering five Server Components pays one lookup —
 * not a cross-request cache. Correctness does not depend on it; it is purely a cost saving.
 *
 * @throws UnauthenticatedError  no session, or the session has been idle past the 30-day window
 * @throws ForbiddenError        signed in, but the member is INACTIVE or has no member record
 * @throws StoreUnavailableError the member store could not be reached (FR-045) — never treated
 *                               as permission granted
 */
export const requireUser = cache(async (): Promise<Actor> => {
  const supabase = await createServerSupabase();

  // getClaims() verifies the JWT locally against the project's JWKS — no network round trip, and
  // unlike reading the session directly it does not trust an unverified token body.
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) {
    throw new UnauthenticatedError();
  }
  const authUserId = data.claims.sub as string;

  let member;
  try {
    member = await prisma.appUser.findUnique({
      where: { id: authUserId },
      select: { id: true, email: true, role: true, status: true, lastSeenAt: true },
    });
  } catch (error) {
    if (isUnavailable(error)) {
      // Fail CLOSED (FR-045). An unreachable store must never read as "permitted".
      console.error('[guard] member store unreachable:', error);
      throw new StoreUnavailableError();
    }
    throw error;
  }

  // A valid token with no member row means the trigger has not run or the row was removed.
  // Deny — do not create one here; membership originates only from an invitation (FR-002).
  if (!member) throw new ForbiddenError();

  // The deactivation kill-switch (FR-006). This is why the lookup above is mandatory rather than
  // an optimisation: it is the only thing that revokes access before the token expires.
  if (member.status !== 'ACTIVE') throw new ForbiddenError();

  const idleMs = Date.now() - member.lastSeenAt.getTime();

  // Check BEFORE refreshing, or the window would slide on the very request that should end it.
  if (idleMs > SESSION_MAX_IDLE_MS) throw new UnauthenticatedError('Your session has expired.');

  if (idleMs > LAST_SEEN_REFRESH_MS) {
    try {
      await prisma.appUser.update({
        where: { id: member.id },
        data: { lastSeenAt: new Date() },
      });
    } catch (error) {
      // A failed heartbeat must not deny an otherwise-authorized request. Worst case the member's
      // window slides late; the next request retries.
      console.error('[guard] last_seen_at refresh failed (non-fatal):', error);
    }
  }

  return { id: member.id, email: member.email, role: member.role };
});

/**
 * As `requireUser`, and additionally requires the ADMIN role.
 *
 * The returned value is the only way to obtain an `AdminActor`, which is what admin repository
 * functions demand as their first parameter.
 */
export const requireAdmin = cache(async (): Promise<AdminActor> => {
  const actor = await requireUser();
  if (actor.role !== 'ADMIN') throw new ForbiddenError();
  // The sole `AdminActor` construction site in the codebase.
  return actor as AdminActor;
});
