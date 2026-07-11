import { test, expect, type Page } from '@playwright/test';

const PLOT = '[data-testid="transform-plot"]';

async function goto(page: Page): Promise<void> {
  await page.goto('/explorers/transformations');
  await expect(page.locator(`${PLOT} svg`)).toBeVisible();
}

/** Count the rendered function-plot series (each is a <g class="graph">). */
const seriesCount = (page: Page): Promise<number> =>
  page.locator(`${PLOT} g.graph`).count();

test('renders a dashed parent and a solid transformed curve by default', async ({ page }) => {
  await goto(page);
  expect(await seriesCount(page)).toBe(2);
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
  // KNOWN BUG (src/components/ui/slider.tsx): aria-label lands on
  // SliderPrimitive.Root, not the Thumb that carries role="slider" — so the
  // accessible name never reaches the actual slider element. This query
  // is intentionally accessible-name-based (the correct way to target a
  // labelled control) and is expected to time out until that's fixed. A
  // shorter timeout keeps the failure fast instead of burning the full 30s.
  test.setTimeout(10_000);
  const kSlider = page.getByRole('slider', { name: /k — vertical shift/i });
  await kSlider.focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight'); // +2.0 at step 0.1
  // Scoped to the readout <li> (see comment on the first test) — avoids a
  // race with the debounced sr-only live-region echoing the same text.
  await expect(page.locator('li').filter({ hasText: /Shifted up/i })).toBeVisible();
  expect(await seriesCount(page)).toBe(2);
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
});

test('a custom function plots and transforms', async ({ page }) => {
  await goto(page);
  await page.locator('#fx-input').fill('1/x');
  await page.getByRole('button', { name: 'Plot' }).click();
  expect(await seriesCount(page)).toBe(2);
});

test('b = 0 explains the collapse instead of blanking silently', async ({ page }) => {
  await goto(page);
  // Same known accessible-name bug as above — see the comment in "moving a
  // slider updates the readout". Kept accessible-name-based on purpose.
  test.setTimeout(10_000);
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
  expect(await seriesCount(page)).toBe(2);
});
