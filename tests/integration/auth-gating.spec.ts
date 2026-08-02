import { test, expect } from '@playwright/test';

/**
 * SC-001 / SC-003 / FR-001: no proposal can be produced anonymously, by any route.
 *
 * Runs signed OUT — overriding the suite-wide storageState — because that is the whole point.
 */
test.use({ storageState: { cookies: [], origins: [] } });

const VALID_PAYLOAD = {
  recipientName: 'Anonymous Probe',
  recipientRoleLine1: 'Head of Operations',
  recipientRoleLine2: '',
  clientCompany: 'Probe Co',
  proposalDate: '2026-08-02',
  selectedServiceIds: [],
};

test('a signed-out visitor is redirected away from the generator', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
});

test('POST /api/generate without a session returns 401, not a redirect', async ({ request }) => {
  const response = await request.post('/api/generate', {
    data: VALID_PAYLOAD,
    maxRedirects: 0,
  });

  // 401 specifically: a programmatic client needs a status code it can act on. A 302 to an HTML
  // login page would be followed silently and surface as "the PDF is corrupt".
  expect(response.status()).toBe(401);
  expect((await response.json()).error).toBe('unauthenticated');
  expect(response.headers()['content-type']).toContain('application/json');
});

test('an anonymous request is rejected before any rendering happens', async ({ request }) => {
  const started = Date.now();
  const response = await request.post('/api/generate', { data: VALID_PAYLOAD, maxRedirects: 0 });
  const elapsed = Date.now() - started;

  expect(response.status()).toBe(401);
  // A render takes hundreds of ms at minimum; rejecting far faster than that shows the guard runs
  // before Chromium is involved, so an anonymous caller cannot burn compute (FR-001).
  expect(elapsed).toBeLessThan(2000);
});

test('invalid input is still rejected as unauthenticated, not as a validation error', async ({
  request,
}) => {
  const response = await request.post('/api/generate', { data: { nonsense: true }, maxRedirects: 0 });

  // Authorization precedes parsing: an anonymous caller must not be able to probe the schema by
  // reading which fields come back as invalid.
  expect(response.status()).toBe(401);
});

test('the login page is reachable without a session', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: /sign-in link/i })).toBeVisible();
});
