import { test, expect, type Page } from '@playwright/test';

/**
 * Geometric, library-agnostic on-curve check: samples the function curve path in
 * screen-space (getPointAtLength + getScreenCTM) and returns the largest distance
 * from any overlay marker's screen-space center to the curve. A regression that
 * appended markers to the svg root instead of function-plot's `g.canvas`, or that
 * failed to re-sync the overlay after zoom, would move markers tens of pixels off
 * the curve and blow past the threshold.
 */
async function maxMarkerToCurvePx(page: Page): Promise<{ count: number; maxDist: number }> {
  return page.evaluate(() => {
    const svgEl = document.querySelector('[data-testid="plot"] svg') as SVGSVGElement | null;
    if (!svgEl) return { count: 0, maxDist: Number.POSITIVE_INFINITY };

    const circles = Array.from(
      svgEl.querySelectorAll('.points-overlay circle'),
    ) as SVGCircleElement[];
    const paths = Array.from(svgEl.querySelectorAll('g.graph path')) as SVGPathElement[];
    if (circles.length === 0 || paths.length === 0) {
      return { count: circles.length, maxDist: Number.POSITIVE_INFINITY };
    }

    // The function curve is the longest path inside the graph group.
    let curve = paths[0];
    let bestLen = curve.getTotalLength();
    for (const p of paths) {
      const len = p.getTotalLength();
      if (len > bestLen) {
        bestLen = len;
        curve = p;
      }
    }

    const ctm = curve.getScreenCTM();
    if (!ctm) return { count: circles.length, maxDist: Number.POSITIVE_INFINITY };

    // Sample the curve in screen space at roughly 1px arc-length spacing.
    const total = curve.getTotalLength();
    const samplesN = Math.min(50000, Math.max(2000, Math.ceil(total)));
    const point = svgEl.createSVGPoint();
    const xs: number[] = new Array(samplesN + 1);
    const ys: number[] = new Array(samplesN + 1);
    for (let i = 0; i <= samplesN; i++) {
      const p = curve.getPointAtLength((total * i) / samplesN);
      point.x = p.x;
      point.y = p.y;
      const screen = point.matrixTransform(ctm);
      xs[i] = screen.x;
      ys[i] = screen.y;
    }

    let maxDist = 0;
    for (const c of circles) {
      const r = c.getBoundingClientRect();
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      let minSq = Number.POSITIVE_INFINITY;
      for (let i = 0; i <= samplesN; i++) {
        const dx = xs[i] - cx;
        const dy = ys[i] - cy;
        const d = dx * dx + dy * dy;
        if (d < minSq) minSq = d;
      }
      maxDist = Math.max(maxDist, Math.sqrt(minSq));
    }
    return { count: circles.length, maxDist };
  });
}

/** Plot 2x^2 and enable "Show points". */
async function plotWithPoints(page: Page): Promise<void> {
  await page.goto('/graphing');
  await page.locator('#eq-input').fill('2x^2');
  await page.getByRole('button', { name: 'Plot' }).click();
  await expect(page.locator('[data-testid="plot"] svg')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible();
  await page.getByRole('checkbox').click();
  await expect(page.locator('[data-testid="plot"] .points-overlay circle').first()).toBeVisible();
}

test('dark mode renders a visible grid and a bold, light-colored origin cross', async ({
  page,
}) => {
  // Persist the dark choice before first paint so the Base layout boots in dark.
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.goto('/graphing');
  await expect(page.locator('[data-testid="plot"] svg')).toBeVisible();

  const theme = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="plot"] svg') as SVGSVGElement;
    const read = (sel: string) => {
      const el = svg.querySelector(sel) as SVGElement | null;
      if (!el) return null;
      const cs = getComputedStyle(el);
      const m = cs.stroke.match(/\d+/g)?.map(Number) ?? [0, 0, 0];
      return { avgChannel: (m[0] + m[1] + m[2]) / 3, opacity: parseFloat(cs.opacity) };
    };
    return {
      dark: document.documentElement.classList.contains('dark'),
      origin: read('.x.origin'),
      grid: read('g.x.axis .tick line'),
    };
  });

  expect(theme.dark).toBe(true);
  // The origin cross must be recolored off function-plot's hardcoded black and
  // drawn boldly enough to read on the dark background.
  expect(theme.origin?.avgChannel).toBeGreaterThan(120);
  expect(theme.origin?.opacity).toBeGreaterThanOrEqual(0.4);
  // Gridlines must be lifted above function-plot's near-invisible 0.1 default.
  expect(theme.grid?.opacity).toBeGreaterThanOrEqual(0.2);
});

test('plots 2x^2 and renders point markers that lie on the curve', async ({ page }) => {
  await plotWithPoints(page);

  const markerCount = await page.locator('[data-testid="plot"] .points-overlay circle').count();
  expect(markerCount).toBeGreaterThan(0);

  const result = await maxMarkerToCurvePx(page);
  expect(result.count).toBe(markerCount);
  // Markers sit on the curve; allow a few px for sampling granularity. A margin
  // offset bug would be tens of pixels off and fail here.
  expect(result.maxDist).toBeLessThan(5);
});

test('markers stay on the curve through an interactive zoom, and the window inputs track it', async ({
  page,
}) => {
  await plotWithPoints(page);

  const before = await maxMarkerToCurvePx(page);
  expect(before.maxDist).toBeLessThan(5);
  const xMinBefore = await page.locator('input[type="number"]').first().inputValue();

  // Drive function-plot's own scroll-zoom (it binds d3-zoom to rect.zoom-and-drag),
  // then let the rAF-throttled overlay re-sync run.
  await page.evaluate(() => {
    const rect = document.querySelector(
      '[data-testid="plot"] svg rect.zoom-and-drag',
    ) as SVGRectElement | null;
    if (!rect) throw new Error('zoom target rect.zoom-and-drag not found');
    const b = rect.getBoundingClientRect();
    rect.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        clientX: b.left + b.width / 2,
        clientY: b.top + b.height / 2,
        deltaY: -400,
        deltaMode: 0,
      }),
    );
  });
  await page.waitForTimeout(150);

  // The view actually changed: the x-min window input tracked the zoom.
  const xMinAfter = await page.locator('input[type="number"]').first().inputValue();
  expect(xMinAfter).not.toBe(xMinBefore);

  // And the markers are still on the curve after the zoom redraw (the drift bug).
  const after = await maxMarkerToCurvePx(page);
  expect(after.count).toBeGreaterThan(0);
  expect(after.maxDist).toBeLessThan(5);
});
