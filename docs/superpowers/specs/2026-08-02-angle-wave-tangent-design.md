# Angle Explorer Tangent Wave — Design

**Date:** 2026-08-02
**Status:** Approved
**Branch:** `feature/angle-wave-tangent`
**Extends:** `docs/superpowers/specs/2026-07-29-angle-wave-projection-design.md`

## Objective

The Angle Explorer's `Wave` selector offers **none · sin θ · cos θ**. This adds a fourth
option, **tan θ**, keeping the three that exist.

The 2026-07-29 design listed `tan θ` under *Out of Scope*. This document reverses that
decision deliberately, which means the three reasons it was excluded are exactly the three
decisions made here: tangent is unbounded, tangent is undefined at ±90°/±270°, and tangent
is independent of the radius.

## Verified before designing

Read directly rather than assumed. Each of these changes the design:

| Question | Answer | Source |
| --- | --- | --- |
| Does the radius scale tangent? | **No.** `tan θ = (r sin θ)/(r cos θ)` — r cancels. The radius slider cannot move the tan curve. | derivation; contrast `angle-wave.ts:89-92` |
| Is the strip's y-domain adjustable? | No — `AMP_MAX = 1.5` is a module constant baked into `waveScales`. | `angle-wave.ts:34,65` |
| Who else consumes `AMP_MAX` / `waveScales`? | Only `angle-wave.ts` itself and `angle-wave.test.ts`. No component or export call site passes a domain. | grep across `src/`, `tests/` |
| Can `ExactValue` express `√3/3`? | Not yet — `denominator: 1 \| 2`. But `radicand: 1 \| 2 \| 3` already covers `√3`. | `unit-circle.ts:24-28` |
| Do the exact formatters branch on `denominator === 2`? | **No.** All three interpolate the value generically, so widening the union needs zero formatter changes. | `unit-circle.ts:110-140` |
| Does `exactCoordinates` ever emit denominator 3? | No — its five first-quadrant magnitudes are `0`, `1/2`, `√2/2`, `√3/2`, `1`. | `unit-circle.ts:45-51` |
| What does the diagram's `projection` option currently do? | Computes one shared foot point and draws `terminalDot → foot` (sin) or `origin → foot` (cos). | `angle-diagram.ts:340-362` |
| Diagram geometry constants? | `view` 320, `unit` 88, `c = view/2 = 160`, plus an existing viewBox keep-out margin. | `angle-diagram.ts:126,213-215` |
| Is there a PNG visual baseline for this explorer? | Still no — `export-visual.spec.ts` has no `angle-explorer` baseline. | `tests/e2e/__snapshots__/` |

The r-cancellation row is load-bearing. It means the radius slider will appear inert while
tan is selected, and that is *correct behaviour* — so the design has to teach it rather than
hide it.

## Requirements

1. The `Wave` radio group gains a fourth option, `tan θ`. `none`, `sin θ`, `cos θ` are
   unchanged in label, order, and behaviour.
2. With `tan θ` selected, the strip shows the tangent curve traced from 0 out to the current
   θ, driven by the angle slider exactly as sin and cos already are. No self-playing motion.
3. Vertical asymptotes at ±π/2 and ±3π/2 are drawn, and the traced curve **breaks** at each
   one rather than joining across it.
4. The curve is clipped to the visible y-domain. No vertex is ever drawn outside the viewBox.
5. At ±90° and ±270° the value is **undefined**: no marker, no drop-line, and the caption and
   screen-reader text both say so.
6. The circle highlights the **tangent segment** whose length equals the strip's plotted
   height, preserving the leg-equals-height invariant the sin/cos design established.
7. The caption shows the r-cancellation explicitly, so the radius slider's non-effect on the
   curve is explained rather than mysterious.
8. `Reset` restores the selector to `none` — already true, no change required.
9. The export carries a tan wave with the same fidelity it carries sin and cos.

## Decisions

| Decision | Chosen | Rejected, and why |
| --- | --- | --- |
| y-domain for tan | **±4**, tan only; sin/cos keep ±1.5 | Sharing ±1.5 hides the curve from 56° to 90° — a 34° dead zone per quarter-sweep, right where tangent's behaviour is the whole lesson. ±4 shrinks that to 14°. Clamping the value to the domain edge was rejected outright: a flat top asserts a horizontal asymptote that does not exist. |
| Radius handling | Plot `tan θ`, unscaled | `r·tan θ` would keep the radius slider "working" and keep every function on one story, but it is not what `tan θ` means. This project has already once rejected showing two numbers for one quantity; inventing an r-dependence tangent does not have is the same error. |
| Circle highlight | Tangent segment on the **unit** circle at `x = 1` | Highlighting both legs as opposite ÷ adjacent always fits and never clips, but no single length then equals the plotted height, so the spec's unit-tested invariant dies and the tie to the strip weakens. Drawing nothing gives up on the circle explaining the strip at exactly the function where the link is least obvious. The tangent segment also shows literally why the function carries that name. |
| Segment anchor | `x = 1` (unit circle), not `x = r` | At `x = r` the segment length is `r·tan θ`, which is not the plotted height. The dashed unit circle is already drawn in this figure, so the anchor is a line the student can already see. |
| Clipping method | Geometric clamp in the builder | An SVG `clipPath` needs an `id`, and ids collide between the live figure and the export snapshot — the component already carries `useId` for exactly this hazard. A math clamp is pure, id-free, and unit-testable. |
| Undefined value | `waveValue` returns `number \| null` | `NaN` propagates silently into markup, and the suite already asserts no `NaN` reaches the DOM. A union makes the compiler force all three call sites to handle the asymptote. |
| Caption | Full cancellation chain | A compact `tan θ = y/x = √3/3` is shorter but leaves the inert radius slider unexplained. Decimal-only avoids the type change entirely but makes tan the only function in the explorer with no exact form, dropping `√3/3` and `√3` — the two values a trig course drills hardest. |
| Exact tan storage | Widen `denominator` to `1 \| 2 \| 3` | A separate parallel type for tangent would duplicate three formatters, and duplicated formatters are how the axis and the readout drift into expressing one quantity two ways. |
| New theme colour | None — reuse `colors.wave` | Tangent is a wave-selector mode like the other two; a distinct hue would imply it belongs to a different family and would add a WCAG contrast entry for no gain. |

### Why ±4 specifically

`tan θ` reaches the domain edge at `atan(domain)`. At ±1.5 that is 56.3°, hiding 33.7° of
each quarter-sweep. At ±4 it is 76.0°, hiding 14.0°. Beyond ±4 the returns shrink fast
(±8 hides 7.1°) while the near-zero region — where the curve's gentle start distinguishes it
from sin — compresses toward invisibility. ±4 also keeps the `±1` dashed reference lines at a
readable fraction of the box, so `tan 45° = 1` still visibly lands on the dashed line.

## Architecture

### Modified: `src/scripts/explorer/angle-wave.ts`

```ts
export type WaveFn = 'sin' | 'cos' | 'tan';   // WaveMode unchanged: 'none' | WaveFn

export const AMP_MAX = 1.5;                    // sin, cos — unchanged
export const TAN_MAX = 4;                      // tan
export function waveDomain(fn: WaveFn): number;
export function waveScales(width?, height?, domain?: number): WaveScales;
```

`waveScales` gains a third parameter defaulting to `AMP_MAX`, so every existing call site is
byte-identical. The y-scale's `AMP_MAX` literals become the parameter.

**The domain is derived, never passed.** `buildWaveSvg` and `wavePath` each call
`waveDomain(fn)` internally rather than accepting a domain argument, so a caller cannot pair
the wrong domain with a function. `WaveDiagramOptions` therefore gains **no** new field, and
the component and export call sites change only in the `fn` they already pass.

#### `waveValue(fn, theta, r): number | null`

For tan, returns `Math.tan(rad)` and **ignores `r`**. Returns `null` at ±90°/±270°.

The undefined test is on **degrees**, not on the radian value: `Math.tan(Math.PI / 2)` is
`1.633e16`, not `Infinity`, so a magnitude test on the result is a threshold guess. θ arrives
from a degree slider and is already rounded to 4 decimals elsewhere, so `|θ| mod 180 === 90`
is exact and honest.

#### Asymptotes

```ts
export function waveAsymptoteRadians(): number[];   // -3π/2, -π/2, π/2, 3π/2
```

Drawn as dashed verticals in `colors.axis`, emitted only when `fn === 'tan'`. These are the
odd-`k`-over-2 members of the tick set `waveTickRadians()` already produces (`k = ±2, ±6`), so
they land exactly on existing gridlines rather than near them.

#### `wavePath` for tan

One rule handles the discontinuity and the clipping together:

> A subpath ends the moment the value leaves the y-domain, and the next subpath begins where
> it re-enters.

The break point is computed **exactly**, not interpolated. `|tan θ| = domain` at reference
angle `atan(domain)`, so each subpath terminates precisely on the box edge instead of at the
last whole sample. Linear interpolation was rejected: tangent's curvature near the asymptote
makes a straight chord between samples measurably wrong.

Sampling tightens from `STEP_DEG = 2` to `1` for tan only — at 2° the value jumps ~0.5 units
per step near the edge, which reads as visible faceting.

Without this rule, a single polyline paints a full-height vertical stripe at each asymptote:
a line that looks like geometry but is pure sampling artifact.

#### Marker, drop-line, spoken text

Marker and drop-line are **suppressed** when the value is `null` or outside the domain. This
is a deliberate exception to the sin/cos rule that the marker draws unconditionally — there
the marker at θ = 0 is the only thing distinguishing cos from sin, but here a marker pinned to
the box edge would assert a value that was clipped away.

`waveSpoken` says "Tangent **curve**", not "wave" — tangent is not a sinusoid, and the
existing spell-it-out rationale (a screen reader pronounces "tan" as the English word)
applies equally.

```
Tangent curve traced from 0 to 90 degrees. tangent of theta is undefined.
```

### Modified: `src/scripts/explorer/unit-circle.ts`

`denominator` widens from `1 | 2` to `1 | 2 | 3`. Verified above: all three formatters
interpolate the value generically, so `√3/3` renders correctly through
`formatExactLatex` / `formatExactText` / `formatExactSpoken` with **no formatter changes**.

```ts
export function exactTangent(deg: number): ExactValue | 'undefined' | null;
```

Three states, and they are genuinely distinct: `null` means "not a chart angle, no exact form
exists" (the meaning `exactCoordinates` already gives it), `'undefined'` means the asymptote.

Built from a five-entry first-quadrant map plus the quadrant sign rule — the module's existing
"five entries and a rule, not sixteen literals" style — and cross-checked against `Math.tan`
the way `exactCoordinates` is cross-checked against `Math.cos`/`Math.sin`.

| θ | 0° | 30° | 45° | 60° | 90° |
| --- | --- | --- | --- | --- | --- |
| tan | `0` | `√3/3` | `1` | `√3` | `undefined` |

Sign rule: positive in Q1 and Q3, negative in Q2 and Q4.

### Modified: `src/scripts/explorer/angle-coordinates.ts`

`CoordinateReadout` gains `tanLatex`, `tanText`, `tanSpoken`, beside the existing
`xLatex`/`yLatex`. Keeping them in one builder is what stops the strip's number and the
coordinate box's numbers from disagreeing.

```
tan θ = y/x = (r sin θ)/(r cos θ) = √3/3 ≈ 0.5774
tan θ = y/x = (r sin θ)/(r cos θ) = 1                    (θ = 45°, exact → "=")
tan θ = y/x = (r sin θ)/(r cos θ)  —  undefined          (θ = ±90°, ±270°)
```

The `(r sin θ)/(r cos θ)` term is the whole point of the chain: it is where the reader sees
the r cancel, which answers the question the inert radius slider raises.

The `=` versus `≈` choice reuses the existing `isRational` rule — `tan 45° = 1` takes `=`,
`√3/3 ≈ 0.5774` takes `≈`.

### Modified: `src/scripts/explorer/angle-diagram.ts`

The existing `projection?: WaveFn` option gains a third branch. The first two share a foot
point; tangent does not, so it is a sibling branch rather than a variation.

**Geometry.** The tangent point `T` is on the **unit** circle in the β-rotated frame:
`polarToCartesian(c, c, 1 * unit, betaRad)` — note `1 * unit`, not `r * unit`.

The endpoint `E` is the terminal ray extended to `|sec θ| * unit`, because the point at
distance `sec θ` along the terminal direction *is* the point `(1, tan θ)` in the initial-side
frame. So `E` needs no new trigonometry and rotates with β for free, exactly like every other
element in this figure.

For Q2 and Q3, `sec θ < 0`, and `polarToCartesian` with a negative radius places `E` on the
**opposite** ray. That is correct, not a bug: the tangent line at `(1, 0)` is met by the
backward extension of the terminal line in those quadrants.

**Elements.**

| Mark | Style | Notes |
| --- | --- | --- |
| `data-role="tangent-segment"` | Solid, `colors.wave`, width 2.5, `stroke-linecap="round"` | `T → E`. Round cap for the same reason the sin/cos legs carry it: a zero-length segment at θ = 0 must render as a visible zero, not as nothing. |
| `data-role="tangent-extension"` | Dashed, `colors.wave`, width 1 | `terminalDot → E`, drawn beneath the segment. In Q2/Q3 this straight line passes through the origin and is exactly the bidirectional terminal line. |

**Clamping.** `|tan θ|` is capped so `E` stays inside the module's existing viewBox keep-out
margin. A clamped segment draws **no endpoint dot**, so it never asserts a value it was
truncated out of.

**Invariant.** Segment length `=== |tan θ| * unit` when unclamped, for any β and any r — the
same equality the sin and cos legs already carry, and the reason option 6 was chosen.

### Modified: `src/components/explorer/AngleExplorer.tsx`

- Radio gains `{ value: 'tan', label: 'tan θ' }` as a fourth entry.
- The strip's `aria-label` and `waveSpoken`'s display name route through a shared
  `{ sin: 'sine', cos: 'cosine', tan: 'tangent' }` map rather than the current inline ternary,
  which does not extend to three.
- Caption selects `coordHtml.tan` when `waveFn === 'tan'`.
- The `buildWaveSvg` call is **unchanged** — it derives the domain from `fn` itself.
- viewBox stays 512 × 176 — the domain change lives inside the scale, not the box.
- `reset()` is unchanged.

### Modified: export path

- Legend entry names tangent, in `lightColors.wave`, as sin and cos already do.
- The `Wave` facts section reads `tan θ = y/x`, with the value as a decimal or the literal
  `undefined`.
- Strip stays 960 × 190, passed as `width`/`height` for the reason the existing design
  documents: reusing the 512 × 176 viewBox would letterbox the strip to ~552 px inside a
  960 px slot.
- **No new table row** — same reasoning as before.

### Modified: `src/pages/explorers/angles.astro`

One sentence: picking `tan θ` traces the tangent curve, the highlighted segment on the dashed
unit circle is the curve's height, and the dashed verticals are the asymptotes where tangent
is undefined.

## Testing

### Unit — `unit-circle.test.ts`

- `exactTangent` cross-checked against `Math.tan` at all sixteen chart angles.
- `exactTangent` returns `'undefined'` at 90°, 270°, −90°, −270°, and `null` at a non-chart
  angle such as 20°.
- Sign is positive in Q1/Q3, negative in Q2/Q4.
- `formatExactLatex` / `formatExactText` / `formatExactSpoken` render denominator 3
  correctly: `\frac{\sqrt{3}}{3}`, `√3/3`, `square root of 3 over 3`.
- **`exactCoordinates` never emits `denominator: 3`**, swept across every chart angle. This is
  what makes the type widening provably non-invasive.

### Unit — `angle-wave.test.ts`

- `waveDomain` returns 1.5 for sin and cos, 4 for tan.
- `waveScales` with an explicit domain: `yFor(0)` is unchanged, `yFor(domain)` is the top edge.
  Existing no-argument calls produce identical pixels.
- **`waveValue('tan', θ, 0.5) === waveValue('tan', θ, 1.5)`** across a θ sweep — the
  r-cancellation, as an assertion rather than a claim.
- `waveValue('tan', ±90, r)` and `(±270, r)` are `null`; `waveValue('tan', 45, r)` is 1.
- `waveAsymptoteRadians` returns exactly the four odd π/2 multiples, and each equals a member
  of `waveTickRadians()`.
- `wavePath('tan', …)` emits more than one subpath once `|θ| > atan(4)`.
- **No subpath spans an asymptote** — for every subpath, all vertices lie strictly on one side
  of every asymptote x-position. This is the assertion that kills the vertical-stripe artifact.
- Every vertex is inside the viewBox at both domains, across a θ and r sweep.
- Subpath endpoints land on the domain edge to floating tolerance — proving exact break
  computation, not interpolation.
- Asymptote lines appear only for tan; sin and cos markup is byte-identical to today's.
- Marker and drop-line absent at ±90°, and absent when `|tan θ|` exceeds the domain.
- Domain sweep emits no `NaN` / `undefined` / `null` text in the markup.

### Unit — `angle-diagram.test.ts`

- No `data-role="tangent-segment"` unless `projection === 'tan'`.
- **Segment length `=== |tan θ| * unit`** to floating tolerance, across a θ and r sweep, while
  unclamped. The core invariant.
- Segment length is unchanged by β while its endpoints move.
- Segment length is unchanged by r — the same cancellation, now in the figure.
- Near 90°, no drawn point escapes the viewBox keep-out margin.
- Existing sin/cos projection assertions pass unmodified.

### Unit — `angle-coordinates.test.ts`

- `tanLatex` at 30° contains the cancellation term and `\frac{\sqrt{3}}{3}`.
- `tan 45°` uses `=`, not `≈`.
- ±90° and ±270° produce the undefined form in all three of latex, text, and spoken.

### E2E — `tests/e2e/angle.spec.ts`

- The `tan θ` option exists and is reachable by arrow key from `cos θ` (Radix roving focus).
- Selecting it reveals the strip and renders the asymptote lines.
- **Dragging the radius slider leaves the tan curve's `d` unchanged, but changes sin's** — the
  cancellation, observable in the browser.
- At 90° the caption reads undefined and no marker element is present.
- Dragging the angle slider past 90° produces a `d` with more than one `M` command.
- `Reset` returns the selector to `none` and removes the strip.

### E2E — export

An export taken with tan active contains the `Wave` section and the tangent legend entry.

No visual-snapshot work: there is still no `angle-explorer` PNG baseline, so the
Linux/Docker-only regeneration constraint does not apply.

## Risks & Tradeoffs

- **Switching sin ↔ tan rescales the box** (±1.5 ↔ ±4), so the same pixel height means a
  different value depending on the selection. Accepted: the group is single-select, so two
  functions are never on screen together to be miscompared, and the `±1` dashed lines stay put
  as a constant reference in both domains.
- **The radius slider will look broken while tan is selected.** It moves the circle and the
  terminal point but not the curve. The caption's cancellation chain is the mitigation; whether
  it actually reads that way needs a browser check before this is called done.
- **Widening `denominator` touches a type on the coordinate path.** Mitigated by the sweep test
  asserting `exactCoordinates` never emits a 3, plus the formatters being verified generic
  rather than assumed so.
- **A clamped tangent segment near 90° could be misread as a real value.** No endpoint dot is
  the mitigation. If it still reads wrong in a browser, the fallback is fading the segment
  toward the clamp.
- **1° sampling for tan quadruples the vertex count** versus 2° over a full sweep (≈360 versus
  ≈180). Negligible for SVG, but it is a real change to the "at most 180 vertices" claim the
  previous design made, and that claim's wording needs updating rather than silently breaking.
- **`tan` under a control labelled "Wave" is a small misnomer** — tangent is periodic but not a
  sinusoid. Renaming the group was rejected as churn that would touch the existing e2e
  selectors and page copy for a cosmetic gain; `waveSpoken` says "curve" for tan, which puts
  the correction where a reader actually encounters it.

## Out of Scope

- `sec`, `csc`, `cot`, or any function beyond sin, cos, and tan.
- Showing two functions simultaneously. The radio group stays single-select.
- Any self-playing animation, play/pause, or replay.
- A tie-line between circle and strip, which the stacked layout still forecloses.
- Amplitude/period/phase controls. That remains the Transformation Explorer's job.
- Degrees on the wave axis. The strip stays labelled in exact π multiples.
- Renaming the `Wave` control group.

## References

- Extends: `docs/superpowers/specs/2026-07-29-angle-wave-projection-design.md`
- Extends: `docs/superpowers/specs/2026-07-27-unit-circle-coordinates-design.md`
- WCAG 2.1 SC 1.4.11 Non-text Contrast — https://www.w3.org/TR/WCAG21/#non-text-contrast
- WCAG 2.1 SC 2.2.2 Pause, Stop, Hide — https://www.w3.org/TR/WCAG21/#pause-stop-hide
  (satisfied vacuously: all motion is user-initiated)
