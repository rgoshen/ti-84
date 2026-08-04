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
  await expect(waveOption(page, 'none')).toBeChecked();
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

const WAVE = '[data-testid="angle-wave"]';
const WAVE_FIGURE = '[data-testid="angle-wave-figure"]';

// The strip carries its own test id for the reason FIGURE documents at the top of
// this file: the caption renders KaTeX, whose radicals become nested <svg>
// elements, so any descendant svg selector inside the container is ambiguous.
const curve = (page: Page) => page.locator(`${WAVE_FIGURE} [data-role="wave-curve"]`);
const waveOption = (page: Page, name: string) => page.getByRole('radio', { name });

test('shows no wave strip by default — none is the obvious default', async ({ page }) => {
  await goto(page);
  await expect(page.locator(WAVE)).toHaveCount(0);
  await expect(waveOption(page, 'none')).toBeChecked();
});

test('selecting sin reveals the strip, selecting none removes it', async ({ page }) => {
  await goto(page);
  await waveOption(page, 'sin θ').check();
  await expect(page.locator(WAVE_FIGURE)).toBeVisible();

  await waveOption(page, 'none').check();
  await expect(page.locator(WAVE)).toHaveCount(0);
});

test('the wave selector is reachable and operable by keyboard, walking every option in DOM order', async ({
  page,
}) => {
  await goto(page);
  await waveOption(page, 'none').focus();
  // { delay: 50 } is load-bearing, not decorative. Radix's roving-focus group
  // defers the arrow-key focus move to a setTimeout(0) and cancels its "arrow
  // key just pressed" flag on keyup; a zero-delay synthetic keydown+keyup pair
  // (this repo's bundled headless Chromium) can complete BOTH before that
  // timeout fires, so the flag is already cleared and the new radio never gets
  // auto-selected — focus moves, but nothing checks. A 50ms gap (closer to how
  // a human actually holds a key than an instant synthetic press) gives the
  // deferred callback time to win the race. Confirmed by hand: the identical
  // press against a different Chromium build (151) selects correctly with no
  // delay at all, so this is a test-timing fix, not evidence of a real bug.
  //
  // Walking all seven options — none, sin, csc, cos, sec, tan, cot, the DOM
  // order the two-column reciprocal-pair layout produces — is stronger than
  // asserting a single hop: it also catches an accidental reorder of the
  // radio array.
  const chain = ['sin θ', 'csc θ', 'cos θ', 'sec θ', 'tan θ', 'cot θ'];
  for (const label of chain) {
    await page.keyboard.press('ArrowDown', { delay: 50 });
    await expect(waveOption(page, label)).toBeChecked();
  }
});

test('draws no curve at the 0 degree default, then the slider draws it', async ({ page }) => {
  await goto(page);
  await waveOption(page, 'sin θ').check();
  // The whole lesson: pick sin, then drag. At θ = 0 there is nothing to trace.
  await expect(curve(page)).toHaveCount(0);

  await deg(page).fill('90');
  await expect(curve(page)).toHaveCount(1);
});

test('the angle slider lengthens the traced curve', async ({ page }) => {
  await goto(page);
  await waveOption(page, 'sin θ').check();
  await deg(page).fill('90');
  const short = (await curve(page).getAttribute('d'))!.length;

  await deg(page).fill('270');
  const long = (await curve(page).getAttribute('d'))!.length;
  expect(long).toBeGreaterThan(short);
});

test('traces leftward for a negative angle', async ({ page }) => {
  await goto(page);
  await waveOption(page, 'cos θ').check();
  await deg(page).fill('-90');
  const d = (await curve(page).getAttribute('d'))!;
  const xs = [...d.matchAll(/[ML] ([-\d.e]+) /g)].map((m) => Number(m[1]));
  expect(xs.at(-1)!).toBeLessThan(xs[0]!);
});

test('cos reads non-zero at 0 degrees where sin reads zero', async ({ page }) => {
  await goto(page);
  const markerY = async () =>
    Number(
      await page
        .locator(`${WAVE_FIGURE} [data-role="wave-marker"]`)
        .getAttribute('cy'),
    );

  await waveOption(page, 'sin θ').check();
  const sinY = await markerY();
  await waveOption(page, 'cos θ').check();
  const cosY = await markerY();
  expect(cosY).toBeLessThan(sinY); // cos = 1 sits above sin = 0
});

test('the radius slider changes the wave amplitude', async ({ page }) => {
  await goto(page);
  await waveOption(page, 'sin θ').check();
  await deg(page).fill('90');
  const peak = async () =>
    Number(
      await page
        .locator(`${WAVE_FIGURE} [data-role="wave-marker"]`)
        .getAttribute('cy'),
    );
  const atOne = await peak();

  // Radix puts role="slider" on the THUMB while the id sits on the root.
  const radius = page.locator('#slider-radius [role="slider"]');
  await radius.focus();
  for (let i = 0; i < 5; i++) await radius.press('ArrowRight');

  // A taller amplitude is a SMALLER y in SVG coordinates.
  expect(await peak()).toBeLessThan(atOne);
});

test('the highlighted projection leg appears with the wave', async ({ page }) => {
  await goto(page);
  const leg = page.locator(`${FIGURE} [data-role="projection-leg"]`);
  await expect(leg).toHaveCount(0);

  await waveOption(page, 'sin θ').check();
  await deg(page).fill('45');
  await expect(leg).toHaveCount(1);
});

test('reset returns the wave selector to none', async ({ page }) => {
  await goto(page);
  await waveOption(page, 'cos θ').check();
  await deg(page).fill('200');
  await expect(page.locator(WAVE_FIGURE)).toBeVisible();

  await page.getByRole('button', { name: 'Reset' }).click();

  await expect(waveOption(page, 'none')).toBeChecked();
  await expect(page.locator(WAVE)).toHaveCount(0);
});

test('selecting tan reveals the strip with its four asymptote lines', async ({ page }) => {
  await goto(page);
  await waveOption(page, 'tan θ').check();
  await expect(page.locator(WAVE_FIGURE)).toBeVisible();
  await expect(page.locator(`${WAVE_FIGURE} [data-role="wave-asymptote"]`)).toHaveCount(4);
});

test('the radius slider does not move the tan curve — r cancels out of the ratio', async ({
  page,
}) => {
  await goto(page);
  await waveOption(page, 'tan θ').check();
  await deg(page).fill('45');
  const before = await curve(page).getAttribute('d');

  const radius = page.locator('#slider-radius [role="slider"]');
  await radius.focus();
  for (let i = 0; i < 5; i++) await radius.press('ArrowRight');

  expect(await curve(page).getAttribute('d')).toBe(before);
});

test('shows undefined with no marker at 90 degrees', async ({ page }) => {
  await goto(page);
  await waveOption(page, 'tan θ').check();
  await deg(page).fill('90');
  await expect(page.locator(`${WAVE_FIGURE} [data-role="wave-marker"]`)).toHaveCount(0);
  await expect(page.locator('[data-testid="angle-wave-caption"]')).toContainText('undefined');
});

test('sweeping past the asymptote breaks the curve into more than one subpath', async ({
  page,
}) => {
  await goto(page);
  await waveOption(page, 'tan θ').check();
  await deg(page).fill('120');
  const d = (await curve(page).getAttribute('d'))!;
  expect((d.match(/M/g) ?? []).length).toBeGreaterThan(1);
});

test('the tangent segment appears in the circle with tan selected', async ({ page }) => {
  await goto(page);
  const segment = page.locator(`${FIGURE} [data-role="tangent-segment"]`);
  await expect(segment).toHaveCount(0);

  await waveOption(page, 'tan θ').check();
  await deg(page).fill('45');
  await expect(segment).toHaveCount(1);
});

test('selecting sec reveals the strip with its four asymptote lines', async ({ page }) => {
  await goto(page);
  await waveOption(page, 'sec θ').check();
  await expect(page.locator(WAVE_FIGURE)).toBeVisible();
  await expect(page.locator(`${WAVE_FIGURE} [data-role="wave-asymptote"]`)).toHaveCount(4);
});

// csc and cot break where sin = 0, not where cos = 0 like tan/sec — the strip
// spans −2π…2π, so the extra pole at radians 0 makes five asymptotes visible
// instead of tan/sec's four.
test('selecting csc reveals the strip with its five asymptote lines', async ({ page }) => {
  await goto(page);
  await waveOption(page, 'csc θ').check();
  await expect(page.locator(WAVE_FIGURE)).toBeVisible();
  await expect(page.locator(`${WAVE_FIGURE} [data-role="wave-asymptote"]`)).toHaveCount(5);
});

test('selecting cot reveals the strip with its five asymptote lines', async ({ page }) => {
  await goto(page);
  await waveOption(page, 'cot θ').check();
  await expect(page.locator(WAVE_FIGURE)).toBeVisible();
  await expect(page.locator(`${WAVE_FIGURE} [data-role="wave-asymptote"]`)).toHaveCount(5);
});

test('csc and cot read as undefined at the default 0°, with the asymptotes still drawn', async ({
  page,
}) => {
  await goto(page);
  // θ = 0 is the page's default state — no need to move the angle slider.
  // It is also a pole for both csc and cot, since both break where sin = 0.
  for (const label of ['csc θ', 'cot θ']) {
    await waveOption(page, label).check();
    await expect(page.locator(`${WAVE_FIGURE} [data-role="wave-marker"]`)).toHaveCount(0);
    await expect(curve(page)).toHaveCount(0);
    await expect(page.locator('[data-testid="angle-wave-caption"]')).toContainText('undefined');
    await expect(page.locator(`${WAVE_FIGURE} [data-role="wave-asymptote"]`)).toHaveCount(5);
  }
});

// Shared by the radius-invariance and segment-presence trios below — one row
// per reciprocal function costs the next one this shape, rather than a whole
// copy-pasted test.
const RECIPROCAL_WAVES = [
  { label: 'sec θ', name: 'sec', full: 'secant', role: 'secant-segment' },
  { label: 'csc θ', name: 'csc', full: 'cosecant', role: 'cosecant-segment' },
  { label: 'cot θ', name: 'cot', full: 'cotangent', role: 'cotangent-segment' },
] as const;

for (const { label, name } of RECIPROCAL_WAVES) {
  test(`the radius slider does not move the ${name} curve — r cancels out of the ratio`, async ({
    page,
  }) => {
    await goto(page);
    await waveOption(page, label).check();
    await deg(page).fill('45');
    const before = await curve(page).getAttribute('d');

    const radius = page.locator('#slider-radius [role="slider"]');
    await radius.focus();
    for (let i = 0; i < 5; i++) await radius.press('ArrowRight');

    expect(await curve(page).getAttribute('d')).toBe(before);
  });
}

test('sweeping past an asymptote breaks the csc curve into more than one subpath', async ({
  page,
}) => {
  await goto(page);
  await waveOption(page, 'csc θ').check();
  // csc's poles are at 0, ±180, ±360 — sweeping to 200° crosses the one at 180°.
  await deg(page).fill('200');
  const d = (await curve(page).getAttribute('d'))!;
  expect((d.match(/M/g) ?? []).length).toBeGreaterThan(1);
});

for (const { label, name, full, role } of RECIPROCAL_WAVES) {
  test(`the ${full} segment appears in the circle with ${name} selected`, async ({ page }) => {
    await goto(page);
    const segment = page.locator(`${FIGURE} [data-role="${role}"]`);
    await expect(segment).toHaveCount(0);

    await waveOption(page, label).check();
    await deg(page).fill('45');
    await expect(segment).toHaveCount(1);
  });
}

test('switching from tan to sec swaps the mark rather than adding one', async ({ page }) => {
  await goto(page);
  await waveOption(page, 'tan θ').check();
  await deg(page).fill('45');
  const tangent = page.locator(`${FIGURE} [data-role="tangent-segment"]`);
  await expect(tangent).toHaveCount(1);

  await waveOption(page, 'sec θ').check();
  await expect(tangent).toHaveCount(0);
  await expect(page.locator(`${FIGURE} [data-role="secant-segment"]`)).toHaveCount(1);
});

const standardAngleMarks = (page: Page) =>
  page.locator(`${FIGURE} g[data-role="standard-angle"]`);
// Scoped by role, not getByLabel — 'Degrees'/'Radians' also label the Convert
// panel's TEXTBOX inputs (see the `deg`/`rad` consts above), and getByLabel
// would be ambiguous across both roles [G13].
const labelsOption = (page: Page, name: string) => page.getByRole('radio', { name });
const standardAnglesToggle = (page: Page) =>
  page.getByRole('checkbox', { name: 'Show standard angles' });

test('circle labels default to radians, standard angles off', async ({ page }) => {
  await goto(page);
  await expect(labelsOption(page, 'Radians')).toBeChecked();
  await expect(standardAnglesToggle(page)).not.toBeChecked();
  await expect(standardAngleMarks(page)).toHaveCount(0);
});

test('turning on standard angles draws all sixteen marks', async ({ page }) => {
  await goto(page);
  await standardAnglesToggle(page).check();
  await expect(standardAngleMarks(page)).toHaveCount(16);
});

test('standard-angle labels read degrees text when Degrees is selected', async ({ page }) => {
  await goto(page);
  await standardAnglesToggle(page).check();
  await labelsOption(page, 'Degrees').check();
  const texts = await standardAngleMarks(page).locator('text').allTextContents();
  expect(texts).toContain('30°');
  expect(texts).toContain('90°');
});

test('standard-angle labels read exact pi fractions in radians mode', async ({ page }) => {
  await goto(page);
  await standardAnglesToggle(page).check();
  const texts = await standardAngleMarks(page).locator('text').allTextContents();
  expect(texts).toContain('π/6');
  expect(texts).toContain('π/2');
});

test('degrees mode counts quarter turns instead of whole radians', async ({ page }) => {
  await goto(page);
  await labelsOption(page, 'Degrees').check();
  // 260°, not the coordinate-label-sensitive 200° — clear of the terminal
  // point's always-present coordinate label, matching the unit test in Task 4.
  await deg(page).fill('260');
  await expect(tickText(page)).toHaveText(['90°', '180°']);
});

test('reset restores circle labels and standard angles to their defaults', async ({ page }) => {
  await goto(page);
  await labelsOption(page, 'Degrees').check();
  await standardAnglesToggle(page).check();
  await expect(labelsOption(page, 'Degrees')).toBeChecked();
  await expect(standardAnglesToggle(page)).toBeChecked();

  await page.getByRole('button', { name: 'Reset' }).click();

  await expect(labelsOption(page, 'Radians')).toBeChecked();
  await expect(standardAnglesToggle(page)).not.toBeChecked();
  await expect(standardAngleMarks(page)).toHaveCount(0);
});
