import { test, expect, type Page } from '@playwright/test';

import { downloadExport, readDownload } from './export-helpers';

const DIAGRAM = '[data-testid="angle-diagram"]';

async function goto(page: Page): Promise<void> {
  await page.goto('/explorers/angles');
  await expect(page.locator(`${DIAGRAM} svg`)).toBeVisible();
}

test('exports the current angle as a PNG artifact', async ({ page }) => {
  await goto(page);

  const download = await downloadExport(page, 'PNG', async (artifact) => {
    const text = await artifact.evaluate((node) => node.textContent);
    expect(text).toContain('Angle Explorer');
    // Default angle is 30°.
    expect(text).toContain('30');
  });

  expect(download.suggestedFilename()).toMatch(
    /^angle-explorer-\d{4}-\d{2}-\d{2}-\d{6}\.png$/,
  );
  const bytes = await readDownload(download);
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
});

test('exports the current angle as a PDF artifact', async ({ page }) => {
  await goto(page);

  const pdf = await downloadExport(page, 'PDF');
  expect(pdf.suggestedFilename()).toMatch(
    /^angle-explorer-\d{4}-\d{2}-\d{2}-\d{6}\.pdf$/,
  );
  const pdfBytes = await readDownload(pdf);
  expect(pdfBytes.subarray(0, 5).toString()).toBe('%PDF-');
});
