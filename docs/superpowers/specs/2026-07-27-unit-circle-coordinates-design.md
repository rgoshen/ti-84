# Unit Circle Coordinates — Design

**Date:** 2026-07-27
**Status:** Approved
**Branch:** `feature/unit-circle-coordinates`

## Objective

The Angle Explorer teaches that θ is one quantity wearing several costumes — degrees,
a fraction of a turn, an exact π multiple, a decimal radian. It stops short of the
fact that makes the unit circle worth memorising: **where the terminal side lands.**

This feature adds the terminal point `(x, y)` to the explorer in the three-part form
the standard unit-circle reference chart uses — degrees, radian measure, and exact
coordinates — so that moving the radius or angle slider shows not just *how far
around* but *where*.

Reference layout: the conventional 16-angle unit-circle chart, where each spoke is
labelled `30° — π/6 — (√3/2, 1/2)`.

## Requirements

1. The terminal point is displayed continuously — its values update on every angle and
   radius change, not only on radius movement. Moving the position slider β carries the
   on-diagram label along with the dot but does not change the reported values, since
   coordinates are measured from θ (see Decisions).
2. Coordinates appear in three forms: exact radical (`√3/2`), decimal (`0.8660`), and
   alongside the angle's radian measure, matching the reference chart's spoke layout.
3. Exact radicals are shown only where they exist. Non-special angles fall back to
   decimals with no fabricated exact form.
4. A compact `(x, y)` label is pinned beside the terminal-side dot on the diagram.
5. The exported PNG/PDF reports the same coordinates the screen shows.

## Decisions

| Question | Decision | Rationale |
|---|---|---|
| Exact form when `r ≠ 1` | Show `r × unit-circle value`, e.g. `1.2 × √3/2` | The unit circle is the reference and `r` merely scales it — which is precisely what the radius slider exists to demonstrate. A fully reduced `(3√3)/5` is exact but hides that relationship. |
| Placement | Both: diagram label + readout breakdown | The chart's teaching value comes from coordinates sitting *at* the point; the readout carries the worked equations there is no room for on the figure. |
| β (position slider) | Coordinates measured from θ alone | β is a viewing rotation, not a change to the angle being measured. Arc length already ignores β; coordinates stay consistent with that. Using `β + θ` would mean exact radicals vanish the moment β moves. |
| Third form | Chart-style triple line (`30° π/6 (√3/2, 1/2)`) | Reproduces the reference chart's layout, where the angle and its point read as a single fact. |
| Exact coverage | The chart's 16 angles — multiples of 30° and 45°, including quadrantals | Values reduce to `0, ±1/2, ±√2/2, ±√3/2, ±1`: a small, exhaustively testable set. Multiples of 15° would add `(√6 ± √2)/4`, past what the reference chart teaches. |
| Export | Facts block, table rows, and diagram label | Keeps the exported sheet a faithful record of the screen. |

## Architecture

### New module: `src/scripts/explorer/unit-circle.ts`

Pure and DOM-free, unit-testable in the node environment, following the established
pattern of `angle.ts` and `angle-render.ts`.

Every exact coordinate on the chart is one of five magnitudes — `0, 1/2, √2/2, √3/2, 1`
— so a single value type covers all of them:

```ts
/** An exact unit-circle coordinate: (sign · √radicand) / denominator. */
export interface ExactValue {
  sign: -1 | 0 | 1;
  radicand: 1 | 2 | 3;   // 1 means "no radical"
  denominator: 1 | 2;
}
```

The module stores **only the first quadrant** (0°, 30°, 45°, 60°, 90°) and derives the
remaining twelve angles by reference angle plus quadrant sign — the same rule the
chart teaches:

| Quadrant | Range | Reference angle | sign x | sign y |
|---|---|---|---|---|
| I | 0–90 | θ | + | + |
| II | 90–180 | 180 − θ | − | + |
| III | 180–270 | θ − 180 | − | − |
| IV | 270–360 | 360 − θ | + | − |

Boundary behaviour is a consequence of the rule, not a special case: 180° yields
reference 0° with quadrant II signs, giving `(−1, 0)`; 270° yields reference 90° with
quadrant III signs, giving `(0, −1)`. A zero magnitude is immune to sign so `−0` never
appears.

**Public API**

| Export | Returns | Notes |
|---|---|---|
| `exactCoordinates(deg)` | `{ x: ExactValue; y: ExactValue } \| null` | `null` for non-integer degrees and for integers that are not multiples of 30° or 45°. Normalises negatives and values past 360° first. |
| `formatExactLatex(v)` | `string` | `0`, `\frac{1}{2}`, `\frac{\sqrt{3}}{2}`, `-1` |
| `formatExactText(v)` | `string` | `0`, `1/2`, `√3/2`, `-1` — plain text for SVG and export |
| `formatExactSpoken(v)` | `string` | `0`, `1 over 2`, `negative square root of 3 over 2` |
| `exactToNumber(v)` | `number` | Verification helper; lets tests cross-check the table against `Math.cos`/`Math.sin` |

This mirrors the latex/text/spoken trio `angle.ts` already establishes for π multiples,
so the three output channels (KaTeX readout, plain-text export, screen-reader live
region) each get a formatter and none has to strip markup from another's output.

**Non-integer gate.** `exactCoordinates` reuses `isIntegerDegrees` from `angle.ts` and
rounds before lookup, for the reason documented there: a radian-typed `pi/3` arrives as
`59.99999999999999`, and any exact treatment of a raw float is meaningless.

### Modified: `src/scripts/explorer/angle-diagram.ts`

A coordinate label pinned beside the terminal dot. Because this builder is the single
source of truth for both the live figure and the export artifact, the label appears in
the exported PNG/PDF without additional work.

**Placement algorithm** — deterministic and clamped, so no input can push the label
out of the 320-unit viewBox:

1. Anchor at `r·unit + 14px` radially outward from the terminal dot.
2. `text-anchor` is `start` when the dot is right of centre, `end` when left, so the
   text grows away from the figure.
3. If the label would overflow the viewBox — reachable only at large `r` — flip to
   `r·unit − 14px` (inward) and swap the anchor. At `r = 1.5, θ = 0°` the label lands
   inside the circle rather than clipping off the right edge.
4. Clamp `y` into `[12, view − 6]`.

Overflow is tested against a reserved label width constant rather than measured text,
since the builder is a pure string function with no access to font metrics. The
reserved width is sized for the widest label the feature can produce.

The inward flip cannot collide with the angle-measure arc: the arc sits at `0.3·unit`
(26.4px) from centre, and the flip only triggers at radii large enough that the inward
anchor is far outside it.

**Label content**

- `r = 1` and a special angle → the exact pair, `(√3/2, 1/2)`.
- Otherwise → two-decimal coordinates, `(1.04, 0.60)`.

The scaled form `1.2 × (√3/2, 1/2)` is too wide for a point label; it belongs in the
readout, where there is room for it.

**β and the label.** The label sits at the drawn dot (`β + θ`) but reports coordinates
measured from θ. A note under the diagram states this: *"β rotates the view;
coordinates are measured from θ."*

### New module: `src/scripts/explorer/angle-coordinates.ts`

Where `unit-circle.ts` answers *what is the exact point*, this module answers *how
should it read*. It composes `unit-circle.ts` with the existing `angle.ts` and
`angle-parse.ts` into every display string the readout needs: the chart-style triple
line, the worked equations, the narrow SVG label, plain export text, and
screen-reader prose.

It exists as a module rather than as functions inside the React component because the
feature's real branching lives here — dropping a `1 ×` prefix on the unit circle,
falling back from a radical to a named `cos 37°`, choosing `=` over `≈` when the
decimal is exact, and stating a whole coordinate once instead of writing `0 = 0`.
The project's test runner uses the node environment with no jsdom and collects `.ts`
files only, so logic inside a `.tsx` component is unreachable by unit tests. Placing
it here makes all of it testable and leaves the component with nothing to do but
render.

**Public API:** `buildCoordinateReadout(theta: number, r: number): CoordinateReadout`,
returning `tripleLatex`, `xLatex`, `yLatex`, `spoken`, `labelText`, `pairText`,
`xText`, and `yText`.

### Modified: `src/components/explorer/AngleExplorer.tsx`

A coordinates block below the existing conversion chain:

```
   30°     π/6     (√3/2, 1/2)

   x = r·cos θ = 1.2 × √3/2 ≈ 1.0392
   y = r·sin θ = 1.2 × 1/2  = 0.6
```

- When `r = 1`, the `1 ×` prefix is dropped: `x = r·cos θ = √3/2 ≈ 0.866`. A literal
  `1 ×` is noise.
- Non-special angle: the triple line reads `37° — 0.6458 rad — (0.7986, 0.6018)` and
  the equations become `x = r·cos θ = 1 × cos 37° ≈ 0.7986`. No fabricated radicals.
- Fractions render through KaTeX as stacked fractions, so `1.2 × √3/2` is
  unambiguous — the equation is written out concretely with real numbers rather than
  left as a bare `x = r cos θ`.
- The existing `readout.spoken` string gains a coordinate sentence, so the change
  reaches the screen-reader live region through the channel already built for it.

### Modified: export snapshot

- `Circle` facts block gains `Point (x, y)`.
- The Representations table gains `x = r·cos θ` and `y = r·sin θ` rows, taking it to
  seven rows — within the `MAX_EXPORT_TABLE_ROWS = 9` cap.
- The diagram label arrives via the shared builder.

There is no `angle-explorer` entry in `tests/e2e/__snapshots__/export-visual.spec.ts/`
— that suite covers only graphing-calculator, function-explorer, and
transformation-explorer — so this change requires no PNG baseline regeneration.

## Testing

Strict TDD, red before green. The implementation plan fixes the task sequence; this
section states what must be covered:

1. **`unit-circle.test.ts`** — all 16 angles cross-checked against `Math.cos`/`Math.sin`
   within epsilon via `exactToNumber`; negative and past-360° inputs normalise
   (`−330°` ≡ `30°`, `390°` ≡ `30°`); non-special integers and non-integer degrees both
   return `null`; each formatter covers zero, unit, radical, and negative cases;
   `−0` never appears in any output.
2. **`angle-diagram.test.ts`** — the label is present in the markup; its anchor stays
   inside the viewBox across the full `r × θ` extremes; the anchor flips inward and the
   `text-anchor` swaps at the overflow boundary; the label shows the exact pair at
   `r = 1` on a special angle and decimals otherwise.
3. **`angle-coordinates.test.ts`** — the `1 ×` prefix is dropped at `r = 1`; a
   non-special angle produces `cos 37°` rather than a radical; `=` is used for rational
   values and `≈` only where a radical forces rounding; a whole coordinate is stated
   once rather than as `0 = 0`; the label folds `-0.00` to `0.00`; the spoken string
   carries no latex markup.

   The readout strings are tested here rather than through the component because
   `vitest.config.ts` runs in the node environment, collects `src/**/*.{test,spec}.ts`
   only, and the project has no jsdom or `@testing-library`. `AngleExplorer.tsx` uses
   `useState`, `useEffect`, and `document`, so the `renderToStaticMarkup` pattern used
   for stateless components (`src/components/FunctionDetailsPanels.test.ts`) does not
   apply to it. Its verification is a type-check plus Playwright.
4. **`tests/e2e/angle.spec.ts`** — the coordinates block renders and updates when the
   radius slider moves.
5. **`tests/e2e/angle-export.spec.ts`** — the new fact and table rows appear in the
   exported artifact.

Coverage on changed code must stay at or above 80%.

## Risks & Tradeoffs

**Reference-angle derivation over a literal table.** Deriving twelve angles from five
risks a sign error that a hand-written table would not. Mitigated by cross-checking
every angle against `Math.cos`/`Math.sin` in tests. The benefit is that the code
encodes the same reasoning the student is learning, and the quadrant rule stays in one
place instead of being smeared across sixteen literals.

**Label collision.** The diagram already draws whole-radian tick labels at `r + 0.22`
units. A coordinate label at `r·unit + 14px` can visually crowd a tick when one falls
near the terminal side. Accepted: the tick labels are small and grey, the coordinate
label is the foreground fact, and adding true collision avoidance would require text
metrics a pure string builder does not have.

**β reporting mismatch.** When `β ≠ 0` the label sits at the drawn dot but reports
θ-based coordinates. This is intentional — the alternative kills exact radicals for
every non-zero β — and is disclosed in the note under the diagram.

**Reserved label width.** Overflow detection uses a constant rather than measured text.
If the label content ever grows past the reserved width, it could clip at extreme radii.
Sized with headroom for the widest label the feature produces.

## Out of Scope

- Multiples of 15° and their `(√6 ± √2)/4` coordinates.
- A full static 16-angle reference chart alongside the interactive figure.
- Naming tangent, secant, cosecant, or cotangent.

## References

- TODO.md: Feature — Unit Circle Coordinates
- Existing spec: `docs/superpowers/specs/2026-07-11-concrete-equation-readout-design.md`
- Existing plan: `docs/superpowers/plans/2026-07-23-angle-explorer.md`
