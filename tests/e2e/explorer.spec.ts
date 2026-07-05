import { test, expect, type Page } from '@playwright/test';

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

test('starts with no function and no point until one is plotted', async ({ page }) => {
  await page.goto('/explorers/function');
  await expect(page.locator(`${PLOT} svg`)).toBeVisible();
  await expect(page.locator(POINT)).toHaveCount(0); // no default function
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
