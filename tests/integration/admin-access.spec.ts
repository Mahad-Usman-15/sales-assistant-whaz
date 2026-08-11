import { test, expect } from '@playwright/test';

/**
 * SC-003 / FR-009 / FR-011 — a Sales member reaches nothing administrative, by any route.
 *
 * The suite's default session is a SALES member (see auth.setup.ts), which is exactly the actor
 * this needs. Hiding the nav link is cosmetic; these tests check the surfaces themselves.
 */

test('a Sales member sees the not-found page, not the members list', async ({ page }) => {
  await page.goto('/dashboard/members');

  // notFound(), not a 403 page: the content must not confirm the resource exists (FR-011).
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
});

test('no member data reaches the page a Sales member can load', async ({ page }) => {
  const response = await page.goto('/dashboard/members');
  const body = (await response?.text()) ?? '';

  // The RSC payload is in the HTML. If the admin queries had run before the guard, the data would
  // be here even though nothing renders — which is why requireAdmin() precedes listMembers().
  //
  // Checks OTHER members' data specifically. The signed-in member's own address legitimately
  // appears in the shell header, so asserting on it would fail for the wrong reason.
  expect(body).not.toContain('mahadusmn07');
  expect(body).not.toContain('Pending invitations');
  expect(body).not.toContain('Invite member');
});

/**
 * ⚠️ KNOWN GAP, deliberately asserted rather than hidden.
 *
 * A forbidden route answers 200-with-404-content, while a genuinely missing one answers 404. The
 * status codes are therefore distinguishable, so a Sales member can infer that /dashboard/members
 * exists — which FR-011 forbids, strictly read.
 *
 * Cause: the (dashboard) layout is an async Server Component that streams before the page's
 * notFound() fires, and the status is committed at the first flush. Moving the check into a nested
 * segment layout was tried and does not help — the parent still flushes first.
 *
 * Severity is low: no member data leaks, and the rendered page is the standard 404. Closing it
 * properly would require a role lookup in proxy.ts, which R5 rejected for putting a database read
 * on every matched request's TTFB.
 *
 * This test pins the CURRENT behaviour so the gap stays visible. If it starts failing because the
 * forbidden route began returning 404, that is the gap closing — update the expectation and delete
 * this note.
 */
test('KNOWN GAP: forbidden and missing routes differ by status code (FR-011)', async ({ page }) => {
  const forbidden = await page.goto('/dashboard/members');
  const missing = await page.goto('/dashboard/definitely-not-a-real-page');

  expect(forbidden?.status()).toBe(200);
  expect(missing?.status()).toBe(404);
});

test('the dashboard shows a Sales member no admin navigation', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: /members/i })).toHaveCount(0);
});

test('a Sales member can still reach the generator', async ({ page }) => {
  // FR-012: gating the dashboard must not gate the thing the tool exists for.
  await page.goto('/');
  await expect(page.getByRole('button', { name: /generate proposal/i })).toBeVisible();
});
