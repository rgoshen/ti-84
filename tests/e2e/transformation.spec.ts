import { test, expect, type Page } from '@playwright/test';

const PLOT = '[data-testid="transform-plot"]';

async function goto(page: Page): Promise<void> {
  await page.goto('/explorers/transformations');
  await expect(page.locator(`${PLOT} svg`)).toBeVisible();
}

test('renders a dashed parent and a solid transformed curve by default', async ({ page }) => {
  await goto(page);
  // Rendered function-plot series (each is a <g class="graph">) — a retrying
  // matcher waits out the render instead of racing it with a one-shot count().
  await expect(page.locator(`${PLOT} g.graph`)).toHaveCount(2);
  // The first series (parent) is dashed.
  const dashed = await page.locator(`${PLOT} g.graph`).first().locator('path').first().getAttribute('stroke-dasharray');
  expect(dashed).toBeTruthy();
  // Scoped to the readout <li> — the raw text also appears in the intro
  // paragraph, the "Parent function" picker label, and (once the debounced
  // live-region echoes it) a role="status" div, so an unscoped getByText hits
  // a Playwright strict-mode multi-match.
  await expect(page.locator('li').filter({ hasText: /parent function/i })).toBeVisible();
});

test('moving a slider updates the readout and keeps both curves', async ({ page }) => {
  await goto(page);
  const kSlider = page.getByRole('slider', { name: /k — vertical shift/i });
  await kSlider.focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight'); // +2.0 at step 0.1
  // Scoped to the readout <li> (see comment on the first test) — avoids a
  // race with the debounced sr-only live-region echoing the same text.
  await expect(page.locator('li').filter({ hasText: /Shifted up/i })).toBeVisible();
  await expect(page.locator(`${PLOT} g.graph`)).toHaveCount(2);
});

test('reflect toggle flips the sign and its pressed state', async ({ page }) => {
  await goto(page);
  const reflectX = page.getByRole('button', { name: /Reflect x-axis/i });
  await expect(reflectX).toHaveAttribute('aria-pressed', 'false');
  await reflectX.click();
  await expect(reflectX).toHaveAttribute('aria-pressed', 'true');
  // Scoped to the readout <li> (see comment on the first test) — avoids a
  // race with the debounced sr-only live-region echoing the same text.
  await expect(page.locator('li').filter({ hasText: /Reflected over the x-axis/i })).toBeVisible();
});

test('reset returns to the parent identity message', async ({ page }) => {
  await goto(page);
  await page.getByRole('button', { name: /Reflect y-axis/i }).click();
  await page.getByRole('button', { name: 'Reset' }).click();
  // Scoped to the readout <li> (see comment above) — the debounced sr-only
  // live-region div can echo the same text and cause a strict-mode multi-match.
  await expect(page.locator('li').filter({ hasText: /This is the parent function/i })).toBeVisible();
});

test('picking a different parent reframes and resets', async ({ page }) => {
  await goto(page);
  await page.getByRole('button', { name: 'sin x', exact: true }).click();
  await expect(page.getByRole('button', { name: 'sin x', exact: true })).toHaveAttribute('aria-pressed', 'true');
  // Scoped to the readout <li> (see comment above) — avoids a race with the
  // debounced sr-only live-region echoing the same text.
  await expect(page.locator('li').filter({ hasText: /This is the parent function f\(x\) = sin x/i })).toBeVisible();
  // sin x's default window (x∈[−2π,2π]≈[−6.28,6.28]) differs from the square
  // parent's default [−10,10] — confirm the picker actually reframed the view,
  // not just its own pressed state and readout text.
  const xMinInput = page.getByLabel('xMin', { exact: true });
  await expect(xMinInput).not.toHaveValue('-10');
  expect(Number(await xMinInput.inputValue())).toBeCloseTo(-6.283185, 3);
});

test('a custom function plots and transforms', async ({ page }) => {
  await goto(page);
  await page.locator('#fx-input').fill('1/x');
  await page.getByRole('button', { name: 'Plot' }).click();
  await expect(page.locator(`${PLOT} g.graph`)).toHaveCount(2);
});

test('b = 0 explains the collapse instead of blanking silently', async ({ page }) => {
  await goto(page);
  const bSlider = page.getByRole('slider', { name: /b — horizontal stretch/i });
  await bSlider.focus();
  // Default b = 1 at step 0.1 → 10 ArrowLeft reaches 0.
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowLeft');
  // Scoped to the readout <li> (see comment on the first test) — avoids a
  // race with the debounced sr-only live-region echoing the same text.
  await expect(page.locator('li').filter({ hasText: /b = 0: the graph collapses/i })).toBeVisible();
});

test('Explorers nav is marked current on this page', async ({ page }) => {
  await goto(page);
  await expect(page.getByRole('link', { name: 'Explorers' })).toHaveAttribute('aria-current', 'page');
});

test('dark mode still renders both curves', async ({ page }) => {
  await goto(page);
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator(`${PLOT} g.graph`)).toHaveCount(2);
});
