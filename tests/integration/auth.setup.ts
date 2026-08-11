import { config } from 'dotenv';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

/**
 * Playwright globalSetup: produces a signed-in session for the integration suite.
 *
 * Necessary because FR-001 gates every surface — without this, every pre-existing test 401s.
 *
 * ⚠️ Uses `pg` rather than Prisma: Playwright transpiles test files to CommonJS (this repo has no
 * `"type": "module"`), and the generated Prisma client uses `import.meta`, which CJS cannot load.
 * The queries here are two updates, so the driver is plenty.
 *
 * ⚠️ Why this is not simply "click the magic link": the app uses PKCE, where the code verifier is
 * generated in the browser by signInWithOtp and never leaves it. A link generated server-side has
 * no matching verifier, so exchangeCodeForSession would reject it. Instead the session is minted
 * with verifyOtp against a hashed token, and the cookies are written BY @supabase/ssr itself into
 * an in-memory jar — so their names, chunking and encoding are correct by construction rather than
 * by our guesswork.
 */

export const TEST_MEMBER_EMAIL = 'zz-e2e-member@example.test';
export const STORAGE_STATE = 'tests/integration/.auth/member.json';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required to run integration tests — see .env.example`);
  return value;
}

export default async function globalSetup(): Promise<void> {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const publishableKey = requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  const secretKey = requireEnv('SUPABASE_SECRET_KEY');

  const admin = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const db = new Client({ connectionString: requireEnv('DATABASE_URL') });
  await db.connect();

  try {
    // --- Ensure the test member exists and is ACTIVE ------------------------------------------
    // Idempotent: the suite runs repeatedly against a shared database, so this must converge
    // rather than fail on a second run.
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: TEST_MEMBER_EMAIL,
      email_confirm: true,
    });

    let authUserId = created?.user?.id;
    if (createError) {
      // Already exists from an earlier run — find it rather than treating this as a failure.
      const { rows } = await db.query<{ id: string }>(
        'select id from app_user where email = $1',
        [TEST_MEMBER_EMAIL]
      );
      if (rows.length === 0) throw createError;
      authUserId = rows[0].id;
    }
    if (!authUserId) throw new Error('Could not resolve the test member’s auth user id');

    // The trigger records new users INACTIVE when no invitation matches (FR-005), which is correct
    // — so activate deliberately here. SALES, not ADMIN: the suite should exercise the least
    // privileged path, and an admin-only test can promote explicitly.
    await db.query(
      `update app_user set role='SALES', status='ACTIVE', last_seen_at=now() where id=$1`,
      [authUserId]
    );

    // --- Mint a session -----------------------------------------------------------------------
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: TEST_MEMBER_EMAIL,
    });
    if (linkError || !link.properties?.hashed_token) {
      throw linkError ?? new Error('generateLink returned no hashed_token');
    }

    const jar = new Map<string, { value: string; options: CookieOptions }>();
    const supabase = createServerClient(url, publishableKey, {
      cookies: {
        getAll: () => [...jar].map(([name, { value }]) => ({ name, value })),
        setAll: (cookiesToSet) => {
          for (const { name, value, options } of cookiesToSet) jar.set(name, { value, options });
        },
      },
    });

    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: 'email',
      token_hash: link.properties.hashed_token,
    });
    if (verifyError) throw verifyError;
    if (jar.size === 0) throw new Error('verifyOtp succeeded but wrote no session cookies');

    // --- Hand the cookies to Playwright -------------------------------------------------------
    const storageState = {
      cookies: [...jar].map(([name, { value, options }]) => ({
        name,
        value,
        domain: 'localhost',
        path: options.path ?? '/',
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax' as const,
      })),
      origins: [],
    };

    mkdirSync(dirname(STORAGE_STATE), { recursive: true });
    writeFileSync(STORAGE_STATE, JSON.stringify(storageState, null, 2));
    console.log(`[auth.setup] signed in as ${TEST_MEMBER_EMAIL} (${jar.size} cookie(s))`);
  } finally {
    await db.end();
  }
}
