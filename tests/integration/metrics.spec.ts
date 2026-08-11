import { test, expect } from '@playwright/test';
import { config } from 'dotenv';
import { Client } from 'pg';
import { TEST_MEMBER_EMAIL } from './auth.setup';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

/**
 * SC-006 / FR-014 / FR-015 — usage records.
 *
 * The claim is exact: a displayed count must equal `select count(*)`, with no rounding, caching or
 * approximation. So these assert against the database directly rather than against the rendered
 * figure, which could agree for the wrong reason.
 */

const db = new Client({ connectionString: process.env.DATABASE_URL! });

const VALID = {
  recipientName: 'Metrics Probe',
  recipientRoleLine1: 'Head of Operations',
  recipientRoleLine2: '',
  clientCompany: 'Probe Co',
  proposalDate: '2026-08-02',
  selectedServiceIds: [] as string[],
};

async function generationCount(): Promise<number> {
  const { rows } = await db.query<{ n: string }>(
    `select count(*)::text n from pdf_generation g
       join app_user u on u.id = g.user_id
      where u.email = $1`,
    [TEST_MEMBER_EMAIL]
  );
  return Number(rows[0].n);
}

test.beforeAll(async () => {
  await db.connect();
});

test.afterAll(async () => {
  await db.end();
});

test('each delivered proposal records exactly one row (FR-014)', async ({ request }) => {
  const before = await generationCount();

  for (let i = 0; i < 3; i++) {
    const response = await request.post('/api/generate', { data: VALID, maxRedirects: 0 });
    expect(response.status()).toBe(200);
  }

  // after() runs post-response, so the write lands slightly behind the last 200.
  await expect
    .poll(generationCount, { timeout: 15_000, message: 'expected 3 new usage records' })
    .toBe(before + 3);
});

test('a failed generation records nothing (FR-015)', async ({ request }) => {
  const before = await generationCount();

  // Rejected at validation, so renderPdf never runs — and after() was never registered, which is
  // the whole reason it is registered inside the try and after the render resolves rather than at
  // the top of the handler.
  const response = await request.post('/api/generate', {
    data: { ...VALID, recipientName: '' },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(400);

  // Wait long enough that a stray write would have landed, then assert it did not.
  await new Promise((resolve) => setTimeout(resolve, 3000));
  expect(await generationCount()).toBe(before);
});

test('an unauthenticated request records nothing', async ({ playwright }) => {
  const before = await generationCount();

  // ⚠️ storageState must be cleared explicitly — a bare newContext() picks up the suite-wide
  // signed-in state from playwright.config.ts, and the request would be authenticated after all.
  const anonymous = await playwright.request.newContext({
    baseURL: 'http://localhost:3000',
    storageState: { cookies: [], origins: [] },
  });
  const response = await anonymous.post('/api/generate', { data: VALID, maxRedirects: 0 });
  expect(response.status()).toBe(401);
  await anonymous.dispose();

  await new Promise((resolve) => setTimeout(resolve, 2000));
  expect(await generationCount()).toBe(before);
});

test('the counts a member sees equal the underlying rows (SC-006)', async ({ request, page }) => {
  await request.post('/api/generate', { data: VALID, maxRedirects: 0 });
  await expect.poll(generationCount, { timeout: 15_000 }).toBeGreaterThan(0);

  const expected = await generationCount();
  await page.goto('/dashboard');

  // The figure on screen, not a re-query — this is the assertion SC-006 actually makes.
  await expect(page.getByText('Your proposals generated')).toBeVisible();
  await expect(page.getByText(String(expected), { exact: true })).toBeVisible();
});

test('a Sales member is shown no organisation-wide figure (FR-009)', async ({ page }) => {
  const response = await page.goto('/dashboard');
  const body = (await response?.text()) ?? '';

  await expect(page.getByText('Your proposals generated')).toBeVisible();
  // Absent from the payload, not merely unrendered: the admin branch is never fetched.
  expect(body).not.toContain('Active members');
  expect(body).not.toContain('Proposals generated (all time)');
});
