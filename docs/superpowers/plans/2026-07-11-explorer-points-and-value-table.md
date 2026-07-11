# Explorer Points & Value Table — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Give both Explorers the graphing calculator's two missing features — a **Show points** toggle (markers at whole-number gridline crossings) and a **value table** (one row per integer x in the window).

**Architecture:** Islands decide, renderers draw. The islands compute and **memoise** the crossings (`gridlineCrossings`) and the table values (`evalAt` over `integerXs`), then pass **precomputed data** down. Renderers and the new `ValueTable` contain no math. `plot.ts`'s private `makeMarker` is exported so both explorers draw identical circle markers.

**Tech Stack:** Astro 5, React 19 islands, TypeScript, function-plot, shadcn/ui, Vitest (node), Playwright.

## Global Constraints

- **No new dependencies.** Reuse `gridlineCrossings`, `integerXs`, `evalAt`, `Point` (all exported from `@/scripts/graphing/math`) and `makeMarker` (to be exported from `@/scripts/graphing/plot`).
- **Renderers and `ValueTable` must not call `evalAt`/`gridlineCrossings`** — islands pass precomputed data (this is the perf lever; `evalAt` re-parses its expression on every call).
- **Points default OFF** in both explorers.
- **"Show parent" governs the PLOT only** — the `f(x)` table column always shows.
- **Do NOT refactor `GraphingCalculator.tsx`** onto the shared table (out of scope).
- Accessibility: table is a real `<table>` with `scope="col"` headers; points toggle is a labelled checkbox (**disabled**, not hidden, when no function is plotted).
- Conventional Commits, atomic; **NO `Co-Authored-By`/AI-generation trailers**.
- Commands: `npm test` · `npm run astro -- check` · `npm run build` · `npm run test:e2e [-- <filter>]`
- Spec: `docs/superpowers/specs/2026-07-11-explorer-points-and-value-table-design.md` (gaps G1–G7).

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `src/scripts/graphing/plot.ts` (edit) | `export` the existing `makeMarker` | 1 |
| `src/components/ValueTable.tsx` (new) | Shared, purely presentational value table | 1 |
| `src/scripts/explorer/render.ts` (edit) | `OverlayScene.points`; draw markers in `.explorer-overlay` | 2 |
| `src/components/explorer/FunctionExplorer.tsx` (edit) | `showPoints` state, checkbox, memos, `<ValueTable>` | 2 |
| `src/scripts/explorer/transform-render.ts` (edit) | `parentPoints`/`transformedPoints`; `.transform-points` group | 3 |
| `src/components/explorer/TransformationExplorer.tsx` (edit) | `showPoints` state, checkbox, memos, 2-col `<ValueTable>` | 3 |
| `tests/e2e/explorer.spec.ts`, `tests/e2e/transformation.spec.ts` (edit) | e2e coverage | 4 |

---

## Task 1: Export `makeMarker` + the shared `ValueTable`

**Files:**
- Modify: `src/scripts/graphing/plot.ts:120`
- Create: `src/components/ValueTable.tsx`

**Interfaces:**
- Produces: `export function makeMarker(shape: PointShape, cx: number, cy: number, color: string): SVGElement`
- Produces: `ValueColumn { key: string; header: React.ReactNode; color: string; values: Array<number | null> }`, `ValueTableProps { xs: number[]; columns: ValueColumn[]; emptyMessage: string; note?: string }`, default-exported `ValueTable`.

- [ ] **Step 1: Export `makeMarker`** — in `src/scripts/graphing/plot.ts` line 120, change:

```ts
function makeMarker(shape: PointShape, cx: number, cy: number, color: string): SVGElement {
```
to
```ts
export function makeMarker(shape: PointShape, cx: number, cy: number, color: string): SVGElement {
```
(Visibility only — no behaviour change. Graph's existing suites guard it.)

- [ ] **Step 2: Create `src/components/ValueTable.tsx`**

```tsx
import * as React from 'react';

import { Card } from '@/components/ui/card';

/** One column: a header, a colour, and values parallel to `xs` (precomputed by the caller). */
export interface ValueColumn {
  key: string;
  header: React.ReactNode;
  color: string;
  /** `null` = no value at that x (rendered as "—"). */
  values: Array<number | null>;
}

export interface ValueTableProps {
  xs: number[];
  columns: ValueColumn[];
  emptyMessage: string;
  note?: string;
}

const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;

/**
 * The value table is the only place an explorer's math exists as real, screen-readable
 * text rather than SVG — hence a genuine <table> with scope="col" headers.
 *
 * Purely presentational: it evaluates NOTHING. The caller passes precomputed values, which
 * keeps `evalAt` (which re-parses its expression on every call) out of the render path.
 */
export default function ValueTable({
  xs,
  columns,
  emptyMessage,
  note,
}: ValueTableProps): React.JSX.Element {
  const hasRows = xs.length > 0 && columns.length > 0;

  return (
    <Card className="gap-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Value table (whole-number x)</h3>
        {note ? <span className="text-[11px] text-muted-foreground">{note}</span> : null}
      </div>

      {hasRows ? (
        <div className="max-h-72 overflow-auto">
          <table data-testid="value-table" className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-card">
              <tr>
                <th
                  scope="col"
                  className="whitespace-nowrap border-b px-2 py-1.5 text-left font-medium"
                >
                  x
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className="whitespace-nowrap border-b px-2 py-1.5 text-left font-medium"
                    style={{ color: col.color }}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {xs.map((x, i) => (
                <tr key={x} data-x={x} className={i % 2 ? 'bg-muted/40' : ''}>
                  <td className="whitespace-nowrap border-b px-2 py-1 font-mono">{x}</td>
                  {columns.map((col) => {
                    const v = col.values[i];
                    return (
                      <td
                        key={col.key}
                        data-col={col.key}
                        className="whitespace-nowrap border-b px-2 py-1 font-mono"
                      >
                        {v === null || v === undefined ? '—' : round6(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{emptyMessage}</p>
      )}
    </Card>
  );
}
```

- [ ] **Step 3: Type-check** — `npm run astro -- check` → 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/graphing/plot.ts src/components/ValueTable.tsx
git commit -m "feat(explorer): export makeMarker and add a shared value table"
```

---

## Task 2: Function Explorer — points + value table

**Files:**
- Modify: `src/scripts/explorer/render.ts`
- Modify: `src/components/explorer/FunctionExplorer.tsx`

**Interfaces:**
- Consumes: `makeMarker`, `ValueTable`/`ValueColumn` (Task 1); `gridlineCrossings`, `integerXs`, `evalAt`, `Point` from `@/scripts/graphing/math`; `explorerColors` from `@/scripts/graphing/theme`.
- Produces: `OverlayScene.points: Point[]`.

- [ ] **Step 1: `render.ts` — accept precomputed points and draw them**

Add to the imports:
```ts
import { evalAt, type Window2D, type Point } from '@/scripts/graphing/math';
import { applyThemeToPlot, boldZeroAxes, asNumericScale, makeMarker, SVG_NS, type FunctionPlotInstance } from '@/scripts/graphing/plot';
```
Add to `OverlayScene` (after `showFloor`):
```ts
  /** Whole-number gridline crossings to mark, already computed by the island (empty = off). */
  points: Point[];
```
In `drawExplorerOverlay`, after the horizontal-asymptote (floor) block and **before** the sweep trail, add:
```ts
  // Whole-number gridline crossings. Precomputed by the island — this renderer does no math.
  for (const p of scene.points) {
    const marker = makeMarker('circle', xScale(p.x), yScale(p.y), c.curve);
    marker.setAttribute('data-testid', 'crossing-marker');
    g.appendChild(marker);
  }
```

- [ ] **Step 2: `FunctionExplorer.tsx` — state, memos, checkbox, table**

Add imports:
```ts
import { evalAt, gridlineCrossings, integerXs, type Window2D } from '@/scripts/graphing/math';
import { explorerColors } from '@/scripts/graphing/theme';
import ValueTable, { type ValueColumn } from '@/components/ValueTable';
```
Add state beside `showGrid`:
```ts
  const [showPoints, setShowPoints] = useState(false);
```
Add memos after `poles` (all keyed on `displayWindow`, which tracks the live view):
```ts
  const points = useMemo(
    () => (showPoints && hasFunction ? gridlineCrossings(expr, displayWindow) : []),
    [showPoints, hasFunction, expr, displayWindow],
  );
  const tableXs = useMemo(
    () => (hasFunction ? integerXs(displayWindow) : []),
    [hasFunction, displayWindow],
  );
  const tableColumns = useMemo<ValueColumn[]>(
    () =>
      hasFunction
        ? [
            {
              key: 'fx',
              header: `f(x) = ${expr}`,
              color: explorerColors(dark).curve,
              values: tableXs.map((x) => evalAt(expr, x)),
            },
          ]
        : [],
    [hasFunction, expr, tableXs, dark],
  );
```
Add `points` to the scene object (`sceneRef.current = { …, showFloor, points, sweepTrail }`) and to the redraw effect's dependency array:
```ts
  }, [x, sweep, showWall, showFloor, points, asymptotes, displayWindow, endNeg, endPos, dark]);
```
Add the checkbox inside the *Window & guides* card, after the grid checkbox:
```tsx
            <label className="inline-flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={showPoints}
                disabled={!hasFunction}
                onCheckedChange={(v) => setShowPoints(v === true)}
              />
              <span className="text-muted-foreground">Show points (whole-number crossings)</span>
            </label>
```
Finally, put the table under the plot. Change the plot column wrapper from `<div>` to `<div className="space-y-4">` and add, after the plot `</Card>`:
```tsx
        <ValueTable
          xs={tableXs}
          columns={tableColumns}
          note="y values at each integer x in the window"
          emptyMessage="Plot a function to see its value table."
        />
```

- [ ] **Step 3: Type-check** — `npm run astro -- check` → 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/explorer/render.ts src/components/explorer/FunctionExplorer.tsx
git commit -m "feat(explorer): add points toggle and value table to the Function Explorer"
```

---

## Task 3: Transformation Explorer — points (both curves) + 2-column table

**Files:**
- Modify: `src/scripts/explorer/transform-render.ts`
- Modify: `src/components/explorer/TransformationExplorer.tsx`

**Interfaces:**
- Consumes: `makeMarker`, `SVG_NS`, `ValueTable`; `gridlineCrossings`, `integerXs`, `evalAt`, `Point`; `composeExpr` (already in `transform.ts`); `explorerColors`.
- Produces: `TransformRenderOptions.parentPoints: Point[]`, `.transformedPoints: Point[]`.

- [ ] **Step 1: `transform-render.ts` — draw both curves' markers**

Add imports: `type Point` from math; `makeMarker`, `SVG_NS` from plot; `type ExplorerColors` from theme.
Add to `TransformRenderOptions` (after `showParent`):
```ts
  /** Precomputed crossings; empty when the toggle is off. Parent obeys `showParent`. */
  parentPoints: Point[];
  transformedPoints: Point[];
```
Add this function beside `dashParent`:
```ts
/**
 * Whole-number gridline crossings for both curves. Cleared and rebuilt on every call, so
 * repeated renders never stack duplicates. Class is `.transform-points`, which cannot
 * collide with `dashParent`'s `g.graph` selector. Does no math — the island precomputes.
 */
function drawPoints(
  target: HTMLElement,
  instance: FunctionPlotInstance,
  parentPoints: Point[],
  transformedPoints: Point[],
  eColors: ExplorerColors,
): void {
  const svg = target.querySelector('svg');
  const xScale = asNumericScale(instance.meta.xScale);
  const yScale = asNumericScale(instance.meta.yScale);
  if (!svg || !xScale || !yScale) return;
  const canvas = svg.querySelector('g.canvas') ?? svg;

  canvas.querySelectorAll('.transform-points').forEach((n) => n.remove());
  if (parentPoints.length === 0 && transformedPoints.length === 0) return;

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'transform-points');
  const add = (pts: Point[], color: string, kind: string): void => {
    for (const p of pts) {
      const marker = makeMarker('circle', xScale(p.x), yScale(p.y), color);
      marker.setAttribute('data-testid', `crossing-marker-${kind}`);
      g.appendChild(marker);
    }
  };
  add(parentPoints, eColors.ghost, 'parent');
  add(transformedPoints, eColors.curve, 'transformed');
  canvas.appendChild(g);
}
```
Destructure the new options in `renderTransform`, and call `drawPoints` in **both** places `dashParent` is called — right after it in the render body, and right after it inside the `all:zoom` handler:
```ts
  dashParent(target, showParent);
  drawPoints(target, instance, parentPoints, transformedPoints, eColors);
```

- [ ] **Step 2: `TransformationExplorer.tsx` — state, memos, checkbox, table**

Add imports:
```ts
import { evalAt, gridlineCrossings, integerXs, type Window2D } from '@/scripts/graphing/math';
import { explorerColors } from '@/scripts/graphing/theme';
import { composeExpr, describeTransform, EPS, type Coeffs } from '@/scripts/explorer/transform';
import ValueTable, { type ValueColumn } from '@/components/ValueTable';
```
Add state beside `showGrid`:
```ts
  const [showPoints, setShowPoints] = useState(false);
```
Add memos after `readout`:
```ts
  const eColors = useMemo(() => explorerColors(dark), [dark]);
  const composed = useMemo(
    () => (baseExpr ? composeExpr(baseExpr, coeffs) : ''),
    [baseExpr, coeffs],
  );
  // Parent MARKERS follow `showParent`; the parent COLUMN below does not [G3].
  const parentPoints = useMemo(
    () => (showPoints && showParent && baseExpr ? gridlineCrossings(baseExpr, displayWindow) : []),
    [showPoints, showParent, baseExpr, displayWindow],
  );
  const transformedPoints = useMemo(
    () => (showPoints && composed ? gridlineCrossings(composed, displayWindow) : []),
    [showPoints, composed, displayWindow],
  );
  const tableXs = useMemo(() => integerXs(displayWindow), [displayWindow]);
  const tableColumns = useMemo<ValueColumn[]>(
    () => [
      {
        key: 'fx',
        header: `f(x) = ${parentLabel}`,
        color: eColors.ghost,
        values: tableXs.map((x) => evalAt(baseExpr, x)),
      },
      { key: 'gx', header: 'g(x)', color: eColors.curve, values: tableXs.map((x) => evalAt(composed, x)) },
    ],
    [tableXs, baseExpr, composed, eColors, parentLabel],
  );
```
Pass the points into `renderTransform` inside `drawPlot`, and add them to its `useCallback` deps:
```ts
        showParent,
        parentPoints,
        transformedPoints,
        dark,
        grid: showGrid,
```
```ts
  }, [baseExpr, coeffs, showParent, parentPoints, transformedPoints, dark, showGrid]);
```
Add the checkbox in the *Window & guides* card after the grid checkbox:
```tsx
            <label className="inline-flex cursor-pointer items-center gap-2">
              <Checkbox checked={showPoints} onCheckedChange={(v) => setShowPoints(v === true)} />
              <span className="text-muted-foreground">Show points (whole-number crossings)</span>
            </label>
```
Add the table under the plot (the plot column already needs `space-y-4`), after the plot `</Card>`:
```tsx
        <ValueTable
          xs={tableXs}
          columns={tableColumns}
          note="f(x) and g(x) at each integer x in the window"
          emptyMessage="No whole-number x values in this window."
        />
```

- [ ] **Step 3: Type-check** — `npm run astro -- check` → 0 errors.

> **Integration watch-item:** the points memos depend on `displayWindow`, so an interactive **zoom** now changes `drawPlot`'s identity and triggers a re-render (which is *correct* — the crossings must be recomputed for the new view). Confirm in Task 5 that zooming settles and does not loop (re-calling `functionPlot` with the same domain must not re-emit `all:zoom`).

- [ ] **Step 4: Commit**

```bash
git add src/scripts/explorer/transform-render.ts src/components/explorer/TransformationExplorer.tsx
git commit -m "feat(explorer): add points toggle and f(x)/g(x) value table to the Transformation Explorer"
```

---

## Task 4: End-to-end coverage

**Files:**
- Modify: `tests/e2e/explorer.spec.ts`
- Modify: `tests/e2e/transformation.spec.ts`

- [ ] **Step 1: Function Explorer tests** (append to `tests/e2e/explorer.spec.ts`)

```ts
test('with no function plotted, points are off/disabled and the table is empty', async ({ page }) => {
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
  // headers are real column headers
  await expect(table.locator('th[scope="col"]').first()).toHaveText('x');
});
```

- [ ] **Step 2: Transformation Explorer tests** (append to `tests/e2e/transformation.spec.ts`)

```ts
test('show points marks both curves; hiding the parent drops only its markers, not its column', async ({
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
  // …but the f(x) COLUMN stays [G3]
  await expect(page.locator('[data-testid="value-table"] th[data-col], [data-testid="value-table"]')).toBeVisible();
  await expect(page.locator('[data-testid="value-table"] tr[data-x="1"] td[data-col="fx"]')).toBeVisible();
});

test('the value table shows f(x) and g(x), and a vertical shift moves g by exactly k', async ({
  page,
}) => {
  await goto(page);
  const table = page.locator('[data-testid="value-table"]');

  // Parent x²: at x = 1, f = 1 and (identity) g = 1.
  await expect(table.locator('tr[data-x="1"] td[data-col="fx"]')).toHaveText('1');
  await expect(table.locator('tr[data-x="1"] td[data-col="gx"]')).toHaveText('1');

  // k = +2  →  g(x) = f(x) + 2, so g(1) = 3.
  const k = page.getByRole('slider', { name: /k — vertical shift/i });
  await k.focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight'); // step 0.1 × 20
  await expect(table.locator('tr[data-x="1"] td[data-col="gx"]')).toHaveText('3');
  await expect(table.locator('tr[data-x="1"] td[data-col="fx"]')).toHaveText('1'); // parent unchanged
});
```

- [ ] **Step 3: Run the suites**

```
npm run test:e2e -- explorer
npm run test:e2e -- transformation
npm run test:e2e            # full regression, no other spec may break
```
Expected: all pass. If a marker assertion fails, inspect the real SVG (`data-testid` on the marker) rather than weakening the assertion.

- [ ] **Step 4: Full regression + commit**

```bash
npm test && npm run astro -- check && npm run build
git add tests/e2e/explorer.spec.ts tests/e2e/transformation.spec.ts
git commit -m "test(explorer): cover the points toggle and value table in both explorers"
```

---

## Task 5: Perf gate + visual verification (G6) and docs

**This task is not optional.** The last three UI changes on this branch passed green tests while being visibly wrong; behaviour tests are blind to layout and to jank.

- [ ] **Step 1: Look at it.** Build + preview, then in a real browser (headless Playwright is fine) screenshot **both** explorers with **points ON** and the table visible, in dark mode. Confirm: markers sit on the curve, are visually distinct from the Function Explorer's haloed draggable point, the parent's markers are `ghost`-coloured and the transformed's are `curve`-coloured, and the table renders under the plot.

- [ ] **Step 2: Perf gate (the G6 acceptance criterion).** In the Transformation Explorer with **points ON**, drag the `a` slider across its range with a real cursor (`page.mouse.move(..., { steps: 30 })`) and measure. It must stay smooth. Concretely: time the drag and confirm no frame stalls the UI (e.g. assert the readout keeps updating and the drag completes well under a second of blocking work).
  - If it is janky, apply the mitigation ladder from the spec, in order: (1) confirm the memos are actually preventing recompute; (2) throttle the crossings recompute to one per animation frame; (3) precompile the expression inside `gridlineCrossings`.

- [ ] **Step 3: Zoom does not loop.** With points ON, scroll-zoom the Transformation Explorer plot and confirm the view settles (no runaway re-render) and the markers recompute for the new window.

- [ ] **Step 4: Docs + commit.** Append a `SUMMARY.md` entry (Change Type: Feature; Scope: Explorers — points & value table) and a `TODO.md` feature entry, then:

```bash
git add SUMMARY.md TODO.md
git commit -m "docs(explorer): record the points toggle and value table"
```

---

## Self-Review

**Spec coverage** — every spec section maps to a task:
- Export `makeMarker`; shared `ValueTable` (purely presentational, `scope="col"`, `—` for `null` only, one `round6`) → Task 1 (closes G1, G4, G5).
- Function Explorer points + table; **empty state** (checkbox disabled, "Plot a function…" message) → Task 2 (closes G2).
- Transformation Explorer points on **both** curves; **parent markers follow `showParent`, the `f(x)` column does not** → Task 3 + asserted in Task 4 (closes G3).
- Marker (r=4) vs. haloed draggable point (r=6) already distinct by construction → no code needed (G7); confirmed visually in Task 5.
- Perf acceptance gate measured with a real drag → Task 5 (closes G6).
- Unbounded rows / graph not refactored → plan-acknowledged, no task.

**Placeholder scan** — no TBD/TODO; every code step contains the actual code.

**Type consistency** — `Point`, `ValueColumn`, `OverlayScene.points`, `parentPoints`/`transformedPoints`, `makeMarker`, and the `data-testid`/`data-x`/`data-col` hooks are named identically across Tasks 1–4.
