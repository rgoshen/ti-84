# Design: Function Explorer (limits & asymptotes)

**Date:** 2026-07-04
**Status:** Approved — implementing on `feature/function-explorer`
**Full plan:** `~/.claude/plans/humble-zooming-kahan.md` (two spec-gap-auditor passes; gaps G1–G11 closed)

## Context

`~/Downloads/reciprocal-square-explorer.html` is a standalone canvas tool that teaches limits / arrow-notation for f(x)=1/x². We want that *functionality* — generalised to **any user-entered function** — inside the Astro app, built with the **same rendering stack as the existing graphing calculator** (`function-plot` SVG + D3, not raw canvas). It becomes the first entry in a new **Explorers** section.

Core behavioural fix vs the original: when the curve heads to ±∞, the draggable point **pins at the window edge and never teleports across a vertical asymptote to the other branch**.

## Decisions

1. **Rendering:** `function-plot` (SVG) as a new React island `FunctionExplorer.tsx`; the draggable point, limit-sweep trail/arrowhead, and asymptote/floor guides are **SVG overlays** injected into function-plot's `g.canvas` group and positioned via the live D3 scales (`instance.meta.xScale/yScale`) — the existing `drawPointsOverlay` technique. Reuses `plot.ts`/`theme.ts`.
2. **Any function** via mathjs (`evalAt`), like the graphing calculator.
3. **Auto-detected asymptotes** drive dynamic limit-sweep buttons (`x→a⁻`, `x→a⁺`) plus always-on `x→±∞`; a live arrow-notation readout names the nearest limit.
4. **Off-page / anti-teleport (core requirement):** a single pure `clampDragX` keeps the point inside its current branch; `pinToWindow` clamps the plotted y to the window edge.
5. **[G1] `epsilon` = fraction of window width** (`WALL_FRAC_OF_WIDTH ≈ 0.005`), recomputed on every window/zoom change; pure functions stay scale-agnostic.
6. **[G3] Keep zoom/pan** (`disableZoom:false`); resolve drag-vs-pan with **pointer arbitration** (a `pointerdown` on the point moves it via capture-phase `stopPropagation`; elsewhere pans; wheel zooms). Reuses `renderGraph`'s `on('all:zoom')` re-sync and `appliedWindow`/`displayWindow` split. Fallback: toggle `disableZoom` during a point-drag.
7. **Placement:** new **Explorers** section (`/explorers` hub + `/explorers/function`).

## Module boundaries

Pure, DOM-free, Vitest-tested — `src/scripts/explorer/`:

- **`limits.ts`** — `findVerticalAsymptotes(expr, w, opts?)`, `classifyEndBehavior(expr, side, opts?)`, `classifyOneSided(expr, a, side)`. Pole candidates from `g=1/f` sign-changes (odd poles), `g` near-zero minima (even poles), and `null`-flanked-by-large gaps; a divergence probe rejects removable/jump discontinuities (`sin(x)/x`). Thresholds are options so tests pin them.
- **`branch.ts`** — `branchOf(x, asymptotes, w)`, **`clampDragX(desiredX, currentX, asymptotes, w, epsilon)`** (never crosses a wall; degenerate branch `< 2·epsilon` → midpoint [G11]), `pinToWindow(fx, w)` (`{drawY, status}`), `sweepX(t, sweep, w, asymptotes, epsilon)`, `resolveX(x, asymptotes, w, epsilon)` (off-pole re-clamp on function/window change [G4]). Shared `TINY=1e-9`; no float `=== 0` [G10].
- **`notation.ts`** — `describeReadout(ReadoutInput): {headline, note}` with precedence nearest-wall-band → x-edge → `f(x)=value`; pin top/bottom → `→ ±∞`; `unknown` end-behaviour → neutral note. Formatters for `x → a⁻` etc.
- **`graphing/theme.ts` extension** — `explorerColors(dark)` (curve/wall/floor/arrow/point/pointStroke), each ≥3:1 non-text contrast vs bg in both themes (validated with existing `lineContrast`).

DOM / integration layer:

- **`src/scripts/explorer/render.ts`** — `renderExplorer` (function-plot `disableZoom:false` + `onViewChange`), `drawExplorerOverlay` (persistent SVG nodes updated per frame [G9]; up to two per-side dashed floors [G2]), `on('all:zoom')` re-sync.
- **`src/components/explorer/FunctionExplorer.tsx`** — React island: MutationObserver theme sync, `appliedWindow`/`displayWindow` split, memoised derived scans, pointer arbitration, decoupled rAF sweep loop (cancelled on any rebuild/gesture [G5]), coalesced `aria-live` readout [G7], shadcn controls incl. new `ui/slider.tsx` (radix-ui, no new dep). Tunables in one named-constants block [G8].
- **Routes/nav/config** — `src/pages/explorers/{index,function}.astro`, `Header` link + child-route active state, home card, `config.ts` titles.

## Accessibility (WCAG 2.1 AA)

Canvas/SVG is labelled; the authoritative content is a `role="status" aria-live="polite"` readout + real-text x/f(x). The `Slider` is the keyboard equivalent of dragging; sweeps are `<button>`s; `prefers-reduced-motion` honoured; meaning never by colour alone; errors use `role="alert"`.

## Testing

TDD-first per slice (Vitest, node): the pure-module cases above. Playwright e2e (`explorer.spec.ts`): anti-teleport, edge-pin, auto-detected sweeps + stop-at-wall, `tan(x)`/`x^2` button sets, drag-vs-pan arbitration, wheel-zoom re-detect, dark mode, nav `aria-current`, `role="status"` + keyboard slider.

## Risks

Heuristic detection aliases on oscillating functions — degrade gracefully (cap count; missed pole just omits a button, drag/pin still work from `branchOf`). Pointer arbitration vs function-plot's d3-drag is the main integration risk — prototyped first with a `disableZoom`-toggle fallback. Exporting `plot.ts` helpers is visibility-only, guarded by existing suites.
