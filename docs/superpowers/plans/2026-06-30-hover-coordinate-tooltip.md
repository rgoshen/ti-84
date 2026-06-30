# Hover Coordinate Tooltip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hovering the plot shows a floating `(x, y)` tooltip — exact on the "Show points" dots, computed anywhere on a curve.

**Architecture:** Pure helpers (formatting, nearest-selection, constants, the `HoverInfo` type) live in a new node-testable `hover.ts`. `plot.ts` adds a DOM hover handler (`attachHoverReadout`) that hit-tests the pointer against the discrete markers, else the nearest curve, and emits `HoverInfo | null` via a new `onHover` callback (mirroring `onViewChange`). `GraphingCalculator.tsx` renders one themed, `position: fixed` tooltip. function-plot's native crosshair is suppressed via a scoped CSS rule.

**Tech Stack:** Astro 7, React 19, TypeScript, function-plot 1.25.4 (d3 SVG), mathjs, Tailwind 4 / shadcn tokens, Vitest (node), Playwright.

## Global Constraints

- **Strict TDD** — Red → Green → Refactor; every behavior change starts with a failing test. Tests deterministic.
- **No new dependencies** — use what `package.json` already pins.
- **WCAG 2.1 AA** — coordinate text must meet contrast; color is never the sole carrier of meaning.
- **Conventional Commits**; **no co-author / AI-generation trailers** (project rule overrides any tooling default).
- **GitFlow** — all work on `feature/hover-coordinate-tooltip` (already checked out). No direct commits to `main`.
- **Separation** — pure logic in `hover.ts` (node-testable), DOM/scale work in `plot.ts`, UI in the React component.
- **Named constants** — no magic numbers (follow `MARKER_RADIUS` / `MAX_POINTS` / `SAMPLES` precedent).

---

## File Structure

- `src/scripts/graphing/hover.ts` *(new, pure)* — `HoverInfo` type; constants `DOT_HIT_RADIUS_PX`, `CURVE_HIT_RADIUS_PX`, `COORD_DECIMALS`, `GESTURE_SUPPRESS_MS`; `formatNumber`, `nearestWithinThreshold`.
- `src/scripts/graphing/hover.test.ts` *(new)* — unit tests for the pure helpers.
- `src/scripts/graphing/plot.ts` *(modify)* — `NumericScale.invert`; `onHover` option; marker `data-*` coords; `attachHoverReadout` + per-target gesture/cleanup `WeakMap`s; gesture timestamp on `all:zoom`.
- `src/styles/global.css` *(modify)* — scoped `.inner-tip` suppression rule.
- `src/components/graphing/GraphingCalculator.tsx` *(modify)* — `hover` state, `onHover` wiring (with existing `disposed` guard), `CoordTooltip`.
- `tests/e2e/graphing.spec.ts` *(modify)* — hover e2e (dot, curve, leave, a11y) + native-tip suppression.

---

## Task 1: Pure hover helpers + constants

**Files:**
- Create: `src/scripts/graphing/hover.ts`
- Test: `src/scripts/graphing/hover.test.ts`

**Interfaces:**
- Consumes: nothing (pure).
- Produces:
  - `interface HoverInfo { x: number; y: number; clientX: number; clientY: number; color: string; onMarker: boolean }`
  - `const DOT_HIT_RADIUS_PX = 8`, `CURVE_HIT_RADIUS_PX = 20`, `COORD_DECIMALS = 3`, `GESTURE_SUPPRESS_MS = 150`
  - `formatNumber(n: number): string`
  - `nearestWithinThreshold(values: number[], target: number, thresholdPx: number): number | null`

- [ ] **Step 1: Write the failing test**

Create `src/scripts/graphing/hover.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatNumber, nearestWithinThreshold, COORD_DECIMALS } from './hover';

describe('formatNumber', () => {
  it('keeps integers integer', () => {
    expect(formatNumber(1)).toBe('1');
    expect(formatNumber(2.0)).toBe('2');
  });
  it('rounds to COORD_DECIMALS and trims trailing zeros', () => {
    expect(formatNumber(1.5708)).toBe('1.571');
    expect(formatNumber(0.5)).toBe('0.5');
    expect(formatNumber(1.23456)).toBe('1.235');
  });
  it('normalises negative zero to "0"', () => {
    expect(formatNumber(-0)).toBe('0');
    expect(formatNumber(-0.0001)).toBe('0');
  });
  it('exposes the configured decimal count', () => {
    expect(COORD_DECIMALS).toBe(3);
  });
});

describe('nearestWithinThreshold', () => {
  it('returns the index of the closest value within the threshold', () => {
    expect(nearestWithinThreshold([100, 50, 5], 0, 20)).toBe(2);
  });
  it('returns null when every value exceeds the threshold', () => {
    expect(nearestWithinThreshold([100, 50, 30], 0, 20)).toBeNull();
  });
  it('breaks ties toward the lowest index', () => {
    expect(nearestWithinThreshold([10, -10], 0, 20)).toBe(0);
  });
  it('returns null for an empty candidate list', () => {
    expect(nearestWithinThreshold([], 0, 20)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/scripts/graphing/hover.test.ts`
Expected: FAIL — cannot resolve `./hover` (module does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/scripts/graphing/hover.ts`:

```ts
/**
 * Pure helpers for the hover coordinate readout. No DOM / function-plot
 * dependency, so this is unit-testable in the node environment (like math.ts and
 * theme.ts). plot.ts does the SVG/scale work and calls these.
 */

/** A single coordinate readout reported by the plot's hover handler. */
export interface HoverInfo {
  /** data-space x at the readout. */
  x: number;
  /** data-space y at the readout. */
  y: number;
  /** viewport px for tooltip positioning (the tooltip uses position: fixed). */
  clientX: number;
  clientY: number;
  /** owning curve colour — used ONLY as a non-text accent in the tooltip. */
  color: string;
  /**
   * true when snapped to a discrete marker (its stored coords); false when
   * computed on the nearest curve. NOT a claim of mathematical exactness — the
   * integer-y marker x is found by bisection.
   */
  onMarker: boolean;
}

/** Pointer-to-marker distance (px) that counts as hovering the dot. */
export const DOT_HIT_RADIUS_PX = 8;
/** Pointer-to-curve pixel-y distance (px) that counts as hovering the curve. */
export const CURVE_HIT_RADIUS_PX = 20;
/** Decimals shown before trailing-zero trim. */
export const COORD_DECIMALS = 3;
/** Window (ms) after the last zoom/pan during which the tooltip stays hidden. */
export const GESTURE_SUPPRESS_MS = 150;

/**
 * Format a number for display: round to COORD_DECIMALS, trim trailing zeros, and
 * normalise -0 to 0. e.g. 1.5708 -> "1.571", 2 -> "2", -0.0001 -> "0".
 */
export function formatNumber(n: number): string {
  const rounded = Number(n.toFixed(COORD_DECIMALS));
  const normalised = Object.is(rounded, -0) ? 0 : rounded;
  return String(normalised);
}

/**
 * Index of the value nearest `target` that is within `thresholdPx`, or null if
 * none qualify. Ties resolve to the lowest index (deterministic).
 */
export function nearestWithinThreshold(
  values: number[],
  target: number,
  thresholdPx: number,
): number | null {
  let best: number | null = null;
  let bestDist = Infinity;
  for (let i = 0; i < values.length; i++) {
    const d = Math.abs(values[i] - target);
    if (d <= thresholdPx && d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/scripts/graphing/hover.test.ts`
Expected: PASS (9 assertions across the two describes).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/graphing/hover.ts src/scripts/graphing/hover.test.ts
git commit -m "feat(graphing): add pure hover-readout helpers and constants"
```

---

## Task 2: Suppress function-plot's native crosshair tip

**Files:**
- Modify: `src/styles/global.css` (append after the `@layer base` block)
- Test: `tests/e2e/graphing.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a global rule hiding `[data-testid='plot'] .inner-tip`. No code symbols.

- [ ] **Step 1: Write the failing e2e test**

Append to `tests/e2e/graphing.spec.ts`:

```ts
test('suppresses function-plot native crosshair tip', async ({ page }) => {
  await page.goto('/graphing');
  await expect(page.locator('[data-testid="plot"] svg')).toBeVisible();
  const display = await page.evaluate(() => {
    const tip = document.querySelector('[data-testid="plot"] .inner-tip');
    return tip ? getComputedStyle(tip).display : 'missing';
  });
  expect(display).toBe('none');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test -g "native crosshair"`
Expected: FAIL — `.inner-tip` computed `display` is `inline`/`block` (not `none`).
(If port 4321 is busy: `lsof -ti:4321 | xargs -r kill` first.)

- [ ] **Step 3: Add the suppression rule**

In `src/styles/global.css`, after the closing `}` of the `@layer base { … }` block, append:

```css
/* function-plot draws a native crosshair tip (.inner-tip) on hover; we render
   our own floating coordinate tooltip instead, so suppress the native one.
   Scoped to the plot; !important overrides function-plot's inline hover styles. */
[data-testid='plot'] .inner-tip {
  display: none !important;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx playwright test -g "native crosshair"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css tests/e2e/graphing.spec.ts
git commit -m "feat(graphing): suppress function-plot native crosshair tip"
```

---

## Task 3: Hover readout — plot handler, tooltip, and e2e

**Files:**
- Modify: `src/scripts/graphing/plot.ts`
- Modify: `src/components/graphing/GraphingCalculator.tsx`
- Test: `tests/e2e/graphing.spec.ts`

**Interfaces:**
- Consumes (from Task 1): `HoverInfo`, `DOT_HIT_RADIUS_PX`, `CURVE_HIT_RADIUS_PX`, `GESTURE_SUPPRESS_MS`, `formatNumber`, `nearestWithinThreshold`; and existing `evalAt` from `@/scripts/graphing/math`.
- Produces:
  - `RenderGraphOptions` gains `onHover?: (info: HoverInfo | null) => void`.
  - Markers carry `data-x` / `data-y` / `data-color`.
  - `attachHoverReadout(...)` internal to `plot.ts` (not exported).

- [ ] **Step 1: Write the failing e2e test (dot hover)**

Append to `tests/e2e/graphing.spec.ts` (`plotWithPoints` already exists in this file and plots `2x^2` + enables Show points):

```ts
test('hovering a Show-points marker shows its exact (x, y)', async ({ page }) => {
  await plotWithPoints(page); // 2x^2 with Show points -> a marker at (0, 0)
  const dot = page
    .locator('[data-testid="plot"] .points-overlay [data-x="0"][data-y="0"]')
    .first();
  await expect(dot).toBeVisible();
  const box = await dot.boundingBox();
  if (!box) throw new Error('origin marker has no bounding box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const tip = page.getByRole('status');
  await expect(tip).toBeVisible();
  await expect(tip).toContainText('(0, 0)');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test -g "Show-points marker shows"`
Expected: FAIL — markers have no `data-x` attribute and no `role="status"` tooltip exists.

- [ ] **Step 3: Extend `NumericScale`, add imports, and the `onHover` option in `plot.ts`**

In `src/scripts/graphing/plot.ts`, update the math import to add `evalAt`, and add the hover import:

```ts
import { evalAt, gridlineCrossings, type Window2D } from '@/scripts/graphing/math';
import { themeColors, type ThemeColors } from '@/scripts/graphing/theme';
import {
  DOT_HIT_RADIUS_PX,
  CURVE_HIT_RADIUS_PX,
  GESTURE_SUPPRESS_MS,
  nearestWithinThreshold,
  type HoverInfo,
} from '@/scripts/graphing/hover';
```

Extend `NumericScale` to expose `invert` (d3 linear scales provide it):

```ts
interface NumericScale {
  (value: number): number;
  invert(pixel: number): number;
  domain(): number[];
}
```

Add `onHover` to `RenderGraphOptions`:

```ts
export interface RenderGraphOptions {
  target: HTMLElement;
  window: Window2D;
  equations: PlotEquation[];
  dark: boolean;
  /** Called after an interactive zoom/pan with the new visible domain. */
  onViewChange: (w: Window2D) => void;
  /** Called on pointer move with the coordinate readout, or null when none. */
  onHover?: (info: HoverInfo | null) => void;
}
```

- [ ] **Step 4: Tag markers with their data coordinates**

In `drawPointsOverlay`, set `data-*` on each marker so the hover handler (and tests) can read its exact coordinates. Replace the inner loop body:

```ts
    for (const { x, y } of gridlineCrossings(eq.expr, win)) {
      const marker = makeMarker(eq.pointShape, xScale(x), yScale(y), eq.color);
      marker.setAttribute('data-x', String(x));
      marker.setAttribute('data-y', String(y));
      marker.setAttribute('data-color', eq.color);
      overlay.appendChild(marker);
    }
```

- [ ] **Step 5: Add `attachHoverReadout` and its per-target `WeakMap`s**

In `src/scripts/graphing/plot.ts`, add near the other module-level helpers (e.g. above `renderGraph`):

```ts
// One hover attachment per target, and the time of the last zoom/pan per target,
// so a rebuild tears the previous attachment down and the readout can stay hidden
// mid-gesture. Keyed by the plot container element.
const hoverCleanups = new WeakMap<HTMLElement, () => void>();
const lastGestureAt = new WeakMap<HTMLElement, number>();

interface AttachHoverOptions {
  instance: FunctionPlotInstance;
  target: HTMLElement;
  getEquations: () => PlotEquation[];
  onHover: (info: HoverInfo | null) => void;
}

/**
 * Wire the floating coordinate readout. On pointer move it reports, via onHover,
 * either the nearest discrete marker's coords (snap within DOT_HIT_RADIUS_PX) or
 * the (x, y) on the nearest curve under the cursor (within CURVE_HIT_RADIUS_PX),
 * else null. rAF-throttled; suppressed for GESTURE_SUPPRESS_MS after a zoom/pan.
 * Returns a cleanup that detaches the listeners and cancels any queued frame.
 */
function attachHoverReadout(opts: AttachHoverOptions): () => void {
  const { instance, target, getEquations, onHover } = opts;
  const svg = target.querySelector('svg');
  const rect = svg?.querySelector<SVGRectElement>('rect.zoom-and-drag');
  const canvas = svg?.querySelector<SVGGElement>('g.canvas');
  if (!svg || !rect || !canvas) return () => {};

  let rafId: number | null = null;
  let pending: PointerEvent | null = null;

  // Convert a viewport pointer position into g.canvas-local pixels — the space
  // the d3 scales map data into (g.canvas carries the margin transform).
  const toLocal = (ev: PointerEvent): { x: number; y: number } | null => {
    const ctm = canvas.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  };

  const process = (): void => {
    rafId = null;
    const ev = pending;
    pending = null;
    // Bail if the plot was torn down between queueing and running this frame.
    if (!ev || !rect.isConnected) return;
    // Stay hidden during/just after a pan or zoom gesture.
    if (performance.now() - (lastGestureAt.get(target) ?? -Infinity) < GESTURE_SUPPRESS_MS) {
      onHover(null);
      return;
    }
    const xScale = asNumericScale(instance.meta.xScale);
    const yScale = asNumericScale(instance.meta.yScale);
    const local = toLocal(ev);
    if (!xScale || !yScale || !local) {
      onHover(null);
      return;
    }

    // 1) Nearest discrete marker wins (snap to its stored coords).
    let best: { x: number; y: number; color: string; dist: number } | null = null;
    target.querySelectorAll<SVGElement>('.points-overlay [data-x]').forEach((m) => {
      const mx = Number(m.getAttribute('data-x'));
      const my = Number(m.getAttribute('data-y'));
      const dist = Math.hypot(xScale(mx) - local.x, yScale(my) - local.y);
      if (dist <= DOT_HIT_RADIUS_PX && (best === null || dist < best.dist)) {
        best = { x: mx, y: my, color: m.getAttribute('data-color') ?? '#000000', dist };
      }
    });
    if (best !== null) {
      const b = best;
      onHover({ x: b.x, y: b.y, clientX: ev.clientX, clientY: ev.clientY, color: b.color, onMarker: true });
      return;
    }

    // 2) Otherwise the nearest curve at the cursor's data-x.
    const dataX = xScale.invert(local.x);
    const pixelYs: number[] = [];
    const candidates: Array<{ y: number; color: string }> = [];
    for (const eq of getEquations()) {
      const y = evalAt(eq.expr, dataX);
      if (y === null) continue; // undefined / asymptote
      pixelYs.push(yScale(y));
      candidates.push({ y, color: eq.color });
    }
    const idx = nearestWithinThreshold(pixelYs, local.y, CURVE_HIT_RADIUS_PX);
    if (idx === null) {
      onHover(null);
      return;
    }
    onHover({
      x: dataX,
      y: candidates[idx].y,
      clientX: ev.clientX,
      clientY: ev.clientY,
      color: candidates[idx].color,
      onMarker: false,
    });
  };

  const onMove = (ev: PointerEvent): void => {
    pending = ev;
    if (rafId === null) rafId = requestAnimationFrame(process);
  };
  const onLeave = (): void => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    pending = null;
    onHover(null);
  };

  rect.addEventListener('pointermove', onMove);
  rect.addEventListener('pointerleave', onLeave);

  return () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rect.removeEventListener('pointermove', onMove);
    rect.removeEventListener('pointerleave', onLeave);
  };
}
```

- [ ] **Step 6: Wire `attachHoverReadout` into `renderGraph` and stamp the gesture time**

In `renderGraph`, add `onHover` to the destructure:

```ts
  const { target, window: win, equations, dark, onViewChange } = opts;
```
becomes:
```ts
  const { target, window: win, equations, dark, onViewChange, onHover } = opts;
```

After the initial `drawPointsOverlay(instance, target, win, equations);` call (just before the `let queued = false;` zoom block), attach the readout, tearing down any prior attachment for this target:

```ts
  hoverCleanups.get(target)?.();
  hoverCleanups.set(
    target,
    attachHoverReadout({
      instance,
      target,
      getEquations: () => equations,
      onHover: onHover ?? (() => {}),
    }),
  );
```

In the `instance.on('all:zoom', ...)` callback, make the FIRST line stamp the gesture time so the readout is suppressed during pan/zoom:

```ts
  instance.on('all:zoom', () => {
    lastGestureAt.set(target, performance.now());
    if (queued) return;
    // ...existing body unchanged...
```

- [ ] **Step 7: Add hover state + tooltip in `GraphingCalculator.tsx`**

Add the import:

```ts
import { formatNumber, type HoverInfo } from '@/scripts/graphing/hover';
```

Add state alongside the other `useState` hooks:

```ts
  const [hover, setHover] = useState<HoverInfo | null>(null);
```

In the plot `useEffect`'s `build()`, clear any stale readout and pass `onHover` (guarded by the existing `disposed` flag, exactly like `onViewChange`):

```ts
    const build = (): void => {
      if (disposed) return;
      target.replaceChildren();
      setHover(null);
      try {
        instanceRef.current = renderGraph({
          target,
          window: appliedWindow,
          equations,
          dark,
          onViewChange: (w) => {
            if (!disposed) setDisplayWindow(w);
          },
          onHover: (info) => {
            if (!disposed) setHover(info);
          },
        });
        setError(null);
      } catch {
        setError('Could not plot that equation. Check your syntax and try again.');
      }
    };
```

Render the tooltip at the end of the plot column, just after the plot `Card` (inside the `<div className="space-y-4">` that holds the plot + table). Add `{hover ? <CoordTooltip hover={hover} boundsRef={plotRef} /> : null}` and define the component below `EquationLabel`:

```tsx
/**
 * Floating coordinate readout. Positioned with `position: fixed` at the pointer's
 * viewport coords and clamped to the plot bounds. The (x, y) text stays in the
 * popover foreground (AA contrast); the curve colour is a non-text swatch only.
 */
function CoordTooltip({
  hover,
  boundsRef,
}: {
  hover: HoverInfo;
  boundsRef: React.RefObject<HTMLDivElement | null>;
}): React.JSX.Element {
  const OFFSET = 12;
  const b = boundsRef.current?.getBoundingClientRect();
  let left = hover.clientX + OFFSET;
  let top = hover.clientY - OFFSET;
  if (b) {
    left = Math.min(Math.max(left, b.left), Math.max(b.left, b.right - 96));
    top = Math.min(Math.max(top, b.top), Math.max(b.top, b.bottom - 28));
  }
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed z-50 rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
      style={{ left, top }}
    >
      <span
        aria-hidden="true"
        className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
        style={{ background: hover.color }}
      />
      ({formatNumber(hover.x)}, {formatNumber(hover.y)})
    </div>
  );
}
```

- [ ] **Step 8: Run the dot-hover test to verify it passes**

Run: `npx playwright test -g "Show-points marker shows"`
Expected: PASS — tooltip shows `(0, 0)` over the origin marker.

- [ ] **Step 9: Commit**

```bash
git add src/scripts/graphing/plot.ts src/components/graphing/GraphingCalculator.tsx tests/e2e/graphing.spec.ts
git commit -m "feat(graphing): floating coordinate tooltip on marker hover"
```

- [ ] **Step 10: Write the remaining e2e tests (curve, leave, a11y)**

Append to `tests/e2e/graphing.spec.ts`:

```ts
test('hovering along the curve shows the (x, y) on the curve', async ({ page }) => {
  await page.goto('/graphing');
  await page.locator('#eq-input').fill('sin(x)');
  await page.getByRole('button', { name: 'Plot' }).click();
  await expect(page.locator('[data-testid="plot"] svg')).toBeVisible();

  // Pick a real screen point on the longest graph path (the curve).
  const onCurve = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="plot"] svg') as SVGSVGElement;
    const path = [...svg.querySelectorAll('g.graph path')].sort(
      (a, b) => (b as SVGPathElement).getTotalLength() - (a as SVGPathElement).getTotalLength(),
    )[0] as SVGPathElement;
    const p = path.getPointAtLength(path.getTotalLength() * 0.5);
    const ctm = path.getScreenCTM()!;
    const pt = svg.createSVGPoint();
    pt.x = p.x;
    pt.y = p.y;
    const s = pt.matrixTransform(ctm);
    return { x: s.x, y: s.y };
  });

  await page.mouse.move(onCurve.x, onCurve.y);
  const tip = page.getByRole('status');
  await expect(tip).toBeVisible();
  const text = (await tip.textContent()) ?? '';
  const m = text.match(/\(\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/);
  expect(m).not.toBeNull();
  const x = parseFloat(m![1]);
  const y = parseFloat(m![2]);
  // The reported point lies on sin(x): proves the readout reads the curve.
  expect(Math.abs(y - Math.sin(x))).toBeLessThan(0.05);
});

test('moving the pointer off the plot hides the tooltip', async ({ page }) => {
  await plotWithPoints(page);
  const dot = page
    .locator('[data-testid="plot"] .points-overlay [data-x="0"][data-y="0"]')
    .first();
  const box = await dot.boundingBox();
  if (!box) throw new Error('origin marker has no bounding box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByRole('status')).toBeVisible();
  await page.mouse.move(2, 2); // top-left corner, off the plot
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('tooltip coordinate text uses the foreground colour, not the curve colour', async ({
  page,
}) => {
  await plotWithPoints(page); // 2x^2 -> first palette colour #60a5fa
  const dot = page
    .locator('[data-testid="plot"] .points-overlay [data-x="0"][data-y="0"]')
    .first();
  const box = await dot.boundingBox();
  if (!box) throw new Error('origin marker has no bounding box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const tip = page.getByRole('status');
  await expect(tip).toBeVisible();
  const colours = await tip.evaluate((el) => {
    const swatch = el.querySelector('span[aria-hidden]') as HTMLElement;
    return { text: getComputedStyle(el).color, swatch: getComputedStyle(swatch).backgroundColor };
  });
  // Colour is a non-text accent: the text must not be the curve colour.
  expect(colours.text).not.toBe(colours.swatch);
});
```

- [ ] **Step 11: Run the full e2e suite to verify everything passes**

Run: `lsof -ti:4321 | xargs -r kill; npx playwright test`
Expected: PASS — all graphing e2e tests green (existing + native-tip + 4 hover tests).

- [ ] **Step 12: Run unit tests and type check**

Run: `npx vitest run`
Expected: PASS (math + theme + hover suites).

Type check via a scoped tsconfig (the project's `astro check` needs an extra dep; this checks the touched TS without it):

```bash
cat > ./tsconfig.check.json <<'EOF'
{ "extends": "astro/tsconfigs/strict",
  "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["./src/*"] }, "noEmit": true, "skipLibCheck": true, "types": ["node"] },
  "include": ["src/scripts/graphing/**/*.ts"] }
EOF
npx tsc -p ./tsconfig.check.json; rm -f ./tsconfig.check.json
```
Expected: no errors (a `baseUrl` deprecation warning is pre-existing and fine; exit 0).

- [ ] **Step 13: Commit**

```bash
git add tests/e2e/graphing.spec.ts
git commit -m "test(graphing): e2e for curve-hover, pointer-leave, and tooltip a11y"
```

---

## Task 4: Docs + branch finish

**Files:**
- Modify: `SUMMARY.md`, `TODO.md`

- [ ] **Step 1: Update `TODO.md`** — append a `## [2026-06-30] Feature: Hover coordinate tooltip` entry (Objective / Approach / Tests / Risks), referencing the spec at `docs/superpowers/specs/2026-06-30-hover-coordinate-tooltip-design.md`.

- [ ] **Step 2: Update `SUMMARY.md`** — append a `Commit Summary` (Change Type: Feature; Scope: graphing hover readout) describing the two-mode tooltip, the `hover.ts` split, native-tip suppression, and the test coverage.

- [ ] **Step 3: Commit**

```bash
git add SUMMARY.md TODO.md
git commit -m "docs(graphing): record hover coordinate tooltip feature"
```

- [ ] **Step 4: Finish the branch** — invoke `superpowers:finishing-a-development-branch` (verifies tests, then offers merge/PR/keep/discard). Recommend a `--no-ff` merge to `main` (repo pattern), then rebuild the Docker preview (`docker compose up -d --build`) so `:8084` serves the feature.

---

## Self-Review

**Spec coverage:**
- Both modes (dot exact / curve computed) → Task 3 Step 5 (`attachHoverReadout` two-phase logic) + e2e Step 1/10.
- Floating tooltip at cursor → Task 3 Step 7 (`CoordTooltip`, `position: fixed`).
- G1 named constants → Task 1 (`hover.ts`). G2 native-tip suppression → Task 2. G3 a11y (foreground text + swatch) → Task 3 Step 7 + e2e a11y test. G4 cleanup/disposed/rAF → Task 3 Steps 5–7. G5 fixed+clamped → Step 7. G6 `onMarker` naming → Task 1 type. G7 gesture suppression → Steps 5–6. G8 `attachHoverReadout` seam → Step 5.
- Edge cases (asymptote `evalAt` null, empty space null, zoom-correct scales) → Step 5 logic.
- Unit + e2e tests → Tasks 1, 3.

**Placeholder scan:** none — every step has concrete code/commands.

**Type consistency:** `HoverInfo` (Task 1) is consumed unchanged in `plot.ts` (Step 5) and the component (Step 7); `onHover?: (info: HoverInfo | null) => void` matches in `RenderGraphOptions` (Step 3), `attachHoverReadout` (Step 5), and the `build()` wiring (Step 7); `nearestWithinThreshold(values, target, thresholdPx)` signature matches caller in Step 5; `formatNumber` used in Step 7. Marker `data-x/-y/-color` written in Step 4, read in Step 5 and the e2e selectors.
