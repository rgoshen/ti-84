import { test, expect, type Page } from '@playwright/test';

const DIAGRAM = '[data-testid="angle-diagram"]';
// The figure carries its own test id (`angle-figure`) rather than being found
// by shape (a descendant or direct-child `svg` selector under DIAGRAM). The
// coordinates block renders KaTeX radicals (e.g. a chart angle's √3/2 — the
// default is now 0°, whose point (1, 0) has no radical) as their own nested
// <svg> elements, so a descendant selector is ambiguous, and a direct-child
// selector only works by accident — it silently depends on the figure's
// `<svg>` never being wrapped by markup that later lands inside the
// container. A dedicated test id can't be captured that way. DIAGRAM itself
// is still legitimate for lookups that really do target the container, e.g.
// the coordinate-label below.
const FIGURE = '[data-testid="angle-figure"]';
const READOUT = '[data-testid="angle-readout"]';

// getByLabel('Degrees') is AMBIGUOUS — it also matches the SVG, whose aria-label
// contains the word "degrees" — and throws a Playwright strict-mode violation [G13].
const deg = (page: Page) => page.getByRole('textbox', { name: 'Degrees' });
const rad = (page: Page) => page.getByRole('textbox', { name: 'Radians' });

async function goto(page: Page): Promise<void> {
  await page.goto('/explorers/angles');
  await expect(page.locator(FIGURE)).toBeVisible();
}

test('renders the default angle, stating the zero identity once', async ({ page }) => {
  await goto(page);
  const readout = page.locator(READOUT);
  await expect(deg(page)).toHaveValue('0');
  await expect(rad(page)).toHaveValue('0');
  // The collapsed form. "0° = 0 of a full turn = 0 × 2π = 0 ≈ 0 rad" was true
  // and useless, and at the 0° default it is the first thing a visitor reads.
  await expect(readout).not.toContainText('full turn');
  await expect(readout).toContainText('rad');
});

test('is reachable from the explorers catalog', async ({ page }) => {
  await page.goto('/explorers');
  await page.getByRole('link', { name: /Open the Angle Explorer/i }).click();
  await expect(page).toHaveURL(/\/explorers\/angles/);
  await expect(page.locator(FIGURE)).toBeVisible();
});

test('converts pi/3 typed in radians to exactly 60 degrees', async ({ page }) => {
  await goto(page);
  await rad(page).fill('pi/3');
  await expect(deg(page)).toHaveValue('60');
  await expect(page.locator(READOUT)).toContainText('60');
});

test('converts 1 radian to the value the 1-degree slider cannot reach', async ({ page }) => {
  await goto(page);
  await rad(page).fill('1');
  await expect(deg(page)).toHaveValue('57.2958');
});

test('degrees drive radians in the other direction', async ({ page }) => {
  await goto(page);
  await deg(page).fill('180');
  await expect(rad(page)).toHaveValue('3.1416');
});

test('invalid input reports an error and leaves the diagram intact', async ({ page }) => {
  await goto(page);
  // A distinct valid angle first, independent of the default: if this stayed
  // at 0 (or any digit shared with the default's other readouts), a regression
  // that fell back to the wrong angle on invalid input could still leave a '0'
  // somewhere in the readout and pass here for the wrong reason.
  await deg(page).fill('37');
  await deg(page).fill('abc');
  await expect(page.getByTestId('angle-input-error')).toHaveText(/./);
  // The last valid angle survives the typo.
  await expect(page.locator(READOUT)).toContainText('37');
  await expect(page.locator(FIGURE)).toBeVisible();
});

test('the angle slider drives the readout and both fields', async ({ page }) => {
  await goto(page);
  const angle = page.getByRole('slider', { name: 'angle' });
  await angle.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  // Five 1° steps from the 0° default land on 5°, not the old 30° + 5.
  await expect(deg(page)).toHaveValue('5');
  await expect(rad(page)).toHaveValue('0.0873');
  await expect(page.locator(READOUT)).toContainText('5');
});

test('a full 360 degree sweep still draws an arc', async ({ page }) => {
  await goto(page);
  // Regression guard: a 360° arc built from a single SVG "A" command renders nothing.
  await deg(page).fill('360');
  const drawn = await page.locator(`${FIGURE} path`).evaluateAll((nodes) =>
    nodes.some((n) => (n.getAttribute('d') ?? '').split('A').length > 2),
  );
  expect(drawn).toBe(true);
});

test('the position slider rotates the figure [G3]', async ({ page }) => {
  await goto(page);
  // Explicit, non-zero angle: at the 0° default the swept arc's path is empty
  // (start === end regardless of β), so this test would fail every time rather
  // than proving rotation — it needs a real sweep to have a shape that rotates.
  await deg(page).fill('30');
  const arcOf = () =>
    page.locator(`${FIGURE} path`).first().getAttribute('d');
  const before = await arcOf();

  const position = page.getByRole('slider', { name: 'position' });
  await position.focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight');

  // Guards against β becoming inert. The rigid-body correctness check — that every
  // element rotates together — is the manual step in Task 5, since asserting it here
  // would couple the test to the drawing geometry.
  expect(await arcOf()).not.toBe(before);
});

test('reset restores every control [G8]', async ({ page }) => {
  await goto(page);
  await deg(page).fill('200');
  const radius = page.getByRole('slider', { name: 'radius' });
  const position = page.getByRole('slider', { name: 'position' });
  await radius.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  await position.focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');

  await expect(deg(page)).toHaveValue('200');
  await expect(radius).toHaveAttribute('aria-valuenow', '1.3');
  await expect(position).toHaveAttribute('aria-valuenow', '10');

  await page.getByRole('button', { name: 'Reset' }).click();

  // All four controls, not just the two fields.
  await expect(deg(page)).toHaveValue('0');
  await expect(rad(page)).toHaveValue('0');
  await expect(radius).toHaveAttribute('aria-valuenow', '1');
  await expect(position).toHaveAttribute('aria-valuenow', '0');
});

test('reset still works while a validation error is showing [G14]', async ({ page }) => {
  await goto(page);
  // REGRESSION GUARD. This shipped broken once: the error element was conditionally
  // rendered, so blurring the field on mousedown unmounted it, the column reflowed,
  // and the Reset button moved out from under the cursor before mouseup. The click
  // never landed. A control case that resets from a VALID value passes either way —
  // only a non-default angle PLUS a visible error exposes it.
  await deg(page).fill('180');
  await expect(rad(page)).toHaveValue('3.1416');
  await deg(page).fill('abc');
  await expect(page.getByTestId('angle-input-error')).toHaveText(/./);

  await page.getByRole('button', { name: 'Reset' }).click();

  await expect(deg(page)).toHaveValue('0');
  await expect(rad(page)).toHaveValue('0');
});

test('the controls column does not reflow when an error appears [G14]', async ({ page }) => {
  await goto(page);
  const column = page.locator('[data-testid="angle-explorer"] > div').first();
  const clean = (await column.boundingBox())!.height;
  await deg(page).fill('abc');
  await expect(page.getByTestId('angle-input-error')).toHaveText(/./);
  // Equal heights are what keep the click from being stolen mid-press.
  expect((await column.boundingBox())!.height).toBe(clean);
});

const COORDS = '[data-testid="angle-coordinates"]';

test('shows the exact unit-circle point at a chart angle', async ({ page }) => {
  await goto(page);
  // Explicit, not inherited from the default: this test is about radical
  // rendering, and weakening it to the 0° point (1, 0) would test nothing.
  await deg(page).fill('30');
  const coords = page.locator(COORDS);
  // KaTeX draws \sqrt as a vector path (SVG or native MathML rendering), never
  // as a literal "√" text node — toContainText('√3') can never match here,
  // verified directly against katex.renderToString for both 'html' and
  // 'htmlAndMathml' output. `.sqrt` is KaTeX's own stable CSS marker for "a
  // radical is rendered here", which is what "exact, not decimal" means.
  await expect(coords.locator('.sqrt').first()).toBeVisible();
  await expect(coords).toContainText('0.866');
});

test('labels the terminal point on the diagram itself', async ({ page }) => {
  await goto(page);
  await deg(page).fill('30');
  await expect(
    page.locator(`${DIAGRAM} [data-role="coordinate-label"]`),
  ).toContainText('√3/2');
});

test('switches to decimals and shows the r scaling when the radius moves', async ({
  page,
}) => {
  await goto(page);
  // Explicit 30°: the "switch to decimals" this test names only makes sense
  // starting from an angle that has an exact radical form to switch away
  // from — the 0° default's (1, 0) was never exact/irrational to begin with.
  await deg(page).fill('30');
  // Radix puts role="slider" on the THUMB, while the id and aria-label sit on the
  // root — so getByRole('slider', {name: 'radius'}) does not resolve. Target the
  // thumb inside the identified root instead.
  const slider = page.locator('#slider-radius [role="slider"]');
  await slider.focus();
  // The radius slider steps 0.1, so two presses take the 1.0 default to 1.2.
  await slider.press('ArrowRight');
  await slider.press('ArrowRight');

  const coords = page.locator(COORDS);
  await expect(coords).toContainText('1.2');
  await expect(coords).toContainText('1.0392');
});

test('falls back to a named cosine for an angle off the chart', async ({ page }) => {
  await goto(page);
  await deg(page).fill('37');
  const coords = page.locator(COORDS);
  await expect(coords).toContainText('0.7986');
  await expect(coords).toContainText('cos');
  // `not.toContainText('√')` would be vacuously true here — see the note above:
  // KaTeX never emits a literal "√" text node even when it DOES render a
  // radical, so that assertion could never catch a regression. Checking for
  // the absence of KaTeX's own radical marker is the real "no radical" proof.
  await expect(coords.locator('.sqrt')).toHaveCount(0);
});

// The unit tests estimate text width from character count — a pure string builder
// has no font metrics. These run in a real browser, so they are what proves the
// suppression band still matches where the glyphs actually land.
const tickText = (page: Page) =>
  page.locator(`${FIGURE} g[data-role="radian-tick"] text`);
const tickLine = (page: Page) =>
  page.locator(`${FIGURE} g[data-role="radian-tick"] line`);

test('hides the radian tick label that the coordinate readout would cover', async ({
  page,
}) => {
  await goto(page);
  await deg(page).fill('60');
  // 60° is 1.047 rad — 2.7° from the 1 rad tick, where the two labels overlap.
  await expect(tickText(page)).toHaveCount(0);
  await expect(
    page.locator(`${DIAGRAM} [data-role="coordinate-label"]`),
  ).toContainText('√3/2');
});

test('keeps the tick line when it hides that tick label', async ({ page }) => {
  await goto(page);
  await deg(page).fill('60');
  // Hiding the name must not unmark the position.
  await expect(tickLine(page)).toHaveCount(1);
});

test('hides only the covered tick, leaving the others named', async ({ page }) => {
  await goto(page);
  await deg(page).fill('118');
  // 2.06 rad: the 2 rad tick sits under the readout, the 1 rad tick is well clear.
  await expect(tickLine(page)).toHaveCount(2);
  await expect(tickText(page)).toHaveCount(1);
  await expect(tickText(page)).toHaveText('1 rad');
});

test('restores the tick label once the sweep moves clear', async ({ page }) => {
  await goto(page);
  await deg(page).fill('60');
  await expect(tickText(page)).toHaveCount(0);
  await deg(page).fill('90');
  await expect(tickText(page)).toHaveText('1 rad');
});
