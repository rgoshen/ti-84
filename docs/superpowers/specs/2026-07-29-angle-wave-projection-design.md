# Angle Explorer Wave Projection — Design

**Date:** 2026-07-29
**Status:** Approved
**Branch:** `feature/angle-wave-projection`
**Extends:** `docs/superpowers/plans/2026-07-23-angle-explorer.md`, `2026-07-27-unit-circle-coordinates-design.md`

## Objective

The Angle Explorer already teaches that one angle has five equivalent names (degrees, a
fraction of a turn, an exact π multiple, a decimal radian measure, an arc length) and that
its terminal point has exact coordinates. What it does not yet show is the step every
trigonometry course takes next: that sweeping the angle and recording one coordinate
**generates a wave**.

This adds a `Wave` selector — **none · sin θ · cos θ** — that reveals a strip below the
circle. As the student drags the angle slider, the selected wave is traced from 0 out to θ.
The angle slider is the drawing instrument; there is no self-playing animation anywhere.

It also changes the explorer's default angle from 30° to 0°, so the first drag of the
slider is the one that draws the wave from nothing.

## Verified before designing

Read directly rather than assumed, because the existing figure is dense and several of
these facts change the design:

| Question | Answer | Source |
| --- | --- | --- |
| Is the sin/cos value already computed and displayed? | Yes — `y = r·sin θ = 1.2 × √3/2 ≈ 1.0392` | `angle-coordinates.ts:132-135` |
| Do exact π-multiple *text* formatters exist for tick labels? | Yes, but they live inside the component | `AngleExplorer.tsx:104-119` |
| What happens to the sweep arc at θ = 0? | `arcPath` returns `''` below 1e-9; measure arc and arrowhead are gated together so neither survives alone | `angle-render.ts:42`, `angle-diagram.ts:199,237-241` |
| Is `RadioGroup` available from the installed `radix-ui` umbrella? | Yes — `Root`, `Item`, `Indicator`, same import style as `Slider`/`Checkbox` | verified via `node -e` against `radix-ui@1.6.0` |
| Are all `ExplorerColors` entries already used in this figure? | Yes, all six: `curve` (swept arc), `floor` (initial ray), `wall` (terminal ray), `arrow` (measure arc), `axis`/`ghost` (reference geometry), `point`/`pointStroke` (dots) | `angle-diagram.ts:256-274` |
| Is there a visual PNG baseline for this explorer? | No — only function-explorer, graphing-calculator, transformation-explorer | `tests/e2e/__snapshots__/export-visual.spec.ts/` |
| How large is the export graph area? | 960 × 560; the circle currently renders 560 × 560 centred with dead space either side | `export/model.ts:4-5`, `AngleExplorer.tsx:332` |
| Can `buildReadout` be unit-tested where it is? | No. It lives inside the `.tsx` component, and vitest collects only `.ts` in the node env | `vitest.config.ts`, `AngleExplorer.tsx:47-92` |

The last row is load-bearing: the θ = 0 readout fix below is **untestable** until
`buildReadout` moves into a pure module. The extraction is not tidying, it is what makes
the fix provable.

## Requirements

1. A `Wave` radio group with exactly three options — `none`, `sin θ`, `cos θ` — defaulting
   to `none`.
2. With `none` selected, no wave strip exists in the DOM. The explorer looks exactly as it
   does today.
3. Selecting `sin θ` or `cos θ` reveals a full-width strip **below the circle**, above the
   existing readout boxes.
4. The wave is **traced from 0 to the current θ** — growing rightward for positive angles,
   leftward for negative ones. Nothing self-plays; the slider draws it.
5. Horizontal axis spans **−2π … 2π**, matching the angle slider's −360°…360°, with tick
   marks at **every multiple of π/4** (17 ticks).
6. The wave's amplitude is the radius: it plots **r·sin θ** / **r·cos θ**, so the strip
   agrees with the coordinate readout already on screen.
7. `Reset` restores the wave selector to `none` along with the other three controls.
8. Default angle becomes **0°**.
9. Everything derives from θ. No second clock, no second source of truth.

## Decisions

| Decision | Chosen | Rejected, and why |
| --- | --- | --- |
| Layout | Stacked strip below the circle | Side-by-side "unrolled" would permit a horizontal tie-line, but shrinks the circle or forces the diagram column to reflow to `max-w-4xl`. Drawing inside the existing 320 viewBox would drop the font-size-9 tick labels and font-size-10 coordinate labels to ~6px effective. |
| Amplitude | `r·sin θ` — the radius scales the wave | Fixed ±1 amplitude reads as textbook `sin θ`, but at r = 1.5 the strip would show 0.5 while the coordinate box two inches below reads 0.75. Two numbers for one quantity is the quiet false mathematics this project has already fixed once. |
| x-domain | −2π … 2π | 0 … 2π alone blanks the wave over a third of the slider's travel, which reads as a bug. Wrapping θ onto 0…2π keeps the marker visible but decouples it from the slider and erases the −90°/270° distinction the signed sweep arrow teaches. |
| Draw mode | Traced 0 → θ | A full static curve with a riding marker shows the shape sooner but severs the causal link between sweeping the angle and generating the wave, which is the only reason to build this. |
| Motion | None. Slider-driven only | Auto-play would overwrite a hand-set angle, and continuous looping fights manual adjustment and trips WCAG 2.2.2. Removing self-motion also removes the reduced-motion branch entirely. |
| `none` treatment | Strip absent from the DOM | An empty framed box with bare gridlines is more visual noise for someone who chose "none", and reads as broken. |
| y-domain | Fixed ±1.5 | Auto-scaling to r would silently cancel the amplitude change, defeating decision 2 above. |
| Tick labels | All 17, staggered onto two baselines | One baseline gives each label ~29px where `−7π/4` needs ~25px — it fits with 4px of air and forces the smallest font in the app. Labelling only π/2 multiples is tidier but retreats from the requirement. |

### Why the tie-line loss is acceptable

Stacked layout means the circle's and the strip's vertical axes do not align, so no
horizontal tie-line is geometrically possible. Two things carry the link instead:

1. **A highlighted projection leg in the polar figure.** For `sin θ`, the perpendicular
   from the terminal point to the initial-side ray; for `cos θ`, the leg from the origin to
   the foot of that perpendicular.
2. **A shared marker colour.** The strip's marker uses `colors.point` / `colors.pointStroke`
   — the identical values as the circle's terminal dot.

The invariant that makes (1) exact: the perpendicular distance from the terminal point to
the initial-side ray is `r·|sin θ|`, and the along-axis leg is `r·|cos θ|`, **for any β**.
β rotates the frame rigidly, so both legs rotate with it and both lengths are invariant.
The highlighted leg and the wave's plotted height are therefore always the same length in
the same colour. That equality is a unit test, not a hope.

## Architecture

### New: `src/scripts/explorer/angle-wave.ts`

Pure SVG-markup builder, DOM-free by string concatenation, mirroring `angle-diagram.ts`
so it unit-tests in the node environment. Returns inner markup only; the caller owns the
outer `<svg>`, its viewBox and its accessible name — the same contract
`buildAngleDiagramSvg` already establishes, and the reason the live view and the export
cannot drift.

Both wave types live here, so `angle-diagram.ts` and the component import rather than
redeclare them. `angle-diagram.ts`'s import is **type-only**, so it adds no runtime coupling
and no cycle (`angle-wave.ts` does not import `angle-diagram.ts`).

```ts
export type WaveFn = 'sin' | 'cos';
export type WaveMode = 'none' | WaveFn;

export interface WaveDiagramOptions {
  fn: WaveFn;
  /** Swept angle in degrees — the same θ that drives the circle. */
  theta: number;
  /** Circle radius. The wave's amplitude. */
  r: number;
  colors: ExplorerColors;
  /** Stroke colour for the π/4 tick labels. */
  tickText: string;
  /** viewBox width, px. Defaults to 512. */
  width?: number;
  /** viewBox height, px. Defaults to 176. */
  height?: number;
}

export function buildWaveSvg(opts: WaveDiagramOptions): string;
```

Exported helpers, so each decision is testable without parsing markup:

| Helper | Contract |
| --- | --- |
| `waveTickRadians()` | The 17 multiples of π/4 from −2π to 2π, as `{ k, radians }` where `k` is the integer numerator over 4. |
| `waveTickLabel(k)` | Plain-text exact form via `formatPiText(reduceFraction(k, 4))`. k = −8 → `-2π`; k = 1 → `π/4`; k = 0 → `0`. |
| `waveValue(fn, theta, r)` | `r·sin(θ)` or `r·cos(θ)`, θ in degrees. |
| `wavePath(fn, theta, r, scales)` | Polyline `M … L …` from 0 toward θ in uniform 2° steps (signed, so negative θ steps left), with the final vertex snapped to θ exactly so the curve always ends under the marker. Returns `''` when `\|θ\| < 1e-9`. At most 180 vertices. |
| `waveSpoken(fn, theta, r)` | Screen-reader prose, e.g. `Sine wave traced from 0 to 135 degrees.` |

`waveTickLabel` deliberately reuses `formatPiText` — the same formatter that renders the
Radians field's exact companion — so the axis and the field can never express the same
quantity in different notation.

`wavePath` returning `''` below 1e-9 is the same threshold and the same reasoning as
`arcPath`: a zero-length trace is nothing, not a degenerate path. Note the marker is drawn
independently, so at θ = 0 with `cos θ` selected the marker still sits at `r` while `sin θ`
puts it at 0 — the clearest possible statement of how the two functions differ at zero.

#### Scales

- **x:** `padL + (radians + 2π) / 4π × plotW`. Endpoints −2π and 2π land on the plot edges;
  0 lands at the centre.
- **y:** `padT + (1.5 − value) / 3 × plotH`. Fixed domain ±1.5 — the radius slider's
  maximum — regardless of the current r.

#### Marks

| Mark | Style | Rationale |
| --- | --- | --- |
| y = 0 axis, x = 0 axis | Solid, `colors.axis`, width 1 | Matches the polar figure's reference axes. |
| y = ±1 references | Dashed `3 3`, `colors.axis` | The strip's counterpart to the dashed unit circle, same dasharray. Same visual language for the same idea. |
| π/4 ticks | Short lines, `colors.axis`, width 1 | 17 of them, all drawn. |
| π/4 labels | `tickText`, font-size 10, staggered | π/2 multiples on the primary baseline, odd π/4 multiples on a second baseline below. Doubles the pitch to ~59px. |
| Traced curve | `colors.wave`, width 2.5 | New colour, see below. |
| Marker | `colors.point` fill, `colors.pointStroke` ring, r 3.5 | Identical to the circle's terminal dot — this is the link. |
| Drop-line | Dashed, `colors.wave`, width 1 | Marker to y = 0. Shows the value as a signed height. |

### Modified: `src/scripts/explorer/angle-diagram.ts`

One optional, purely additive option:

```ts
/** Highlight the reference-triangle leg the named wave plots. Omitted draws neither. */
projection?: WaveFn;
```

When set, emits one `<line data-role="projection-leg">` in `colors.wave` at width 2.5:

- `sin` — from the terminal point to the foot of the perpendicular on the initial-side ray.
  Foot is `polarToCartesian(c, c, r·cos(θ)·unit, betaRad)`.
- `cos` — from the origin to that same foot, along the initial side.

Both are positioned through `betaRad` like every other element, so the leg rotates as part
of the rigid body. Nothing existing changes; every current call site omits the option and
produces byte-identical markup.

### New: `src/scripts/explorer/angle-readout.ts`

`buildReadout` moves here verbatim from `AngleExplorer.tsx:47-92`, then gains the θ = 0
collapse. Nothing else about it changes.

**The fix.** At θ = 0 the current chain prints:

```
0° = 0 of a full turn = 0 × 2π = 0 ≈ 0 rad
```

True, but mush — and with the new default it becomes the first thing every visitor reads.
It collapses to `0° = 0 rad`, spoken as `0 degrees is 0 radians.` The arc line's relation
also tightens from `≈` to `=`, because `r × 0` is exactly 0 for any r.

### Modified: `src/scripts/explorer/angle.ts`

`formatFractionText` and `formatPiText` move in from `AngleExplorer.tsx:104-119`, beside
their LaTeX twins `formatFractionLatex` / `formatPiLatex`. They were always general-purpose
formatters that happened to live in a component; `angle-wave.ts` now needs `formatPiText`
too, so leaving them in the component would mean either duplicating them or importing from
a `.tsx` into a `.ts`.

### Modified: `src/scripts/graphing/theme.ts`

`ExplorerColors` gains a seventh entry:

```ts
/** The traced sin/cos wave and its matching projection leg in the circle. */
wave: string;
```

Proposed `#0f766e` (teal-700) light, `#2dd4bf` (teal-400) dark. All six existing entries
are already spoken for in this figure, so a new one is unavoidable.

This is test-enforced rather than asserted. `theme.test.ts` already verifies every overlay
mark clears WCAG 1.4.11's 3:1 non-text contrast against `themeColors(dark).bg` in both
themes; `wave` joins that check. If a hex fails, the test names it and the hex changes. The
nearest existing neighbour is the initial-side blue `#378add` — if teal reads too close to
it in a browser, green (`#15803d` / `#4ade80`) is the fallback.

### New: `src/components/ui/radio-group.tsx`

shadcn radio group over `import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'`,
matching the import style of `slider.tsx` and `checkbox.tsx`. Radix supplies roving focus
and arrow-key navigation, so keyboard support is not hand-rolled.

### Modified: `src/components/explorer/AngleExplorer.tsx`

```ts
export type WaveMode = 'none' | WaveFn;
const DEFAULTS = { theta: 0, r: 1, beta: 0, wave: 'none' as WaveMode };
const [wave, setWave] = useState<WaveMode>(DEFAULTS.wave);
```

- `reset()` adds `setWave(DEFAULTS.wave)` — all four controls, not three.
- Radio group renders below the three sliders and above the `Convert` box: it is a display
  mode for the angle those sliders set. Options read `sin θ` / `cos θ` / `none`, never bare
  `sin` / `cos`.
- The group carries a **visible `Wave` heading** wired as its accessible name via
  `aria-labelledby`, matching how the `Convert` box already heads its two fields. Without it
  the three options announce with no indication of what they select.
- The strip renders between `angle-figure` and `angle-readout`, only when `wave !== 'none'`,
  carrying `data-testid="angle-wave"` and `data-testid="angle-wave-figure"`.
- The strip's caption reuses `coords.yLatex` (sin) or `coords.xLatex` (cos) — the fully
  written-out equation, already built by `buildCoordinateReadout`. No new formatter, and the
  strip's number cannot disagree with the coordinate box's.
- `buildAngleDiagramSvg` is called with `projection: wave === 'none' ? undefined : wave`.
- The existing debounced live region appends `waveSpoken(...)` when active, so a slider drag
  announces once on settle rather than on every frame.

### Modified: export path

`renderGraph` sets `target.innerHTML`, so it emits two sibling `<svg>` elements when a wave
is active. The export model also gains, only when active:

- a legend entry in `lightColors.wave` naming the function and what its height is;
- a `Wave` facts section — function, value, traced range.

**No new table row.** The table already carries `x = r·cos θ` and `y = r·sin θ`, so the
wave's value is present; adding it again would duplicate.

Sizing, when a wave is active: circle at 960 × 360, wave at 960 × 190, totalling within the
560 the template expects. With `none` selected the export is unchanged from today.

The export must **not** reuse the live strip's 512 × 176 viewBox at that slot. `meet`
scaling would fit to the height and render the wave only ~552 px wide, letterboxed inside a
960 px box. This is exactly why `width` / `height` are options on `WaveDiagramOptions`: the
export passes `{ width: 960, height: 190 }` and sets a matching viewBox, so the strip fills
its slot. The two call sites share the builder and its geometry, differing only in the box
they draw into — the same arrangement `buildAngleDiagramSvg` already uses via its `view` and
`unit` options.

### Modified: `src/pages/explorers/angles.astro`

One sentence of copy: picking `sin θ` or `cos θ` traces that wave as the angle sweeps, and
the highlighted leg in the circle is the wave's height.

## Testing

### Unit — `angle-wave.test.ts`

- `waveTickRadians` returns 17 entries at exact π/4 multiples, endpoints included.
- `waveTickLabel` spot-checks: k = −8 → `-2π`, k = −7 → `-7π/4`, k = 0 → `0`, k = 1 → `π/4`,
  k = 2 → `π/2`, k = 8 → `2π`.
- x-scale maps −2π to the left edge, 0 to the centre, 2π to the right edge.
- y-scale is independent of r: `yFor(0)` is the same pixel at r = 0.5 and r = 1.5.
- `wavePath` is `''` at θ = 0; its last point is left of centre for negative θ and right of
  centre for positive θ.
- Amplitude: `waveValue('sin', 90, 1.5)` is 1.5; the peak's y-pixel matches `yFor(1.5)`.
- Symmetry: `waveValue('sin', -θ, r) === -waveValue('sin', θ, r)` and
  `waveValue('cos', -θ, r) === waveValue('cos', θ, r)` across a sweep.
- At θ = 0: sin's marker sits at `yFor(0)`, cos's at `yFor(r)` — they differ.
- Domain sweep emits no `NaN` / `undefined` in the markup, matching the sweep discipline
  `angle-diagram.test.ts` already applies.

### Unit — `angle-diagram.test.ts` additions

- No `data-role="projection-leg"` unless `projection` is set.
- **Leg length equals `r·|sin θ|·unit` for `sin` and `r·|cos θ|·unit` for `cos`**, to
  floating tolerance, across a sweep of θ and r. The core invariant.
- Leg length is unchanged by β while its endpoints move — proving it rotates with the rigid
  body rather than being computed in the unrotated frame.
- Existing assertions pass unmodified.

### Unit — other

- `angle-readout.test.ts` — the moved `buildReadout` behaves identically for the cases the
  component's callers already exercise, plus the θ = 0 collapse and the `=` relation.
- `theme.test.ts` — `wave` clears 3:1 non-text contrast in both themes.
- `angle.test.ts` — the moved `formatFractionText` / `formatPiText`.

### E2E — new, `tests/e2e/angle.spec.ts`

- Default state is `none`, and `[data-testid="angle-wave"]` has count 0.
- Selecting `sin θ` reveals the strip; selecting `none` removes it.
- Arrow keys move between radio options (Radix roving focus).
- Dragging the angle slider lengthens the traced path's `d` attribute.
- At θ = 0, cos's marker is off the zero line where sin's is on it.
- Moving the radius slider changes the wave's amplitude.
- `Reset` returns the selector to `none` and removes the strip.

The strip carries its own `data-testid="angle-wave-figure"` for the reason `angle-figure`
already documents at the top of this file: a descendant `svg` selector is ambiguous once
KaTeX renders radicals as nested `<svg>` elements, and the caption renders exactly those.

### E2E — updates forced by the new default

Seven assertions across two files depend on 30°. The governing rule is **do not weaken an
assertion to accommodate the new default**:

| Test | Real subject | Action |
| --- | --- | --- |
| `renders the default angle with its exact radian form` | what the default is | move to 0° |
| `reset restores every control [G8]` | what reset restores | move to 0°, add the wave selector |
| `reset still works while a validation error is showing [G14]` | reset under error | move to 0° |
| `shows the exact unit-circle point at the default angle` | radical rendering | fill 30° first, keep `.sqrt` assertion |
| `labels the terminal point on the diagram itself` | `√3/2` in the SVG label | fill 30° first |
| `exports the current angle as a PNG artifact` | angle reaches the artifact | fill 30° first (bare `0` is a weak assertion) |
| `carries the terminal point into the exported artifact` | `√3/2`, `0.866` in the artifact | fill 30° first |

### E2E — export

An export taken with a wave active contains the `Wave` section and the wave's legend entry.

No visual-snapshot work: there is no `angle-explorer-approved.png` baseline, so the
Linux/Docker-only regeneration constraint does not apply here.

## Risks & Tradeoffs

- **The 17 π/4 labels are the tightest thing in this design.** Staggering onto two baselines
  is the mitigation; labelling only π/2 multiples is the retreat if stagger reads untidy in
  a browser.
- **No tie-line is a real, accepted cost** of the stacked layout. The projection leg and the
  shared marker colour carry the link instead. This needs a browser check at milestone 8
  before the work is called done — if it reads weakly, the only true fix is the
  side-by-side layout that was ruled out.
- **The `wave` hex may change.** It must clear 3:1 in both themes *and* be distinguishable
  from the initial-side blue. The contrast half is test-enforced; the distinguishability half
  needs eyes.
- **The exported circle shrinks** from 560 to 360 px when a wave is included, to keep the
  total within the template's 560. The alternative, a 760px total, risks overflowing the PDF
  page.
- **First load is quieter at 0°** than at 30°: no swept arc, no measure arrowhead, no
  radical anywhere. Consistent with `FunctionExplorer`, which ships with no default function
  at all, and with a wave selected it is the point — pick sin θ, then drag.
- **`buildReadout`'s extraction is a behaviour-preserving refactor with no test to preserve
  it** at the moment it moves, since it is currently untestable. Mitigated by extracting
  first and characterising it with tests *before* the θ = 0 change lands, so the two commits
  are separable and the fix is provably the only behavioural delta.
- **At θ = 0 the figure still draws a `1 rad` tick** — `tickAngles` emits the first tick
  unconditionally, a deliberate earlier decision so that a small angle still shows the radian
  scale. Left as-is: it marks the scale rather than claiming a measure.

## Out of Scope

- `tan θ`, or any function beyond sin and cos.
- Showing sin and cos simultaneously. The radio group is single-select by construction.
- Any self-playing animation, play/pause control, or replay button.
- A tie-line, which the stacked layout forecloses.
- Amplitude/period/phase controls. That is the Transformation Explorer's job.
- Degrees on the wave axis. The strip is labelled in exact π multiples only.

## References

- Plan: `docs/superpowers/plans/2026-07-29-angle-wave-projection.md`
- Extends: `docs/superpowers/plans/2026-07-23-angle-explorer.md`
- Extends: `docs/superpowers/specs/2026-07-27-unit-circle-coordinates-design.md`
- WCAG 2.1 SC 1.4.11 Non-text Contrast — https://www.w3.org/TR/WCAG21/#non-text-contrast
- WCAG 2.1 SC 2.2.2 Pause, Stop, Hide — https://www.w3.org/TR/WCAG21/#pause-stop-hide
  (satisfied vacuously: all motion is user-initiated)
