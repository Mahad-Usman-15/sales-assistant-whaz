/**
 * Sends one real magic link and reports whether Supabase's SMTP configuration accepted it.
 *
 *   node scripts/check-email.mjs you@example.com
 *
 * This is the verification step for tasks.md T012. It exists as a script because email is the one
 * dependency the application cannot diagnose for itself: Supabase returns a bare 500 with an empty
 * body when SMTP fails, so a broken sender presents in the UI as "the magic link never arrived"
 * with nothing in the app's logs — the app is not in the sending path.
 *
 * ⚠️ Sends a real email. The address is a required argument so it cannot run by accident.
 * ⚠️ A success here means the PROVIDER ACCEPTED the message, not that it was delivered. Check the
 *    inbox, including spam.
 *
 * When it fails, the authoritative reason is in Supabase Dashboard -> Logs -> Auth Logs. The
 * provider's rejection is recorded there verbatim; it is never returned to the client.
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

const email = process.argv[2];
if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/check-email.mjs <address>');
  process.exit(2);
}

for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']) {
  if (!process.env[key]) {
    console.error(`Missing ${key}. Expected in .env.local (Next.js convention) or .env`);
    process.exit(2);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const started = Date.now();
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: { shouldCreateUser: true },
});
const ms = Date.now() - started;

if (!error) {
  console.log(`✓ Supabase accepted the send for ${email} (${ms}ms)`);
  console.log('  Now confirm it actually arrived — acceptance is not delivery.');
  process.exit(0);
}

console.log(`✗ Send FAILED for ${email} (${ms}ms)`);
console.log(`  status ${error.status ?? '-'}   ${error.message || '(empty body — Supabase hides SMTP errors from clients)'}`);
console.log('\n  Read the real reason in: Supabase Dashboard -> Logs -> Auth Logs');
console.log('  Common causes, most likely first for this project:');
console.log('   1. Sender address is on a domain the provider has not verified.');
console.log('      Whaz owns no domain, so any ESP (Resend, SendGrid, ...) will refuse');
console.log('      whazpk@gmail.com. Use Gmail SMTP instead — see quickstart.md.');
console.log('   2. SMTP username/password wrong for the host in use.');
console.log('      For Gmail this must be an App Password, not the account password.');
console.log('   3. Rate limited — the built-in sender allows only 2/hour project-wide.');
process.exit(1);
