import { test, expect } from '@playwright/test';

/**
 * Loads /graphing, plots 2x^2, enables "Show points", and asserts the markers
 * exist AND lie on the rendered curve.
 *
 * The on-curve check is geometric and library-agnostic: it samples the function
 * curve path in screen-space (via getPointAtLength + getScreenCTM) and verifies
 * every overlay marker's screen-space center is within a few pixels of the curve.
 * A regression that appended markers to the svg root instead of function-plot's
 * `g.canvas` would offset every marker by the chart margin and fail this assertion.
 */
test('plots 2x^2 and renders point markers that lie on the curve', async ({ page }) => {
  await page.goto('/graphing');

  // Plot 2x^2.
  await page.locator('#eq-input').fill('2x^2');
  await page.getByRole('button', { name: 'Plot' }).click();

  // The function-plot svg renders inside the plot container.
  const svg = page.locator('[data-testid="plot"] svg');
  await expect(svg).toBeVisible();

  // The equation is listed.
  await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible();

  // Enable "Show points" for the equation.
  await page.getByRole('checkbox').click();

  // Markers appear in the overlay.
  const markers = page.locator('[data-testid="plot"] .points-overlay circle');
  await expect(markers.first()).toBeVisible();
  const markerCount = await markers.count();
  expect(markerCount).toBeGreaterThan(0);

  // Geometric on-curve verification in the browser.
  const result = await page.evaluate(() => {
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

    // For each marker, find its nearest distance to the sampled curve.
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

  expect(result.count).toBe(markerCount);
  // Markers sit on the curve; allow a few px for sampling granularity. A margin
  // offset bug would be tens of pixels off and fail here.
  expect(result.maxDist).toBeLessThan(5);
});
