import { test, expect, type Page } from '@playwright/test';

async function fillRequired(page: Page) {
  await page.getByLabel('Recipient name').fill('Randy Newcomb');
  await page.getByLabel('Role line 1').fill('Senior Advisor, The Omidyar Group');
  await page.getByLabel('Client company').fill('Humanity United');
}

test('US1: filling the form downloads a branded PDF', async ({ page }) => {
  await page.goto('/');
  await fillRequired(page);

  await page.getByRole('checkbox', { name: /Clarity Map/ }).check();
  await page.getByLabel(/Role line 2/).fill('Founding President & CEO, Humanity United');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Generate proposal/ }).click();

  // The in-progress indicator must appear while rendering (FR-016).
  await expect(page.getByRole('status')).toBeVisible();

  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^proposal-humanity-united-\d{4}-\d{2}-\d{2}\.pdf$/
  );

  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const pdf = Buffer.concat(chunks);

  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  expect(pdf.byteLength).toBeGreaterThan(1000);
});

test('US1: the date field defaults to today', async ({ page }) => {
  await page.goto('/');
  const value = await page.getByLabel('Proposal date').inputValue();
  expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test('US3: a missing required field blocks generation with a named error', async ({ page }) => {
  await page.goto('/');
  await fillRequired(page);
  await page.getByLabel('Recipient name').fill('');

  await page.getByRole('button', { name: /Generate proposal/ }).click();

  const error = page.getByRole('alert').first();
  await expect(error).toBeVisible();
  await expect(error).toContainText(/Recipient name is required/i);

  // No spinner, because the request was never made.
  await expect(page.getByRole('status')).toBeHidden();
});

test('US3: fixing the error then submitting succeeds', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Generate proposal/ }).click();
  await expect(page.getByRole('alert').first()).toBeVisible();

  await fillRequired(page);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Generate proposal/ }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toContain('.pdf');
});
