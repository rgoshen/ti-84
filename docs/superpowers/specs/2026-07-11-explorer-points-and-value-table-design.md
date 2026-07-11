# Design: Points toggle & Value table in both Explorers

**Date:** 2026-07-11
**Status:** Audited (spec-gap-auditor) — gaps **G1–G7 closed** — ready for implementation
**Branch:** `feature/function-explorer` (extends the shipped Explorers section)

## Context

The **Graphing Calculator** already offers two features the Explorers lack:

1. **Points** — a per-equation `showPoints` checkbox (+ a shape picker) that draws markers at every
   **whole-number gridline crossing** (`gridlineCrossings`: integer x *or* integer y, de-duplicated,
   capped at 200/equation), as an SVG overlay in function-plot's `g.canvas`.
2. **Value table** — a card under the plot listing every **integer x in the current window**
   (`integerXs`) as rows, one colour-coded column per equation, `—` where undefined; scrollable with
   a sticky header.

The user wants both, in **both** explorers ("just like graph does").

## Decisions

1. **Reuse, don't reinvent.** Points come from `gridlineCrossings(expr, window)`; table rows from
   `integerXs(window)`; values from `evalAt(expr, x)`. Markers use `plot.ts`'s existing
   `makeMarker` — verified **private** at `plot.ts:120`; it gets **exported** (visibility-only change,
   guarded by graph's existing suites) so both explorers draw identical circles.
2. **On/off toggle only — no shape picker.** The picker exists in graph because many equations stack;
   each explorer has a fixed 1–2 curves already separated by colour and solid-vs-dashed. `circle`
   markers, colour-matched. (YAGNI.)
3. **Points default OFF**, matching graph.
4. **Transformation Explorer covers BOTH curves.** Markers on the parent f(x) (`ghost`) and the
   transformed g(x) (`curve`); table columns `x | f(x) | g(x)`.
   - **Parent MARKERS follow `showParent`** (markers for a hidden curve are nonsense).
   - **The parent COLUMN does not `[G3]`.** "Show parent" governs the **plot only**; the table always
     shows `x | f(x) | g(x)`, because the table is data, not decoration — and the f(x) column is the
     entire point of the numeric before/after comparison.
5. **One shared `ValueTable`** for the two explorers. **The graphing calculator is NOT refactored**
   onto it — shipped, tested code, out of scope; the mild duplication with graph's own table is
   accepted and noted as an optional follow-up.

## Module boundaries

**Islands decide, renderers draw `[G1]`.** This mirrors `render.ts`'s own stated architecture ("all
decisions it renders come from the pure, tested modules"). The islands compute the crossings and the
table values inside `useMemo`, and pass **already-computed data** down. Renderers never call
`gridlineCrossings`/`evalAt`; `ValueTable` never evaluates anything. This removes the spec's earlier
"presentational but also evaluates" contradiction **and** gives the single lever the perf risk needs.

**Shared:**
- **`src/scripts/graphing/plot.ts`** — `export` the existing `makeMarker(shape, cx, cy, color)`.
- **`src/components/ValueTable.tsx`** (new) — **purely presentational; imports no math** `[G1]`:
  ```ts
  interface ValueColumn {
    key: string;
    header: React.ReactNode;   // e.g. "f(x) = x²"
    color: string;             // header swatch colour
    values: Array<number | null>;  // precomputed, parallel to `xs`
  }
  interface ValueTableProps { xs: number[]; columns: ValueColumn[]; emptyMessage: string }
  ```
  Renders a real `<table>`: an `x` column plus one column per `ValueColumn`. A cell shows `—` when its
  value is `null` — and **only** `null`: `evalAt` (verified `math.ts:19`) already returns `null` for
  non-finite results, so no separate finite check is needed `[G4]`. Numbers are rounded with a single
  `round6` helper defined in this component `[G5]` (matching graph's table output; the pre-existing
  `round6` duplication elsewhere is left alone — noted as follow-up). Sticky header, zebra rows,
  `max-h-72 overflow-auto`. Headers carry `scope="col"` (verified: graph's table has **zero** `scope`
  attributes — this is an a11y improvement). Renders `emptyMessage` when `xs` or `columns` is empty.

**Function Explorer:**
- **`src/scripts/explorer/render.ts`** — `OverlayScene` gains `points: Point[]` (**already-computed**
  crossings; empty when the toggle is off or there is no function). `drawExplorerOverlay` appends
  `makeMarker('circle', xScale(x), yScale(y), c.curve)` for each, inside the existing
  `.explorer-overlay` group — which is already cleared and rebuilt on every redraw and on zoom/pan, so
  markers inherit that for free.
- **`src/components/explorer/FunctionExplorer.tsx`** — `showPoints` state (default `false`);
  `☑ Show points` checkbox in the existing *Window & guides* card; memoised
  `points = showPoints && hasFunction ? gridlineCrossings(expr, displayWindow) : []`; a `<ValueTable>`
  card under the plot with one column `f(x)` coloured `curve`, values memoised from
  `integerXs(displayWindow).map(x => evalAt(expr, x))`.
- **Empty state `[G2]`:** the explorer starts with **no function** (`expr === ''`). Then: no markers
  are drawn, the **Show points checkbox is disabled**, and the ValueTable card renders
  `emptyMessage = "Plot a function to see its value table."` (mirrors the existing "Plot a function to
  animate its limits." pattern.)

**Transformation Explorer:**
- **`src/scripts/explorer/transform-render.ts`** — `TransformRenderOptions` gains
  `parentPoints: Point[]` and `transformedPoints: Point[]` (already computed; empty when off). A new
  local `drawPoints(target, instance, …)` **clears and rebuilds** a `<g class="transform-points">` in
  `g.canvas` each call — parent markers in `ghost`, transformed in `curve`. Called from the render body
  **and inside the `all:zoom` handler**, exactly like `dashParent`. The class is `.transform-points`,
  so it cannot collide with `dashParent`'s `g.graph` selector (verified).
- **`src/components/explorer/TransformationExplorer.tsx`** — `showPoints` state (default `false`);
  `☑ Show points` checkbox in the *Window & guides* card. Memoised:
  `parentPoints = showPoints && showParent ? gridlineCrossings(baseExpr, view) : []`;
  `transformedPoints = showPoints ? gridlineCrossings(composed, view) : []`. `<ValueTable>` card under
  the plot with two columns — `f(x)` (`ghost`) and `g(x)` (`curve`) — values memoised from
  `integerXs(view)` against `baseExpr` and the composed expression. The f(x) column is present
  regardless of `showParent` `[G3]`.

## Marker vs. draggable point `[G7]`

No new styling is needed: `makeMarker` draws at `MARKER_RADIUS = 4`, while the Function Explorer's
draggable point is `POINT_RADIUS = 6` **with a background-toned halo stroke**. They are already
distinct by construction — recorded here so nobody "fixes" a non-problem.

## Accessibility (WCAG 2.1 AA)

The value table is the **only place either explorer's math exists as real, screen-readable text**
rather than SVG — so it is a genuine `<table>` with `scope="col"` headers under a visible heading, not
a grid of divs. The points toggle is a labelled checkbox (disabled, not hidden, when there is no
function). Markers convey nothing that is not also in the table, so no meaning rests on colour or shape
alone.

## Testing

`gridlineCrossings` and `integerXs` are **already unit-tested** (verified: `math.test.ts:21,36`) and no
new pure logic is introduced — the islands only compose existing helpers. The new surface is UI, so it
is tested at the **e2e level**, matching how every component in this codebase is verified.

**Playwright** (extending `explorer.spec.ts` / `transformation.spec.ts`):
- Function Explorer: no markers by default; **Show points** renders markers (count > 0); the table
  lists integer-x rows with correct values (`1/x^2` at x = 2 → `0.25`); with no function plotted the
  checkbox is disabled and the table shows its empty message.
- Transformation Explorer: **Show points** renders markers for **both** curves; unticking **Show
  parent** removes the parent's markers **but keeps the `f(x)` column** `[G3]`; after a pure vertical
  shift (k = 2) every `g(x)` cell equals its `f(x)` cell + 2 — pinning the columns to the real
  transformation.
- Both: the table is a real `<table>` whose headers carry `scope="col"`.

## Risks

- **Perf: recomputing crossings during a slider drag.** `gridlineCrossings` bisects against gridlines
  via `evalAt`, which **re-parses the expression on every call** (verified `math.ts:16`). With points
  ON, a Transformation Explorer slider drag changes the composed expression each tick and re-derives
  the crossings.
  **Acceptance gate `[G6]`:** dragging a slider with **points ON** must stay visually smooth — verified
  by an actual drag in a real browser, not assumed. If it is not: (1) the memoisation above already
  prevents recompute on unrelated re-renders; (2) throttle the crossings to one recompute per frame;
  (3) precompile the expression inside `gridlineCrossings`. Points default OFF, so the common path
  costs nothing.
- **Unbounded table rows.** `integerXs` is uncapped, so a ±1000 window yields ~2000 rows. This is
  exactly graph's existing behaviour and the container scrolls (`max-h-72`); a row cap can be added if
  it proves slow.

## Revision changelog (gaps closed)

| Gap | Severity | Summary | Where closed |
|-----|----------|---------|--------------|
| G1 | Should-fix | Islands compute + memoise; renderers and `ValueTable` receive precomputed data (no math inside) — removes the contradiction and creates the perf lever | §Module boundaries |
| G2 | Should-fix | Function Explorer empty state: no markers, checkbox **disabled**, table shows "Plot a function to see its value table." | §Module boundaries (Function Explorer) |
| G3 | Should-fix | "Show parent" governs the **plot only**; the `f(x)` **column always shows** | §Decisions 4; §Testing |
| G4 | Minor | Dropped the dead "non-finite" check — `evalAt` already returns `null` for non-finite | §Module boundaries (ValueTable) |
| G5 | Minor | One `round6` in `ValueTable`; pre-existing duplication left alone, noted as follow-up | §Module boundaries (ValueTable) |
| G6 | Minor | Perf gate made concrete: a slider drag with points ON must stay smooth, measured in a real browser | §Risks |
| G7 | Minor | Markers (r=4) vs. haloed draggable point (r=6) are already distinct by construction — recorded | §Marker vs. draggable point |
