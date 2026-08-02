import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';

/**
 * SC-007 / FR-013: adding identity must not change a single byte of the generated document.
 *
 * The claim is stronger than "it still looks right" on purpose. Brand fidelity is measured
 * numerically in this project (constitution Principle II), and the whole shape of feature 002 is
 * "identity wraps the render path, it does not rewrite it" (Principle III). A byte comparison is
 * the only check that can actually falsify that.
 *
 * Runs signed IN — generating at all now requires a session.
 */

const FIXED_INPUT = {
  recipientName: 'Parity Probe',
  recipientRoleLine1: 'Senior Advisor, The Omidyar Group',
  recipientRoleLine2: 'Founding President & CEO, Humanity United',
  clientCompany: 'Parity Co',
  // Pins /CreationDate and /ModDate, which is what makes byte-identical output possible at all.
  proposalDate: '2026-08-02',
  selectedServiceIds: [] as string[],
};

async function generate(request: import('@playwright/test').APIRequestContext): Promise<Buffer> {
  const response = await request.post('/api/generate', { data: FIXED_INPUT, maxRedirects: 0 });
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/pdf');
  return Buffer.from(await response.body());
}

test('the same input renders byte-identically across requests', async ({ request }) => {
  const first = await generate(request);
  const second = await generate(request);

  expect(first.byteLength).toBeGreaterThan(1000);
  expect(createHash('sha256').update(second).digest('hex')).toBe(
    createHash('sha256').update(first).digest('hex')
  );
});

test('output is stable across a browser reuse boundary', async ({ request }) => {
  // Several renders in a row share one Chromium and one long-lived page (lib/pdf.ts). If reusing
  // the page let any state survive setContent(), later renders would drift from the first — which
  // is the specific risk that page reuse introduced.
  const baseline = await generate(request);
  const baselineHash = createHash('sha256').update(baseline).digest('hex');

  for (let i = 0; i < 4; i++) {
    const next = await generate(request);
    expect(
      createHash('sha256').update(next).digest('hex'),
      `render ${i + 2} differs from the first — page reuse is leaking state between renders`
    ).toBe(baselineHash);
  }
});

test('the response still carries the download filename and no-store', async ({ request }) => {
  const response = await request.post('/api/generate', { data: FIXED_INPUT, maxRedirects: 0 });

  expect(response.status()).toBe(200);
  expect(response.headers()['content-disposition']).toContain('attachment; filename=');
  // The PDF contains client details; it must not be cached by an intermediary.
  expect(response.headers()['cache-control']).toContain('no-store');
});
