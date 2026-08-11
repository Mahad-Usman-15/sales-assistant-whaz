import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../generated/prisma/client';
import { randomUUID } from 'node:crypto';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

/**
 * SC-004 / FR-033 — the last-Admin invariant, under genuine concurrency.
 *
 * ⚠️ WITHOUT THIS TEST THE INVARIANT IS ASSERTED, NOT VERIFIED. The naive implementation —
 * `if (countActiveAdmins() > 1) deactivate(target)` — passes every single-threaded test anyone
 * would write. It fails only when two Admins act at the same instant, which is exactly when it
 * matters and exactly what no ordinary test exercises.
 *
 * So this uses TWO separate PrismaClients, i.e. two real connections. One client cannot demonstrate
 * this: sharing a connection serialises the transactions and the race never occurs.
 *
 * Not part of `npm run test:unit` — it needs a real database.
 *   npm run test:db
 */

const url = process.env.DATABASE_URL;
const TAG = 'zz-lastadmin';

// Two clients => two connections => the transactions genuinely overlap.
const clientA = new PrismaClient({ adapter: new PrismaPg({ connectionString: url!, max: 1 }) });
const clientB = new PrismaClient({ adapter: new PrismaPg({ connectionString: url!, max: 1 }) });

/**
 * The production mutation, inlined against an arbitrary client.
 *
 * server/repo/users.ts imports 'server-only', which throws outside a React Server Component
 * graph, and is bound to the singleton client — neither of which works here. The lock/re-count/
 * mutate sequence below is copied verbatim from it; if that file changes, this must change with it.
 * tests/integration/db/last-admin-parity.test.ts guards against the two drifting apart.
 */
async function updateMember(
  client: PrismaClient,
  targetId: string,
  changes: { role?: 'ADMIN' | 'SALES'; status?: 'ACTIVE' | 'INACTIVE' },
  delayInsideLockMs = 0
): Promise<'ok' | 'last_admin'> {
  try {
    await client.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('app_user:admin_invariant'))`;

        // Widens the window between reading and writing. With a correct lock this changes nothing;
        // without one it makes the race deterministic rather than a coin flip.
        if (delayInsideLockMs) await new Promise((r) => setTimeout(r, delayInsideLockMs));

        const target = await tx.appUser.findUnique({ where: { id: targetId } });
        if (!target) throw new Error('not_found');

        const nextRole = changes.role ?? target.role;
        const nextStatus = changes.status ?? target.status;
        const wasActiveAdmin = target.role === 'ADMIN' && target.status === 'ACTIVE';
        const willBeActiveAdmin = nextRole === 'ADMIN' && nextStatus === 'ACTIVE';

        if (wasActiveAdmin && !willBeActiveAdmin) {
          const remaining = await tx.appUser.count({
            where: { role: 'ADMIN', status: 'ACTIVE', id: { not: targetId } },
          });
          if (remaining === 0) throw new Error('last_admin');
        }

        await tx.appUser.update({
          where: { id: targetId },
          data: { role: nextRole, status: nextStatus },
        });
      },
      { timeout: 10_000 }
    );
    return 'ok';
  } catch (error) {
    if (error instanceof Error && /last_admin/.test(error.message)) return 'last_admin';
    throw error;
  }
}

/**
 * The NAIVE implementation — identical to the above but with no advisory lock.
 *
 * Exists to prove this test file can actually detect the bug. A concurrency test written after the
 * fix proves nothing on its own: it might be passing because the code is correct, or because the
 * race never fires and it would pass against anything. Running the broken version through the same
 * harness settles that.
 */
async function updateMemberNaive(
  client: PrismaClient,
  targetId: string,
  delayMs: number
): Promise<'ok' | 'last_admin'> {
  try {
    await client.$transaction(async (tx) => {
      const target = await tx.appUser.findUniqueOrThrow({ where: { id: targetId } });
      if (target.role === 'ADMIN' && target.status === 'ACTIVE') {
        const remaining = await tx.appUser.count({
          where: { role: 'ADMIN', status: 'ACTIVE', id: { not: targetId } },
        });
        if (remaining === 0) throw new Error('last_admin');
      }
      await new Promise((r) => setTimeout(r, delayMs));
      await tx.appUser.update({ where: { id: targetId }, data: { status: 'INACTIVE' } });
    });
    return 'ok';
  } catch (error) {
    if (error instanceof Error && /last_admin/.test(error.message)) return 'last_admin';
    throw error;
  }
}

let adminA: string;
let adminB: string;

async function seedAdmin(label: string): Promise<string> {
  const id = randomUUID();
  // Raw insert: app_user.id has a FK to auth.users, which these tests do not create. Dropping the
  // constraint for the test would change the thing under test, so the trigger-owned column is
  // populated directly and the FK is deferred by inserting into auth.users first.
  await clientA.$executeRaw`
    INSERT INTO auth.users (instance_id, id, aud, role, email, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000000'::uuid, ${id}::uuid, 'authenticated',
            'authenticated', ${`${TAG}-${label}-${id}@example.test`}, now(), now())
    ON CONFLICT (id) DO NOTHING
  `;
  await clientA.$executeRaw`
    INSERT INTO app_user (id, email, role, status, last_seen_at, created_at)
    VALUES (${id}::uuid, ${`${TAG}-${label}-${id}@example.test`}::citext, 'ADMIN', 'ACTIVE', now(), now())
    ON CONFLICT (id) DO UPDATE SET role='ADMIN', status='ACTIVE'
  `;
  return id;
}

async function cleanup(): Promise<void> {
  // The backstop trigger blocks removing the last Admin, which is correct and would block teardown.
  await clientA.$executeRawUnsafe(
    'ALTER TABLE app_user DISABLE TRIGGER app_user_admin_invariant_update'
  );
  await clientA.$executeRawUnsafe(
    'ALTER TABLE app_user DISABLE TRIGGER app_user_admin_invariant_delete'
  );
  await clientA.$executeRaw`DELETE FROM app_user WHERE email LIKE ${`${TAG}%`}`;
  await clientA.$executeRaw`DELETE FROM auth.users WHERE email LIKE ${`${TAG}%`}`;
  await clientA.$executeRawUnsafe(
    'ALTER TABLE app_user ENABLE TRIGGER app_user_admin_invariant_update'
  );
  await clientA.$executeRawUnsafe(
    'ALTER TABLE app_user ENABLE TRIGGER app_user_admin_invariant_delete'
  );
}

async function activeAdminCount(): Promise<number> {
  return clientA.appUser.count({ where: { role: 'ADMIN', status: 'ACTIVE' } });
}

describe('last-Admin invariant under concurrency', () => {
  beforeAll(async () => {
    if (!url) throw new Error('DATABASE_URL is required — see .env.example');
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await Promise.all([clientA.$disconnect(), clientB.$disconnect()]);
  });

  beforeEach(async () => {
    await cleanup();
    adminA = await seedAdmin('a');
    adminB = await seedAdmin('b');
  });

  it('lets exactly one of two simultaneous mutual removals succeed', async () => {
    const existingElsewhere = await clientA.appUser.count({
      where: { role: 'ADMIN', status: 'ACTIVE', email: { not: { contains: TAG } } },
    });

    // A deactivates B while B deactivates A, both entering their transaction at the same moment.
    const [resultA, resultB] = await Promise.all([
      updateMember(clientA, adminB, { status: 'INACTIVE' }, 250),
      updateMember(clientB, adminA, { status: 'INACTIVE' }, 250),
    ]);

    const outcomes = [resultA, resultB].sort();

    if (existingElsewhere === 0) {
      // Clean database: the pair is the entire admin population, so exactly one must be refused.
      expect(outcomes).toEqual(['last_admin', 'ok']);
      expect(await activeAdminCount()).toBe(1);
    } else {
      // Other real Admins exist (a bootstrapped account), so both removals are legitimate — the
      // invariant is about the count reaching zero, not about this pair specifically.
      expect(outcomes).toEqual(['ok', 'ok']);
      expect(await activeAdminCount()).toBeGreaterThanOrEqual(1);
    }

    // The claim that actually matters, and it holds either way.
    expect(await activeAdminCount()).toBeGreaterThan(0);
  });

  it('refuses to remove the only active Admin', async () => {
    await updateMember(clientA, adminB, { status: 'INACTIVE' });

    const others = await clientA.appUser.count({
      where: { role: 'ADMIN', status: 'ACTIVE', id: { not: adminA }, email: { not: { contains: TAG } } },
    });
    if (others > 0) return; // a real Admin exists; adminA is not the last one

    expect(await updateMember(clientA, adminA, { status: 'INACTIVE' })).toBe('last_admin');
    expect(await updateMember(clientA, adminA, { role: 'SALES' })).toBe('last_admin');
    expect(await activeAdminCount()).toBeGreaterThan(0);
  });

  it('allows the sole Admin to leave once a successor is promoted (FR-034)', async () => {
    await updateMember(clientA, adminB, { status: 'INACTIVE' });
    // Promote B back, then A may go — the handover the invariant must permit.
    expect(await updateMember(clientA, adminB, { role: 'ADMIN', status: 'ACTIVE' })).toBe('ok');
    expect(await updateMember(clientA, adminA, { status: 'INACTIVE' })).toBe('ok');
    expect(await activeAdminCount()).toBeGreaterThan(0);
  });

  /**
   * The meta-check: without a lock, the SAME scenario corrupts the data.
   *
   * If this test ever starts failing, the harness has stopped being able to detect write skew — and
   * every other test in this file silently becomes worthless, because they would pass against a
   * broken implementation too.
   */
  it('DEMONSTRATES the bug: the unlocked version leaves zero Admins', async () => {
    const taggedActiveAdmins = () =>
      clientA.appUser.count({
        where: { role: 'ADMIN', status: 'ACTIVE', email: { contains: TAG } },
      });

    expect(await taggedActiveAdmins()).toBe(2);

    const [a, b] = await Promise.all([
      updateMemberNaive(clientA, adminB, 300),
      updateMemberNaive(clientB, adminA, 300),
    ]);

    // Both read a count of 2, both passed their check, both committed. Neither was refused —
    // and the pair is now entirely inactive. This is write skew.
    expect([a, b].sort()).toEqual(['ok', 'ok']);
    expect(
      await taggedActiveAdmins(),
      'the unlocked version should have destroyed both Admins — if it did not, this harness can no longer detect the bug it exists to catch'
    ).toBe(0);
  });

  it('restores a removed member with an explicitly chosen role (FR-032)', async () => {
    await updateMember(clientA, adminB, { status: 'INACTIVE' });
    // Restored as SALES, not silently back to ADMIN.
    expect(await updateMember(clientA, adminB, { role: 'SALES', status: 'ACTIVE' })).toBe('ok');

    const restored = await clientA.appUser.findUniqueOrThrow({ where: { id: adminB } });
    expect(restored.role).toBe('SALES');
    expect(restored.status).toBe('ACTIVE');
  });
});
