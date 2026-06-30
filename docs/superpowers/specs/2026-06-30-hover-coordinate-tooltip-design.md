# Hover Coordinate Tooltip — Design

- **Date:** 2026-06-30
- **Status:** Approved (pre-implementation)
- **Component:** Graphing calculator (`src/components/graphing/GraphingCalculator.tsx`, `src/scripts/graphing/plot.ts`)
- **Branch:** `feature/hover-coordinate-tooltip`
- **Revised 2026-06-30** — spec-gap-auditor gaps **G1–G7 closed** (see Revision changelog at foot). Inline fixes tagged `[Gxx]`.

## Summary

When the user hovers over the plot, show a floating tooltip with the `(x, y)`
value at the pointer. Two modes, one tooltip:

1. **Dot mode** — hovering a discrete "Show points" marker shows that marker's
   own `(x, y)` (these sit at whole-number gridline crossings: integer in one
   axis, bisected in the other — see [G6]).
2. **Curve mode** — hovering anywhere along a plotted curve (whether or not
   "Show points" is on) shows the **computed** `(x, y)` at the pointer's x on the
   nearest curve.

## Goals

- A floating, themed tooltip that tracks the cursor and reads `(x, y)`.
- The marker's own values on the discrete dots; computed values along the curve.
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

### Constants [G1]

Named in `hover.ts` (no magic numbers), following the existing `MARKER_RADIUS` /
`MAX_POINTS` / `SAMPLES` convention:

| Name | Value | Meaning |
|---|---|---|
| `DOT_HIT_RADIUS_PX` | `8` | pointer-to-marker distance that counts as "on the dot" |
| `CURVE_HIT_RADIUS_PX` | `20` | pointer-to-curve pixel-y distance that counts as "on the curve" |
| `COORD_DECIMALS` | `3` | decimals shown before trailing-zero trim |
| `GESTURE_SUPPRESS_MS` | `150` | window after the last zoom/pan event during which the tooltip stays hidden [G7] |

### Types

```ts
interface HoverInfo {
  x: number;        // data-space x
  y: number;        // data-space y
  clientX: number;  // viewport px for tooltip positioning (position: fixed) [G5]
  clientY: number;
  color: string;    // owning curve color — used ONLY as a non-text accent [G3]
  onMarker: boolean; // true = snapped to a discrete marker (its stored coords);
                     // false = computed on the nearest curve. NOT a claim of
                     // mathematical exactness — integer-y marker x is bisected. [G6]
}
```

### Components / changes

1. **`plot.ts` — marker coordinates.** When `drawPointsOverlay` creates each
   marker, stash its data `(x, y)` and owning `color` (e.g. a parallel list of
   `{ x, y, color }` kept alongside the overlay) so a hover returns the marker's
   own coordinates without re-deriving them. (These are the marker's stored
   coordinates, integer in one axis and bisected in the other — not exact. [G6])

2. **`plot.ts` — hover handler** (extracted as `attachHoverReadout(instance, target, opts)`
   for a single, focused seam [G8]). A `pointermove` / `pointerleave` listener on
   the plot surface (`rect.zoom-and-drag`), rAF-throttled like the `all:zoom`
   handler. Logic, re-reading the live scales each call (correct after zoom/pan):
   - **Gesture guard [G7]:** if a zoom/pan happened within `GESTURE_SUPPRESS_MS`
     (tracked via a timestamp set in the `all:zoom` handler), emit `null` and stop
     — no tooltip mid-gesture.
   - **Dot hit-test first:** nearest stored marker within `DOT_HIT_RADIUS_PX`
     (compare in pixel space via the live scales) → `onMarker: true`, stored coords + color.
   - **Else curve:** `dataX = xScale.invert(cursorPx)`; for each equation evaluate
     `evalAt(expr, dataX)`; pick the curve whose `yScale(y)` is nearest the cursor
     pixel-y within `CURVE_HIT_RADIUS_PX` (via `nearestWithinThreshold`) →
     `onMarker: false`, computed coords + that curve's color.
   - **Else** emit `null`.
   - Guards `if (!xScale || !yScale) return` (scales may be absent), mirroring
     `drawPointsOverlay`.

3. **`plot.ts` — `onHover` option + lifecycle [G4].** Add
   `onHover?: (info: HoverInfo | null) => void` to `RenderGraphOptions`.
   `attachHoverReadout` returns a `cleanup()` that removes the pointer listeners
   and `cancelAnimationFrame`s any queued frame; `renderGraph` calls it on
   rebuild. `pointerleave` emits `onHover(null)`. The component wraps the callback
   with its existing `disposed` flag (as it already does for `onViewChange`) so no
   `setState` fires after unmount.

4. **Native tip suppression [G2].** Add a persistent, plot-scoped CSS rule in
   `global.css` — `[data-testid="plot"] .inner-tip { display: none !important; }`
   — rather than inline-hiding the element. function-plot recreates/repositions
   the tip group on zoom and on each hover, so an inline style would not survive;
   `!important` overrides function-plot's inline updates.

5. **React tooltip (`GraphingCalculator.tsx`).** Hold `hover: HoverInfo | null` in
   state set from `onHover`. Render a themed tooltip via `position: fixed` at
   `clientX/clientY` (+ a small up-right offset), clamped to the plot card's
   `getBoundingClientRect()` so it never leaves the plot [G5]. Chip styling:
   `bg-popover` + `text-popover-foreground`, subtle border + shadow. **The `(x,y)`
   text stays in `popover-foreground` (AA-contrast); the curve `color` is used
   ONLY as a small leading swatch dot / left-border accent, never as the text
   color [G3].** `role="status"` + `aria-live="polite"`.

6. **Formatting (pure helper).** `formatNumber(n)`: round to `COORD_DECIMALS`,
   trim trailing zeros (integers stay integers; `-0 → "0"`). Display
   `(${formatNumber(x)}, ${formatNumber(y)})`.

7. **Selector (pure helper).** `nearestWithinThreshold(candidates, cursorPx, thresholdPx)`
   returns the candidate nearest `cursorPx` within the threshold, else `null` —
   used for the multi-curve pick (kept pure for unit testing).

## Error handling / edge cases

- `evalAt` returns `null` (asymptote / undefined) → that curve is not a
  candidate; tooltip hidden if nothing else matches.
- Cursor in empty space (beyond the thresholds) → `onHover(null)`, tooltip hidden.
- Multiple curves overlapping → nearest-by-pixel-y wins; tie broken by list order.
- Plot rebuild (equation/window/theme change) → `cleanup()` removes listeners and
  cancels any queued frame; stale `hover` cleared; listeners re-attached. [G4]
- After zoom/pan → handler reads the current `meta.xScale`/`yScale`, so readouts
  track the new view; and the tooltip is suppressed for `GESTURE_SUPPRESS_MS`
  after the last gesture event so it doesn't flicker mid-pan/zoom. [G7]

## Testing

**Unit (vitest, node):**
- `formatNumber`: `1 → "1"`, `1.5708 → "1.571"`, `-0 → "0"`, `2.0 → "2"`.
- `nearestWithinThreshold`: picks the closest candidate; returns `null` when all
  exceed the threshold; deterministic tie-breaking.

**E2e (playwright, dark mode):**
- Plot `sin(x)`, enable Show points; hover a known marker → tooltip visible with
  that marker's coordinates (e.g. the origin dot → `(0, 0)`).
- Hover along the curve away from any marker → tooltip visible; its x ≈ the
  cursor's data-x (within tolerance).
- Move the pointer off the plot → tooltip removed.
- A11y/contrast [G3]: assert the `(x, y)` text color resolves to the popover
  foreground token (not a curve palette color), so it can't silently regress to a
  low-contrast tint.

## Files touched

- `src/scripts/graphing/plot.ts` — marker coords, `attachHoverReadout`, `onHover`
  option + cleanup, gesture timestamp on `all:zoom`.
- `src/scripts/graphing/hover.ts` *(new, pure)* — `formatNumber`,
  `nearestWithinThreshold`, the constants, + `HoverInfo` type.
- `src/scripts/graphing/hover.test.ts` *(new)* — unit tests.
- `src/components/graphing/GraphingCalculator.tsx` — hover state + tooltip.
- `src/styles/global.css` — scoped `.inner-tip` suppression rule. [G2]
- `tests/e2e/graphing.spec.ts` — hover e2e.

## Revision changelog

| Gap | Summary | Where closed |
|-----|---------|--------------|
| G1 | Named the thresholds/precision as symbolic constants (no magic numbers) | §Constants, §Components #2/#6 |
| G2 | Native-tip suppression pinned to a persistent scoped CSS rule (survives redraw) | §Components #4, §Files touched |
| G3 | `(x,y)` text kept in popover-foreground (AA); curve color demoted to a non-text swatch | §Components #5, §Testing (a11y assertion) |
| G4 | Specified `cleanup()` (listener removal + rAF cancel), `disposed` guard, pointerleave-null | §Components #3, §Edge cases |
| G5 | Tooltip positioning fixed at `clientX/clientY`, clamped to the plot card rect | §Types, §Components #5 |
| G6 | Renamed `exact` → `onMarker`; clarified marker x is bisected, not exact | §Types, §Components #1, §Testing |
| G7 | Gesture-suppression window (`GESTURE_SUPPRESS_MS`) hides the tooltip mid-pan/zoom | §Constants, §Components #2, §Edge cases |
| G8 *(note)* | Hover handler extracted as `attachHoverReadout(...)` seam to keep `plot.ts` focused | §Components #2 |
