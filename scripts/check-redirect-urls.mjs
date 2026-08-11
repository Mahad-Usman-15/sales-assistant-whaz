/**
 * Verifies Supabase's Redirect URL allow-list without sending a single email.
 *
 *   node scripts/check-redirect-urls.mjs <existing-member-address>
 *
 * This is the verification step for tasks.md T014a, and it exists because the failure it checks for
 * is completely silent. Supabase does not reject a redirect that is missing from the allow-list —
 * it substitutes the project's Site URL and returns success. The Studio field says so in as many
 * words: "the default redirect URL used when a redirect URL is not specified or doesn't match one
 * from the allow list." So the app asks for the right destination, the provider quietly overrides
 * it, and nothing is logged on either side. Observed 2026-08-02; cost an afternoon.
 *
 * How it works: `auth.admin.generateLink` takes the same `redirectTo` and runs it through the same
 * allow-list check as `signInWithOtp`, but RETURNS the link instead of mailing it. Comparing the
 * `redirect_to` embedded in the returned link against what we asked for tells us, per-URL, whether
 * the allow-list matched or the Site URL fallback kicked in.
 *
 * ⚠️ Requires SUPABASE_SECRET_KEY, so this is an operator script — laptop only, never deployed.
 *    It is not referenced from package.json scripts and must not become a runtime surface.
 * ⚠️ The address must ALREADY be a member. `generateLink` with type 'magiclink' does not create
 *    users, which is deliberate: creating one would put a row in app_user (see the bootstrap
 *    incident on 2026-08-02, where a verification step created its own blocking state).
 * ⚠️ Generating a link rotates that user's pending token, invalidating any magic link already
 *    sitting unclicked in their inbox. Harmless unless someone is mid-sign-in.
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local', quiet: true }); // Next.js convention — loaded first
config({ path: '.env', quiet: true });

const email = process.argv[2];
if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/check-redirect-urls.mjs <existing-member-address>');
  process.exit(2);
}

for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SECRET_KEY']) {
  if (!process.env[key]) {
    console.error(`Missing ${key}. Expected in .env.local (Next.js convention) or .env`);
    process.exit(2);
  }
}

/**
 * Each case names what the allow-list SHOULD do with it.
 *
 * The third case is the one that matters most and is easy to omit: a preview hash that does not
 * exist yet. Pinning one real deployment URL passes a naive check while still breaking the very
 * next `git push`, because Vercel mints a new immutable hash every time. Only a wildcard entry
 * admits a URL nobody has seen before — which is exactly the situation every future deploy is in.
 *
 * The fourth is the negative control. Without it, "everything was allowed" is indistinguishable
 * from "the allow-list is wide open", and `https://*.vercel.app/**` — a pattern that admits any
 * app on the platform to receive members' auth codes — would sail through.
 */
const CASES = [
  { label: 'production alias', url: 'https://whaz.vercel.app/auth/callback', allow: true },
  { label: 'local development', url: 'http://localhost:3000/auth/callback', allow: true },
  {
    label: 'UNSEEN preview hash (proves the wildcard, not a pinned URL)',
    url: 'https://sales-assistant-whaz-zq7k4v0x2-mahad-usmans-projects.vercel.app/auth/callback',
    allow: true,
  },
  {
    label: 'foreign host (negative control — MUST be refused)',
    url: 'https://not-your-project.example.com/auth/callback',
    allow: false,
  },
];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
);

/** Pulls the redirect Supabase actually committed to out of the link it generated. */
async function resolveRedirect(requested) {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: requested },
  });
  if (error) return { error };

  const link = data?.properties?.action_link;
  if (!link) return { error: new Error('no action_link in response') };

  // Supabase echoes the resolved destination as ?redirect_to= on the verify URL.
  const actual = new URL(link).searchParams.get('redirect_to');
  return { actual: actual ?? '(none)' };
}

console.log(`Probing the Redirect URL allow-list as ${email}\n`);

let failures = 0;
for (const { label, url, allow } of CASES) {
  const { actual, error } = await resolveRedirect(url);

  if (error) {
    console.log(`✗ ${label}\n    ${url}\n    request failed: ${error.message}\n`);
    failures += 1;
    continue;
  }

  // Substitution is the tell. Echoed back unchanged => matched the allow-list. Anything else =>
  // it fell through to Site URL, which is a refusal wearing a success response.
  const matched = actual === url;
  const ok = matched === allow;
  if (!ok) failures += 1;

  console.log(`${ok ? '✓' : '✗'} ${label}`);
  console.log(`    asked for : ${url}`);
  console.log(`    got back  : ${actual}`);
  if (matched) {
    console.log(`    → on the allow-list${allow ? '' : '  ⚠️ IT SHOULD NOT BE'}`);
  } else {
    console.log(
      `    → NOT on the allow-list; substituted the Site URL${allow ? '  ⚠️ THIS BREAKS SIGN-IN FROM THAT ORIGIN' : ' (correct)'}`
    );
  }
  console.log();
}

if (failures === 0) {
  console.log('All four behaved correctly. T014a is verified:');
  console.log('  · production and localhost both resolve to themselves');
  console.log('  · an unseen preview hash resolves too, so the wildcard is present — the next');
  console.log('    deploy will not silently redirect members to the Site URL');
  console.log('  · a foreign host is refused, so the wildcard kept its project prefix');
  process.exit(0);
}

console.log(`${failures} of ${CASES.length} case(s) behaved unexpectedly.`);
console.log('Fix in: Supabase Dashboard -> Authentication -> URL Configuration');
console.log('  Site URL      https://whaz.vercel.app          (no wildcards permitted here)');
console.log('  Redirect URLs http://localhost:3000/**');
console.log('                https://whaz.vercel.app/**');
console.log('                https://sales-assistant-whaz-*-mahad-usmans-projects.vercel.app/**');
console.log('\n⚠️ Keep the project prefix in that last pattern. `https://*.vercel.app/**` would let');
console.log('   any app on Vercel receive your members\' auth codes.');
process.exit(1);
