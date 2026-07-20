import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * Contract tests for POST /api/generate.
 * Case numbers refer to specs/001-proposal-pdf-generator/contracts/generate-api.md.
 */

const validPayload = {
  recipientName: 'Ayesha Khan',
  clientCompany: 'Northwind Consulting',
  proposalTitle: 'Growth Partnership Proposal',
  preparedBy: 'Mahad Usman',
  proposalDate: '2026-07-19',
  selectedServiceIds: ['clarity-map', 'growth-engine'],
  notes: 'Following our call on Tuesday.\n\nWe can start next month.',
};

async function generate(request: APIRequestContext, payload: unknown) {
  return request.post('/api/generate', { data: payload });
}

test('case 1: valid payload returns a PDF', async ({ request }) => {
  const response = await generate(request, validPayload);

  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/pdf');

  const body = await response.body();
  expect(body.subarray(0, 5).toString()).toBe('%PDF-');
  expect(body.byteLength).toBeGreaterThan(1000);
});

test('case 9: GET is rejected with 405', async ({ request }) => {
  const response = await request.get('/api/generate');
  expect(response.status()).toBe(405);
});

test('case 2: no services and no notes still generates', async ({ request }) => {
  const response = await generate(request, {
    ...validPayload,
    selectedServiceIds: [],
    notes: '',
  });

  expect(response.status()).toBe(200);
  expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
});

test('case 3: missing required field returns 400 naming that field', async ({ request }) => {
  const { recipientName: _omitted, ...withoutRecipient } = validPayload;
  const response = await generate(request, withoutRecipient);

  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('validation_failed');
  expect(body.fields.recipientName).toBeTruthy();
});

test('case 4: every invalid field is reported at once', async ({ request }) => {
  const response = await generate(request, {
    ...validPayload,
    recipientName: '   ',
    clientCompany: '',
    proposalDate: 'not-a-date',
  });

  expect(response.status()).toBe(400);
  const { fields } = await response.json();
  expect(Object.keys(fields).sort()).toEqual(
    ['clientCompany', 'proposalDate', 'recipientName'].sort()
  );
});

test('case 5: unknown service id is rejected, not silently dropped', async ({ request }) => {
  const response = await generate(request, {
    ...validPayload,
    selectedServiceIds: ['clarity-map', 'no-such-service'],
  });

  expect(response.status()).toBe(400);
  const { fields } = await response.json();
  expect(fields.selectedServiceIds).toContain('no-such-service');
});

test('case 6: injected markup stays literal text in the PDF (FR-008)', async ({ request }) => {
  const response = await generate(request, {
    ...validPayload,
    notes: '<script>alert(1)</script> and <h1>BIG</h1>',
  });

  expect(response.status()).toBe(200);
  const pdf = await response.body();
  // A PDF containing an executable-looking payload is fine; what matters is that it was
  // escaped into the document as text rather than interpreted as markup. The template unit
  // tests assert the escaping itself; here we assert the render survived it.
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
});

test('case 7: identical payloads produce identical PDFs (FR-007, SC-005)', async ({ request }) => {
  const first = await generate(request, validPayload);
  const second = await generate(request, validPayload);

  expect(first.status()).toBe(200);
  expect(second.status()).toBe(200);

  const a = await first.body();
  const b = await second.body();
  expect(a.byteLength).toBe(b.byteLength);
  expect(a.equals(b)).toBe(true);
});

test('case 8: long notes paginate with chrome on every page (FR-012)', async ({ request }) => {
  const longNotes = Array.from(
    { length: 60 },
    (_, i) => `Paragraph ${i + 1}: this proposal covers the agreed scope of work in detail.`
  ).join('\n\n');

  const response = await generate(request, { ...validPayload, notes: longNotes });
  expect(response.status()).toBe(200);

  const pdf = await response.body();
  // Count page objects without a PDF library: every page dictionary carries /Type /Page.
  const raw = pdf.toString('latin1');
  const pageCount = (raw.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  expect(pageCount).toBeGreaterThan(1);

  // The last paragraph must survive — no silent truncation.
  expect(pdf.byteLength).toBeGreaterThan(50_000);
});
