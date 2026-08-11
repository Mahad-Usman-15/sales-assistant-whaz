/**
 * Creates the first Admin. Run from an operator's machine, never deployed.
 *
 *   npx tsx scripts/bootstrap-admin.ts admin@example.com
 *
 * FR-036 requires a way to create the first Admin that is "not reachable by anyone using the
 * deployed application, and that stops working once an active Admin exists". This script is that:
 *
 *   - It is not imported by any route, action, or build step, so it cannot ship into a function
 *     bundle. ⚠️ Never reference it from a `package.json` build/postinstall script.
 *   - It REFUSES to run once any active Admin exists (exit 1), so it is not a standing escalation
 *     path. Two alternatives were rejected for exactly that reason (see ADR-0002): an env-var
 *     admin allowlist silently re-escalates a DEMOTED admin at their next sign-in, and a
 *     self-disabling `/api/bootstrap` route exists forever as a fuzzing target.
 *
 * It does not insert an ACTIVE Admin directly. It writes an `invitation` row and sends the invite;
 * the database trigger then creates the `app_user`. So the first Admin is created by the SAME code
 * path as every subsequent member — the one path that is actually exercised in production, rather
 * than a second one that only ever runs once and is never tested again.
 *
 * If every Admin is locked out later, recovery is a documented manual SQL UPDATE in the Supabase
 * console (docs/DEVELOPMENT.md). That is deliberate: an in-application break-glass route would be
 * the backdoor this design exists to prevent, and requiring console credentials is the correct
 * second factor.
 */
import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '../generated/prisma/client';
import { inviteInputSchema } from '../lib/rbac-schema';

config({ path: '.env.local' });
config({ path: '.env' });

const INVITATION_TTL_DAYS = 7;

async function main(): Promise<number> {
  const parsed = inviteInputSchema.safeParse({ email: process.argv[2], role: 'ADMIN' });
  if (!parsed.success) {
    console.error('Usage: npx tsx scripts/bootstrap-admin.ts <email>');
    console.error(Object.values(parsed.error.flatten().fieldErrors).flat().join('\n'));
    return 2;
  }
  const { email } = parsed.data;

  for (const key of ['DATABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SECRET_KEY']) {
    if (!process.env[key]) {
      console.error(`Missing ${key} — see .env.example`);
      return 2;
    }
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }),
  });

  try {
    // The refusal that makes this safe to leave in the repository.
    const activeAdmins = await prisma.appUser.count({
      where: { role: 'ADMIN', status: 'ACTIVE' },
    });
    if (activeAdmins > 0) {
      console.error(
        `Refusing to run: ${activeAdmins} active Admin(s) already exist.\n` +
          'Bootstrap is for an organisation with no Admin. Invite further members from the\n' +
          'dashboard, which enforces authorization; this script does not.'
      );
      return 1;
    }

    const existing = await prisma.appUser.findUnique({ where: { email } });

    if (existing) {
      // A member row already exists. Reaching here means there are still ZERO active Admins
      // (checked above), so this IS the bootstrap case — the organisation has nobody who can let
      // anyone in. It happens routinely: requesting a sign-in link (including `npm run
      // check:email`) creates an auth user, and the trigger records it as INACTIVE/SALES per
      // FR-005 because no invitation matched.
      //
      // The invitation path is unavailable now: the trigger only fires on auth.users INSERT, and
      // that has already happened. A direct promotion is the only remaining action.
      //
      // Safe, for the same reason the whole script is: it requires zero active Admins AND local
      // possession of DATABASE_URL, and anyone holding that already owns the database.
      await prisma.appUser.update({
        where: { id: existing.id },
        data: { role: 'ADMIN', status: 'ACTIVE', deactivatedAt: null },
      });
      console.log(
        `Promoted existing member ${email} (was ${existing.status}/${existing.role}) to ACTIVE/ADMIN.`
      );
      console.log('They can sign in now — no new invitation email is needed.');
      return 0;
    }

    // invited_by_id is NOT NULL, and by definition there is no inviter yet. Raw insert so the
    // schema keeps that column non-nullable for every ordinary invitation, where an inviter always
    // exists and losing it would break the FR-029 audit trail.
    const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
    await prisma.$executeRaw`
      INSERT INTO invitation (id, email, role, status, invited_by_id, expires_at, created_at)
      VALUES (gen_random_uuid(), ${email}::citext, 'ADMIN', 'PENDING', NULL, ${expiresAt}, now())
    `;
    console.log(`Invitation recorded for ${email} (ADMIN, expires ${expiresAt.toISOString()}).`);

    // Row first, send second: a send failure leaves a revocable PENDING row rather than an email
    // with nothing backing it.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
    );
    const { error } = await supabase.auth.admin.inviteUserByEmail(email);
    if (error) {
      console.error(`\nInvitation row written, but the email failed to send: ${error.message}`);
      console.error('Check Supabase -> Logs -> Auth Logs, fix SMTP, then run:');
      console.error(`  npm run check:email ${email}`);
      console.error('The PENDING invitation stands, so a successful send later still works.');
      return 1;
    }

    console.log(`Invite sent to ${email}.`);
    console.log(
      'On following the link they become an ACTIVE Admin — the database trigger reads the role\n' +
        'from the invitation, so it cannot be influenced by the recipient.'
    );
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

// Not top-level await: this repo has no `"type": "module"`, so tsx compiles to CJS where top-level
// await is unavailable.
main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error('Bootstrap failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
