import { test, expect, type Page } from '@playwright/test';

import { downloadExport, readDownload } from './export-helpers';

const PLOT = '[data-testid="transform-plot"]';

async function goto(page: Page): Promise<void> {
  await page.goto('/explorers/transformations');
  await expect(page.locator(`${PLOT} svg`)).toBeVisible();
}

test('exports one fixed transformation artifact across wide graph windows', async ({
  page,
}) => {
  await goto(page);
  const h = page.getByRole('slider', { name: /h — horizontal shift/i });
  await h.focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');

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
    expect(snapshot.text).toContain('g(x) = (x − 1)²');
    expect(snapshot.text).toContain('Function details');
    expect(snapshot.rows).toBe(9);
    expect(snapshot.controls).toBe(0);
    expect(snapshot.graph).toMatchObject({ width: 960, height: 560 });
  });
  expect(download.suggestedFilename()).toMatch(
    /^transformation-explorer-\d{4}-\d{2}-\d{2}\.png$/,
  );
  const bytes = await readDownload(download);
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(bytes.readUInt32BE(16)).toBe(1440);
  expect(bytes.readUInt32BE(20)).toBeLessThan(1440);

  const pdf = await downloadExport(page, 'PDF');
  const pdfBytes = await readDownload(pdf);
  expect(pdfBytes.subarray(0, 5).toString()).toBe('%PDF-');
  expect(pdfBytes.toString('latin1')).toMatch(
    /\/MediaBox\s*\[\s*0\s+0\s+792(?:\.\d*)?\s+612(?:\.\d*)?\s*\]/,
  );

  await page.getByLabel('xMin', { exact: true }).fill('0');
  await page.getByLabel('xMax', { exact: true }).fill('201');
  await page.getByRole('button', { name: 'Apply window' }).click();
  await expect(page.getByRole('button', { name: 'Export' })).toBeEnabled();
  await expect(page.getByText(/Narrow the x window/)).toHaveCount(0);

  const wideDownload = await downloadExport(page, 'PNG', async (artifact) => {
    await expect(artifact.locator('tbody tr')).toHaveCount(9);
  });
  const wideBytes = await readDownload(wideDownload);
  expect(wideBytes.readUInt32BE(16)).toBe(1440);
  expect(wideBytes.readUInt32BE(20)).toBeLessThan(1440);
});

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
  await page.getByRole('combobox', { name: 'Parent function' }).click();
  await page.getByRole('option', { name: /sin x/i }).click();

  // Scoped to the readout <li> (see comment on the first test) — avoids a race with
  // the debounced sr-only live-region echoing the same text.
  await expect(page.locator('[data-testid="equation-readout"]')).toContainText('g(x) = sin x');

  // sin x's default window (x∈[−2π,2π]≈[−6.28,6.28]) differs from the square
  // parent's default [−10,10] — confirm the picker actually reframed the view,
  // not just its own label and readout text.
  const xMinInput = page.getByLabel('xMin', { exact: true });
  await expect(xMinInput).not.toHaveValue('-10');
  expect(Number(await xMinInput.inputValue())).toBeCloseTo(-6.283185, 3);
});

test('the new parents are selectable and reframe the view', async ({ page }) => {
  await goto(page);
  await page.getByRole('combobox', { name: 'Parent function' }).click();
  await page.getByRole('option', { name: /cube root/i }).click();
  await expect(page.locator('[data-testid="equation-readout"]')).toContainText('g(x) = ∛x');
  await expect(page.locator(`${PLOT} g.graph`)).toHaveCount(2);
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

test('show points marks both curves; hiding the parent drops its markers but keeps its column', async ({
  page,
}) => {
  await goto(page);
  await page.getByRole('checkbox', { name: /show points/i }).check();

  await expect(page.locator('[data-testid="crossing-marker-parent"]').first()).toBeVisible();
  await expect(page.locator('[data-testid="crossing-marker-transformed"]').first()).toBeVisible();

  // Hiding the parent removes its MARKERS…
  await page.getByRole('checkbox', { name: /show parent/i }).uncheck();
  await expect(page.locator('[data-testid="crossing-marker-parent"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="crossing-marker-transformed"]').first()).toBeVisible();

  // …but the f(x) COLUMN stays: the table is data, not decoration.
  await expect(
    page.locator('[data-testid="value-table"] tr[data-x="1"] td[data-col="fx"]'),
  ).toBeVisible();
});

test('the value table shows f(x) and g(x), and a vertical shift moves g by exactly k', async ({
  page,
}) => {
  await goto(page);
  const table = page.locator('[data-testid="value-table"]');

  // Parent x²: at x = 1, f = 1 and (identity) g = 1.
  await expect(table.locator('tr[data-x="1"] td[data-col="fx"]')).toHaveText('1');
  await expect(table.locator('tr[data-x="1"] td[data-col="gx"]')).toHaveText('1');

  // k = +2  →  g(x) = f(x) + 2, so g(1) = 3 while f(1) is unchanged.
  const k = page.getByRole('slider', { name: /k — vertical shift/i });
  await k.focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight'); // step 0.1 × 20
  await expect(table.locator('tr[data-x="1"] td[data-col="gx"]')).toHaveText('3');
  await expect(table.locator('tr[data-x="1"] td[data-col="fx"]')).toHaveText('1');
});

test('the point shape picker changes the markers on both curves', async ({ page }) => {
  await goto(page);
  await page.getByRole('checkbox', { name: /show points/i }).check();
  await expect(
    page.locator('circle[data-testid="crossing-marker-transformed"]').first(),
  ).toBeVisible();

  await page.getByRole('combobox', { name: 'Point shape' }).click();
  await page.getByRole('option', { name: 'Triangle' }).click();

  // Both curves follow the picked shape; colour is what separates them (same as graph).
  await expect(page.locator('path[data-testid="crossing-marker-parent"]').first()).toBeVisible();
  await expect(
    page.locator('path[data-testid="crossing-marker-transformed"]').first(),
  ).toBeVisible();
  await expect(page.locator('circle[data-testid="crossing-marker-transformed"]')).toHaveCount(0);
});

test('function details describe the parent and the transformed curve', async ({ page }) => {
  await goto(page);
  const details = page.locator('[data-testid="function-details"]');

  // Parent x²: domain all reals, range y ≥ 0.
  await expect(details.locator('tr[data-row="domain"] td[data-col="fx"]')).toHaveText('all real numbers');
  await expect(details.locator('tr[data-row="range"] td[data-col="fx"]')).toHaveText('y ≥ 0');
  await expect(details.locator('tr[data-row="range"] td[data-col="gx"]')).toHaveText('y ≥ 0');

  // k = +2 lifts only g's range, leaving f's alone — the whole point of the panel.
  const k = page.getByRole('slider', { name: /k — vertical shift/i });
  await k.focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight'); // step 0.1 × 20
  await expect(details.locator('tr[data-row="range"] td[data-col="gx"]')).toHaveText('y ≥ 2');
  await expect(details.locator('tr[data-row="range"] td[data-col="fx"]')).toHaveText('y ≥ 0');
});

test('ln shows its domain and its asymptote moves with h', async ({ page }) => {
  await goto(page);
  await page.getByRole('combobox', { name: 'Parent function' }).click();
  await page.getByRole('option', { name: /natural log/i }).click();

  const details = page.locator('[data-testid="function-details"]');
  await expect(details.locator('tr[data-row="domain"] td[data-col="fx"]')).toHaveText('x > 0');
  await expect(details.locator('tr[data-row="verticalAsymptote"] td[data-col="gx"]')).toHaveText('x = 0');

  // Shift right 2 → the vertical asymptote follows.
  const h = page.getByRole('slider', { name: /h — horizontal shift/i });
  await h.focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight'); // step 0.1 × 20
  await expect(details.locator('tr[data-row="verticalAsymptote"] td[data-col="gx"]')).toHaveText('x = 2');
  await expect(details.locator('tr[data-row="domain"] td[data-col="gx"]')).toHaveText('x > 2');
});

test('a custom function reports that details are unavailable', async ({ page }) => {
  await goto(page);
  await page.locator('#fx-input').fill('x^4');
  await page.getByRole('button', { name: 'Plot' }).click();
  await expect(page.getByText(/not available for a custom function/i)).toBeVisible();
});

test('the readout shows the real equation, not just f(x)', async ({ page }) => {
  await goto(page);
  const readout = page.locator('[data-testid="equation-readout"]');

  // The readout names the function outright — no 'g(x) = f(x)' tautology.
  await expect(readout).toContainText('g(x) = x²');
  await expect(readout).not.toContainText('f(x)');

  // A vertical stretch shows the ACTUAL equation, never 'g(x) = 2·f(x)'.
  const a = page.getByRole('slider', { name: /a — vertical stretch/i });
  await a.focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight'); // 1 → 2 at step 0.1
  await expect(readout).toContainText('g(x) = 2x²'); // the real equation…
  await expect(readout).not.toContainText('f(x)'); // …and f(x) is gone entirely
});

test('even a custom typed function is written out, never as f(x)', async ({ page }) => {
  await goto(page);
  await page.locator('#fx-input').fill('x^4');
  await page.getByRole('button', { name: 'Plot' }).click();

  // A custom f(x) has no notation template, so mathjs simplifies the composed
  // expression instead. It must still be a real equation.
  const readout = page.locator('[data-testid="equation-readout"]');
  await expect(readout).toContainText('g(x) = x^4');
  await expect(readout).not.toContainText('f(x)');
});

test('the concrete equation follows the parent and the shifts', async ({ page }) => {
  await goto(page);
  await page.getByRole('combobox', { name: 'Parent function' }).click();
  await page.getByRole('option', { name: /reciprocal/i }).click();

  const readout = page.locator('[data-testid="equation-readout"]');
  await expect(readout).toContainText('g(x) = 1/x');

  // Shift right 3 → 1/(x − 3). Parenthesised: '1/x − 3' would be a different function.
  const h = page.getByRole('slider', { name: /h — horizontal shift/i });
  await h.focus();
  for (let i = 0; i < 30; i++) await page.keyboard.press('ArrowRight'); // +3.0
  await expect(readout).toContainText('g(x) = 1/(x − 3)');
});
