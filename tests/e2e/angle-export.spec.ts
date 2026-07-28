import { test, expect, type Page } from '@playwright/test';

import { downloadExport, readDownload } from './export-helpers';

// The figure carries its own test id (`angle-figure`) rather than being found
// by shape (a descendant or direct-child `svg` selector under the container).
// The coordinates block renders KaTeX radicals (e.g. the default 30° angle's
// √3/2) as their own nested <svg> elements, so a descendant selector is
// ambiguous, and a direct-child selector only works by accident — it silently
// depends on the figure's `<svg>` never being wrapped by markup that later
// lands inside the container. A dedicated test id can't be captured that way.
const FIGURE = '[data-testid="angle-figure"]';

async function goto(page: Page): Promise<void> {
  await page.goto('/explorers/angles');
  await expect(page.locator(FIGURE)).toBeVisible();
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

test('carries the terminal point into the exported artifact', async ({ page }) => {
  await goto(page);

  await downloadExport(page, 'PNG', async (artifact) => {
    const text = await artifact.evaluate((node) => node.textContent);
    // Default is 30° on the unit circle.
    expect(text).toContain('Point (x, y)');
    expect(text).toContain('√3/2');
    expect(text).toContain('0.866');
  });
});
