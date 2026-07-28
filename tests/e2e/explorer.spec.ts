import { test, expect, type Page } from '@playwright/test';

import { downloadExport, readDownload } from './export-helpers';

const POINT = '[data-testid="explorer-point"]';
const PLOT = '[data-testid="explorer-plot"]';

/** Screen-space center of the draggable point. */
async function pointCenter(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate((sel) => {
    const c = document.querySelector(sel);
    if (!c) throw new Error('point not found');
    const r = c.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, POINT);
}

const dataX = async (page: Page): Promise<number> =>
  Number(await page.locator(POINT).getAttribute('data-x'));

async function plot(page: Page, fn: string): Promise<void> {
  await page.locator('#fx-input').fill(fn);
  await page.getByRole('button', { name: 'Plot' }).click();
  await expect(page.locator(POINT)).toBeVisible();
}

async function gotoExplorer(page: Page, fn = '1/x^2'): Promise<void> {
  await page.goto('/explorers/function');
  await expect(page.locator(`${PLOT} svg`)).toBeVisible();
  await plot(page, fn);
}

test('exports a fixed light PNG from mobile dark mode while a limit animation runs', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.goto('/explorers/function');
  await expect(page.getByRole('button', { name: 'Export' })).toBeDisabled();
  await expect(page.getByTestId('explorer-function-details')).toHaveCount(0);
  await plot(page, '1/x^2');

  const liveDetails = page.getByTestId('explorer-function-details');
  await expect(liveDetails).toContainText('Function details · f(x) = 1/x²');
  await expect(liveDetails).toContainText('Domain(-∞, 0) ∪ (0, ∞)');
  await expect(liveDetails).toContainText('Range(0, ∞)');
  const placement = await liveDetails.evaluate((node) => {
    const heading = [...document.querySelectorAll('h3')].find(
      (candidate) => candidate.textContent === 'Animate a limit',
    );
    const controlCard = heading?.closest('[data-slot="card"]');
    return {
      sameColumn: controlCard?.parentElement === node.parentElement,
      immediatelyAfter: controlCard?.nextElementSibling === node,
    };
  });
  expect(placement).toEqual({ sameColumn: true, immediatelyAfter: true });
  const liveText = (await liveDetails.textContent()) ?? '';

  await page.getByRole('button', { name: 'x → 0⁺' }).click();
  const download = await downloadExport(page, 'PNG', async (artifact) => {
    const snapshot = await artifact.evaluate((node) => {
      const graph = node.querySelector('[data-testid="export-graph"]');
      const graphStyle = graph instanceof HTMLElement ? graph.style : null;
      return {
        text: node.textContent,
        rows: node.querySelectorAll('tbody tr').length,
        controls: node.querySelectorAll('button, input, select, nav').length,
        graph: graphStyle
          ? { width: parseFloat(graphStyle.width), height: parseFloat(graphStyle.height) }
          : null,
      };
    });
    expect(snapshot.text).toContain('f(x) = 1/x²');
    expect(snapshot.text).toContain(liveText);
    expect(snapshot.text).toContain('Current readout');
    expect(snapshot.text).toContain('Asymptotes and end behavior');
    expect(snapshot.rows).toBe(9);
    expect(snapshot.controls).toBe(0);
    expect(snapshot.graph).toMatchObject({ width: 960, height: 560 });
  });
  expect(download.suggestedFilename()).toMatch(
    /^function-explorer-\d{4}-\d{2}-\d{2}-\d{6}\.png$/,
  );
  const bytes = await readDownload(download);
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(bytes.readUInt32BE(16)).toBe(1440);

  const topLeft = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas unavailable');
    context.drawImage(image, 0, 0);
    return Array.from(context.getImageData(0, 0, 1, 1).data);
  }, bytes.toString('base64'));
  expect(topLeft.slice(0, 3)).toEqual([248, 250, 252]);

  const pdf = await downloadExport(page, 'PDF');
  expect(pdf.suggestedFilename()).toMatch(
    /^function-explorer-\d{4}-\d{2}-\d{2}-\d{6}\.pdf$/,
  );
  const pdfBytes = await readDownload(pdf);
  expect(pdfBytes.subarray(0, 5).toString()).toBe('%PDF-');
  expect(pdfBytes.toString('latin1')).toMatch(
    /\/MediaBox\s*\[\s*0\s+0\s+792(?:\.\d*)?\s+612(?:\.\d*)?\s*\]/,
  );
});

test('keeps Function Explorer export available for a wide window', async ({ page }) => {
  await gotoExplorer(page, 'x');
  const windowInputs = page.locator('input[type="number"]');
  await windowInputs.nth(0).fill('0');
  await windowInputs.nth(1).fill('201');
  await page.getByRole('button', { name: 'Apply window' }).click();

  await expect(page.getByRole('button', { name: 'Export' })).toBeEnabled();
  await expect(page.getByText(/Narrow the x window/)).toHaveCount(0);

  const download = await downloadExport(page, 'PNG', async (artifact) => {
    await expect(artifact.locator('tbody tr')).toHaveCount(9);
  });
  const bytes = await readDownload(download);
  expect(bytes.readUInt32BE(16)).toBe(1440);
  expect(bytes.readUInt32BE(20)).toBeGreaterThan(0);
});

test('starts with no function and no point until one is plotted', async ({ page }) => {
  await page.goto('/explorers/function');
  await expect(page.locator(`${PLOT} svg`)).toBeVisible();
  await expect(page.locator(POINT)).toHaveCount(0); // no default function
  await expect(page.getByTestId('explorer-function-details')).toHaveCount(0);
  await expect(page.getByText('Enter a function to begin')).toBeVisible();

  await plot(page, '1/x^2');
  for (const name of ['x → 0⁻', 'x → 0⁺', 'x → −∞', 'x → ∞']) {
    await expect(page.getByRole('button', { name })).toBeVisible();
  }
});

test('THE RULE: dragging toward the wall stops at the window edge — never slides to the wall or crosses branches', async ({
  page,
}) => {
  await gotoExplorer(page); // 1/x^2 exits the top (y=7) at x ≈ 0.378
  expect(await dataX(page)).toBeGreaterThan(0); // starts on the right branch (x = 1)

  const start = await pointCenter(page);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x - 400, start.y, { steps: 25 });
  await page.mouse.up();

  const x = await dataX(page);
  expect(x).toBeGreaterThan(0.2); // stopped at the edge crossing, NOT at the wall (~0.04)
  expect(x).toBeLessThan(0.55);
  expect(x).toBeGreaterThan(0); // never teleported to the left branch

  // The point sits at the top edge but stays inside the plot (not clipped off-canvas).
  const inside = await page.evaluate(
    ({ pointSel, plotSel }) => {
      const c = document.querySelector(pointSel)!.getBoundingClientRect();
      const p = document.querySelector(`${plotSel} svg`)!.getBoundingClientRect();
      return c.y >= p.y - 2 && c.y <= p.y + p.height;
    },
    { pointSel: POINT, plotSel: PLOT },
  );
  expect(inside).toBe(true);
});

test('a limit sweep stops at the window edge, not at the asymptote', async ({ page }) => {
  await gotoExplorer(page);
  await page.getByRole('button', { name: 'x → 0⁺' }).click();
  await page.waitForTimeout(1700);
  const x = await dataX(page);
  expect(x).toBeGreaterThan(0.2); // stopped at the edge (~0.378)
  expect(x).toBeLessThan(0.55);
  await expect(page.getByRole('button', { name: 'x → 0⁺' })).toHaveAttribute('aria-pressed', 'true');
});

test('pointer arbitration: dragging the point moves it without panning; dragging the background pans', async ({
  page,
}) => {
  await gotoExplorer(page);
  const xMin = page.locator('input[type="number"]').first();

  // (a) Drag ON the point: x changes, the window does not pan.
  const winBefore = await xMin.inputValue();
  const p = await pointCenter(page);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x - 120, p.y, { steps: 12 });
  await page.mouse.up();
  expect(await dataX(page)).toBeLessThan(1); // moved left
  expect(await xMin.inputValue()).toBe(winBefore); // no pan

  // (b) Drag the background (away from the point): the window pans.
  const box = (await page.locator(`${PLOT} svg`).boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.2, { steps: 15 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  expect(await xMin.inputValue()).not.toBe(winBefore); // panned
});

test('asymptote detection follows the function: tan(x) has many walls, x^2 has none', async ({
  page,
}) => {
  await gotoExplorer(page, 'tan(x)');
  await expect(page.getByRole('button', { name: 'x → 1.571⁻' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'x → -1.571⁺' })).toBeVisible();

  await plot(page, 'x^2');
  await expect(page.getByRole('button', { name: /→ 0/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'x → ∞' })).toBeVisible();
});

test('accessibility: a live status region carries the arrow text and the slider is keyboard-operable', async ({
  page,
}) => {
  await gotoExplorer(page);

  const start = await pointCenter(page);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x - 400, start.y, { steps: 20 });
  await page.mouse.up();
  await expect(page.locator('[role="status"]')).toContainText('f(x) → ∞', { timeout: 2000 });

  const before = await dataX(page);
  await page.locator('[role="slider"]').focus();
  await page.keyboard.press('ArrowRight');
  expect(await dataX(page)).toBeGreaterThan(before);
});

test('the Explorers nav link is marked current on the explorer page', async ({ page }) => {
  await gotoExplorer(page);
  await expect(page.getByRole('link', { name: 'Explorers' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('with no function plotted, points are disabled and the value table is empty', async ({ page }) => {
  await page.goto('/explorers/function');
  await expect(page.locator(`${PLOT} svg`)).toBeVisible();

  await expect(page.getByRole('checkbox', { name: /show points/i })).toBeDisabled();
  await expect(page.getByText('Plot a function to see its value table.')).toBeVisible();
});

test('show points marks whole-number crossings, and the value table lists integer x', async ({
  page,
}) => {
  await gotoExplorer(page, '1/x^2');

  await expect(page.locator('[data-testid="crossing-marker"]')).toHaveCount(0);
  await page.getByRole('checkbox', { name: /show points/i }).check();
  await expect(page.locator('[data-testid="crossing-marker"]').first()).toBeVisible();

  const table = page.locator('[data-testid="value-table"]');
  await expect(table).toBeVisible();
  // 1/x^2 at x = 2 is 0.25
  await expect(table.locator('tr[data-x="2"] td[data-col="fx"]')).toHaveText('0.25');
  // real column headers, not a grid of divs
  await expect(table.locator('th[scope="col"]').first()).toHaveText('x');
});

test('the point shape picker changes the marker shape, like the graphing calculator', async ({
  page,
}) => {
  await gotoExplorer(page, '1/x^2');
  await page.getByRole('checkbox', { name: /show points/i }).check();
  await expect(page.locator('circle[data-testid="crossing-marker"]').first()).toBeVisible();

  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Square' }).click();

  await expect(page.locator('rect[data-testid="crossing-marker"]').first()).toBeVisible();
  await expect(page.locator('circle[data-testid="crossing-marker"]')).toHaveCount(0);
});

test('shows the entered equation beside the solved form, and clears it afterwards', async ({
  page,
}) => {
  await gotoExplorer(page, '3y + 2x = 6');

  await expect(page.getByTestId('fx-entered-form')).toHaveText('3y + 2x = 6');
  await expect(page.getByTestId('fx-solved-form')).toHaveText('f(x) = (6 - 2 * x) / 3');

  // Plotting a plain function must not leave the previous equation's entered form behind.
  await plot(page, '1/x^2');
  await expect(page.getByTestId('fx-entered-form')).toHaveCount(0);
  await expect(page.getByTestId('fx-solved-form')).toHaveText('f(x) = 1/x^2');
});
