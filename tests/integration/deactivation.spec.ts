import { test, expect } from '@playwright/test';
import { config } from 'dotenv';
import { Client } from 'pg';
import { TEST_MEMBER_EMAIL } from './auth.setup';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

/**
 * SC-005 / FR-006: a member whose access is withdrawn is refused on their VERY NEXT request.
 *
 * This is the check that justifies the guard's per-request database read. If access only lapsed
 * when the token expired, revocation would take up to an hour — which is not revocation. Nothing
 * else in the suite would notice if that read were "optimised away", so this test is what holds it
 * in place.
 */

// `pg` rather than Prisma: Playwright transpiles to CJS and the generated client uses import.meta.
const db = new Client({ connectionString: process.env.DATABASE_URL! });

test.beforeAll(async () => {
  await db.connect();
});

const PAYLOAD = {
  recipientName: 'Deactivation Probe',
  recipientRoleLine1: 'Head of Operations',
  recipientRoleLine2: '',
  clientCompany: 'Probe Co',
  proposalDate: '2026-08-02',
  selectedServiceIds: [],
};

test.afterAll(async () => {
  // Always restore, so a failure here does not break every later run.
  await db
    .query(`update app_user set status='ACTIVE', last_seen_at=now() where email=$1`, [TEST_MEMBER_EMAIL])
    .catch(() => undefined);
  await db.end();
});

test('access is refused on the next request after deactivation, with no waiting period', async ({
  request,
}) => {
  // 1. The session works.
  const before = await request.post('/api/generate', { data: PAYLOAD, maxRedirects: 0 });
  expect(before.status()).toBe(200);

  // 2. Withdraw access out-of-band — exactly what an Admin's removal does to the row. The session
  //    cookie is untouched and still cryptographically valid.
  await db.query(`update app_user set status='INACTIVE' where email=$1`, [TEST_MEMBER_EMAIL]);

  // 3. The very next request, same cookie, no delay.
  const after = await request.post('/api/generate', { data: PAYLOAD, maxRedirects: 0 });
  expect(after.status()).toBe(401);
  expect((await after.json()).error).toBe('unauthenticated');

  // 4. Restoring access restores the ability to generate — removal is reversible (FR-032).
  await db.query(`update app_user set status='ACTIVE' where email=$1`, [TEST_MEMBER_EMAIL]);
  const restored = await request.post('/api/generate', { data: PAYLOAD, maxRedirects: 0 });
  expect(restored.status()).toBe(200);
});

test('a session idle beyond the 30-day window is refused (FR-041)', async ({ request }) => {
  const stale = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
  await db.query(`update app_user set last_seen_at=$2 where email=$1`, [TEST_MEMBER_EMAIL, stale]);

  const response = await request.post('/api/generate', { data: PAYLOAD, maxRedirects: 0 });
  expect(response.status()).toBe(401);

  // Signing in again resets the window; simulated here by the fresh timestamp a sign-in would write.
  await db.query(`update app_user set last_seen_at=now() where email=$1`, [TEST_MEMBER_EMAIL]);
  const after = await request.post('/api/generate', { data: PAYLOAD, maxRedirects: 0 });
  expect(after.status()).toBe(200);
});
