import { test, expect, type Page } from '@playwright/test';

import { downloadExport, readDownload } from './export-helpers';

const APPROVED_DATE = new Date('2026-07-12T12:00:00-07:00');
const VISUAL_TOLERANCE = { maxDiffPixelRatio: 0.001 } as const;

async function applyGraphingRegressionWindow(page: Page): Promise<void> {
  const fields = page.locator('input[type="number"]');
  for (const [index, value] of [
    '-10.459925966974',
    '11.57158384563583',
    '-5.739505589180887',
    '5.249036586587907',
  ].entries()) {
    await fields.nth(index).fill(value);
  }
  await page.getByRole('button', { name: 'Apply window' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(APPROVED_DATE);
});

test('Graphing Calculator matches the approved downloaded PNG', async ({ page }) => {
  await page.goto('/graphing');
  await page.locator('#eq-input').fill('x^2');
  await page.getByRole('button', { name: 'Plot' }).click();
  await applyGraphingRegressionWindow(page);

  const download = await downloadExport(page, 'PNG');

  expect(await readDownload(download)).toMatchSnapshot(
    'graphing-calculator-approved.png',
    VISUAL_TOLERANCE,
  );
});

test('Function Explorer matches the approved downloaded PNG', async ({ page }) => {
  await page.goto('/explorers/function');
  await page.locator('#fx-input').fill('1/x^2');
  await page.getByRole('button', { name: 'Plot' }).click();

  const download = await downloadExport(page, 'PNG');

  expect(await readDownload(download)).toMatchSnapshot(
    'function-explorer-approved.png',
    VISUAL_TOLERANCE,
  );
});

test('Transformation Explorer matches the approved downloaded PNG', async ({ page }) => {
  await page.goto('/explorers/transformations');
  await expect(page.getByRole('button', { name: 'Export' })).toBeEnabled();

  const download = await downloadExport(page, 'PNG');

  expect(await readDownload(download)).toMatchSnapshot(
    'transformation-explorer-approved.png',
    VISUAL_TOLERANCE,
  );
});
