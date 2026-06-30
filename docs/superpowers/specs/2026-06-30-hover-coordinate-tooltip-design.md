# Hover Coordinate Tooltip — Design

- **Date:** 2026-06-30
- **Status:** Approved (pre-implementation)
- **Component:** Graphing calculator (`src/components/graphing/GraphingCalculator.tsx`, `src/scripts/graphing/plot.ts`)
- **Branch:** `feature/hover-coordinate-tooltip`

## Summary

When the user hovers over the plot, show a floating tooltip with the `(x, y)`
value at the pointer. Two modes, one tooltip:

1. **Dot mode** — hovering a discrete "Show points" marker shows that marker's
   **exact** `(x, y)` (these sit at whole-number gridline crossings).
2. **Curve mode** — hovering anywhere along a plotted curve (whether or not
   "Show points" is on) shows the **computed** `(x, y)` at the pointer's x on the
   nearest curve.

## Goals

- A floating, themed tooltip that tracks the cursor and reads `(x, y)`.
- Exact values on the discrete markers; computed values along the curve.
- Correct after interactive zoom/pan (use the live scales).
- Light/dark themed, accessible, and covered by unit + e2e tests.

## Non-Goals (YAGNI)

- Crosshair lines (the chosen readout style is a floating tooltip).
- Click-to-pin / freeze a readout.
- Touch / no-hover devices — the tooltip is a progressive enhancement for v1;
  a future "tap to read" can follow.

## Background

- `plot.ts` already draws discrete markers via `drawPointsOverlay()` (class
  `.points-overlay`) at whole-number gridline crossings from
  `gridlineCrossings(expr, win)`. These markers have **no interactivity** today.
- function-plot renders a native crosshair tip (`.tip` → `.inner-tip` with
  `tip-x-line`/`tip-y-line`); in probing it surfaced **no readable coordinate
  text**. We will suppress it to keep a single, consistent readout.
- `plot.ts` already narrows `instance.meta.xScale` / `instance.meta.yScale` to a
  `NumericScale` (value → pixel, `.domain()`). We extend that to also use
  `.invert()` (pixel → data) for curve mode. (context7 has no entry for this
  `function-plot`; design is grounded in the live DOM and existing code.)

## Architecture (Approach A)

Geometry and hit-testing live in the framework-free `plot.ts`; the tooltip is
plain themed DOM rendered by React. `plot.ts` reports hover state through a new
callback, mirroring the existing `onViewChange` pattern.

```
pointermove on plot surface
  └─ plot.ts hover handler (rAF-throttled)
       ├─ hit-test dots (≤ ~8px) → exact stored (x, y)
       ├─ else invert cursor-x → data-x; eval each curve;
       │     pick nearest curve by pixel-y within ~20px → computed (x, y)
       └─ else null
  └─ onHover(HoverInfo | null)
       └─ React positions one floating tooltip <div> at the cursor
pointerleave → onHover(null) → tooltip hidden
```

### Types

```ts
interface HoverInfo {
  x: number;        // data-space x
  y: number;        // data-space y
  clientX: number;  // viewport px for tooltip positioning
  clientY: number;
  color: string;    // owning curve color (tooltip accent)
  exact: boolean;   // true = on a discrete marker, false = computed on curve
}
```

### Components / changes

1. **`plot.ts` — marker coordinates.** When `drawPointsOverlay` creates each
   marker, stash its exact data `(x, y)` (e.g. `data-x` / `data-y` attributes or
   a parallel list) so hover returns exact values without re-deriving them.

2. **`plot.ts` — hover handler.** Add a `pointermove` / `pointerleave` listener
   on the plot surface (the `rect.zoom-and-drag` or svg), rAF-throttled like the
   `all:zoom` handler. Logic:
   - Dot hit-test first: nearest marker within ~8px → `exact: true`, stored coords.
   - Else curve: `dataX = xScale.invert(cursorPx)`; for each equation evaluate
     `evalAt(expr, dataX)`; choose the curve whose `yScale(y)` is nearest the
     cursor pixel-y and within ~20px → `exact: false`.
   - Else emit `null`.
   - Re-reads the live scales each time, so it is correct after zoom/pan.

3. **`plot.ts` — `onHover` option.** Add `onHover?: (info: HoverInfo | null) => void`
   to `RenderGraphOptions`; wire the listeners in `renderGraph` and clean them up
   when the plot is rebuilt.

4. **`plot.ts` — suppress native tip.** Hide `.inner-tip` (style-based, version
   independent) so only our tooltip shows.

5. **React tooltip (`GraphingCalculator.tsx`).** Hold `hover: HoverInfo | null`
   in state set from `onHover`. Render a themed, absolutely-positioned `<div>`
   (rounded chip, `bg-popover` / `text-popover-foreground`, subtle border +
   shadow), offset up-right of the cursor and clamped inside the plot card. Text
   tinted with `color`. `role="status"` + `aria-live="polite"`.

6. **Formatting (pure helper).** `formatNumber(n)`: round to 3 decimals, trim
   trailing zeros (integers stay integers). Display `(${formatNumber(x)}, ${formatNumber(y)})`.

7. **Selector (pure helper).** `nearestWithinThreshold(candidates, cursorPx, thresholdPx)`
   returns the candidate nearest `cursorPx` within the threshold, else `null` —
   used for the multi-curve pick (kept pure for unit testing).

## Error handling / edge cases

- `evalAt` returns `null` (asymptote / undefined) → that curve is not a
  candidate; tooltip hidden if nothing else matches.
- Cursor in empty space (beyond the thresholds) → `onHover(null)`, tooltip hidden.
- Multiple curves overlapping → nearest-by-pixel-y wins; tie broken by list order.
- Plot rebuild (equation/window/theme change) → listeners removed and
  re-attached; stale `hover` cleared.
- After zoom/pan → handler reads the current `meta.xScale`/`yScale`, so readouts
  track the new view.

## Testing

**Unit (vitest, node):**
- `formatNumber`: `1 → "1"`, `1.5708 → "1.571"`, `-0 → "0"`, `2.0 → "2"`.
- `nearestWithinThreshold`: picks the closest candidate; returns `null` when all
  exceed the threshold; deterministic tie-breaking.

**E2e (playwright, dark mode):**
- Plot `sin(x)`, enable Show points; hover a known marker → tooltip visible with
  the expected exact `(x, y)`.
- Hover along the curve away from any marker → tooltip visible; its x ≈ the
  cursor's data-x (within tolerance).
- Move the pointer off the plot → tooltip removed.

## Files touched

- `src/scripts/graphing/plot.ts` — marker coords, hover handler, `onHover`
  option, native-tip suppression.
- `src/scripts/graphing/hover.ts` *(new, pure)* — `formatNumber`,
  `nearestWithinThreshold` + `HoverInfo` type.
- `src/scripts/graphing/hover.test.ts` *(new)* — unit tests.
- `src/components/graphing/GraphingCalculator.tsx` — hover state + tooltip.
- `tests/e2e/graphing.spec.ts` — hover e2e.
