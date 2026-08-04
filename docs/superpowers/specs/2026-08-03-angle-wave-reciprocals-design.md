# Angle Explorer Reciprocal Waves — Design

**Date:** 2026-08-03
**Status:** Approved
**Branch:** `feature/angle-wave-reciprocals`
**Extends:** `docs/superpowers/specs/2026-08-02-angle-wave-tangent-design.md`

## Objective

The Angle Explorer's `Wave` selector offers **none · sin θ · cos θ · tan θ**. This adds the
three reciprocal functions — **sec θ · csc θ · cot θ** — at full parity with tangent: traced
curve, vertical asymptotes, unit-circle construction, exact values, r-cancellation caption,
export, and screen-reader prose.

None of the three exist anywhere in the codebase today.

The 2026-08-02 tangent design solved three problems — unbounded range, undefined values, and
radius independence — and all three carry over unchanged. What is genuinely new here is that
**csc and cot break where sin = 0**, not where cos = 0. That single fact drives most of this
document.

## Verified before designing

Read directly rather than assumed. Each of these changes the design:

| Question | Answer | Source |
| --- | --- | --- |
| Where do the reciprocals break? | sec dies with tan (cos = 0, at ±π/2 and ±3π/2). **csc and cot die where sin = 0** — at `0`, `±π`, `±2π`. | derivation |
| How many asymptotes are in view? | tan and sec: **4**. csc and cot: **5** — the extra one is at radians 0. | the strip spans −2π…2π |
| Is `waveAsymptoteRadians` parameterised by function? | **No.** It takes no arguments and hardcodes tan's four. 4 call sites total (1 production, 3 test). | `angle-wave.ts:115`, grep |
| Is the asymptote tick list stored once? | **No.** `angle-wave.ts:116` and the gridline guard at `:312` are independent hardcodings of the same fact. | read |
| What sits at radians 0 in the strip today? | A solid full-height slate y-axis, `stroke-width="1"`. csc/cot's fifth asymptote lands exactly on it. | `angle-wave.ts:387-388` |
| Are the ±2π asymptotes inside the viewBox? | **Yes.** `x = 8` and `x = 504`; a 1.5px stroke spans 7.25–8.75 and 503.25–504.75, inside the 512 box. | `PAD.left = 8`, `WAVE_WIDTH = 512` |
| Can `ExactValue` express sec/csc's chart values? | **No.** `{sign, radicand, denominator}` has no numerator coefficient, so `2` and `2√3/3` are unrepresentable. `√2`, `√3`, `√3/3` and cot's whole table already fit. | `unit-circle.ts:24-28` |
| Do the exact formatters branch on `radicand`? | Yes — each has a `radicand === 1 ? '1' : …` arm. Adding a numerator means editing that arm in all three. | `unit-circle.ts:162,172,184` |
| Is `isRational` affected by the widening? | **No.** `v.radicand === 1` still decides `=` vs `≈`, because numerator and denominator are integers. | `angle-coordinates.ts:59` |
| What is θ's default? | **0** — which is an asymptote for csc and cot. Selecting either from a fresh page lands on the undefined case. | `AngleExplorer.tsx:51` |
| How does the component pick wave copy? | Three ternary chains with **tan as the `else` branch**. A new function silently renders as tan, and the build stays green. | `AngleExplorer.tsx:277,318,594` |
| Is `CoordinateReadout.tanText` used in production? | **No** — only `angle-coordinates.test.ts` reads it. The export uses a hand-written `'tan θ = y/x'` literal instead. | grep across `src/` |
| Does the diagram's tan clamp already bound the secant? | **Yes.** `capMax` was derived so `OT² = unit² + TE² ≤ maxDist²`. `sec θ` *is* `OT`. | `angle-diagram.ts:356-373` |
| Does KaTeX render `\sec`, `\csc`, `\cot`? | Yes, all three. | KaTeX built-in macros |
| Is there a PNG visual baseline for this explorer? | Still no. No baseline regeneration required. | `tests/e2e/__snapshots__/` |

Two rows are load-bearing. The **tan-as-else ternaries** mean the riskiest part of this feature
is existing code, not new math — widening `WaveFn` without touching them ships `sec` labelled
"tan θ — height is the tangent segment". And the **y-axis at radians 0** reproduces exactly the
defect commit `31c8126` fixed for gridlines: slate showing through red's dashes interleaves two
colours along one line.

## The math

With domain half-height `M = 4`:

| fn | asymptote radians | π/4 tick indices | branch centres | visible half-width |
| --- | --- | --- | --- | --- |
| tan | ±π/2, ±3π/2 | ±2, ±6 | `k·180°` | `atan(4)` = 75.964° |
| sec | ±π/2, ±3π/2 | ±2, ±6 | `k·180°` | `acos(¼)` = 75.522° |
| csc | 0, ±π, ±2π | 0, ±4, ±8 | `90° + k·180°` | `acos(¼)` = 75.522° |
| cot | 0, ±π, ±2π | 0, ±4, ±8 | `90° + k·180°` | `atan(4)` = 75.964° |

`90° − asin(1/M) ≡ acos(1/M)` and `90° − atan(1/M) ≡ atan(M)`, so the "distance from the centre
to where the curve leaves the box" has one closed form per pair. Because `|sec| ≥ 1` and
`|csc| ≥ 1`, nothing is ever drawn between the strip's ±1 reference lines for those two.

## Requirements

1. The `Wave` radio group gains `sec θ`, `csc θ`, `cot θ`. The four existing options are
   unchanged in label and behaviour.
2. Each new function traces from 0 out to the current θ, driven by the angle slider exactly as
   the four existing ones are. No self-playing motion.
3. Vertical asymptotes are drawn at each function's own poles — four for sec, five for csc and
   cot — and the traced curve **breaks** at each rather than joining across it.
4. No vertex is drawn outside the viewBox, and no subpath spans an asymptote.
5. At its poles each function is **undefined**: no marker, no drop-line, and the caption and
   screen-reader text both say so.
6. The circle highlights the classical construction segment whose length equals the strip's
   plotted height, preserving the leg-equals-height invariant sin/cos established.
7. The caption shows the r-cancellation explicitly. All three new functions are ratios, so the
   radius slider cannot move any of their curves — that must be taught, not hidden.
8. Adding a member to `WaveFn` must be a **compile error** at every place that branches on it,
   never a silent fall-through to tan.
9. The export carries each new wave with the fidelity it already carries sin, cos, and tan.

## Decisions

| Decision | Chosen | Rejected, and why |
| --- | --- | --- |
| Unit-circle mark | **The full classical construction.** With the tangent line at A = (1,0) and the terminal ray meeting it at T: `tan θ = A→T` (exists), `sec θ = O→T`. With the tangent line at B = (0,1) and the ray meeting it at C: `cot θ = B→C`, `csc θ = O→C`. | *Reuse the reciprocal's mark* (sec highlights the cos leg): at θ = 60°, sec θ = 2 while the highlighted leg is 0.5 — the figure would show the reciprocal, not the value, breaking the leg-equals-height invariant. *No mark at all*: the one option that does not mirror tangent. |
| Clamping the new marks | **Reuse `capMax` unchanged.** `sec` needs no new clamping — `capMax` was derived precisely to bound `OT`. The B-side reuses the identical formula because O-B-C is the same right triangle with the same `OB = unit`. | Deriving a second cap. There is only one right triangle here, seen twice. |
| Exact values for sec/csc | **Widen `ExactValue` with `numerator: 1 \| 2`**, required not optional. | *Decimals only*: the reference chart teaches `sec 30° = 2√3/3`; printing 1.1547 abandons the chart this module exists to mirror. *Unsimplified reciprocal* (`1/(√3/2)`): honest but not the form a student's textbook shows. *Optional field with `?? 1`*: a new construction site could silently omit it. |
| How the new exact values are produced | **Derived through one `reciprocal(v)` helper**, from `exactCoordinates` and `exactTangent`. | Three literal `FIRST_QUADRANT_*` tables. Each would need its quadrant rule re-derived by hand — three fresh chances to get Q3 wrong, where cos and sin are both negative so sec and csc are negative but **cot is positive**. Derivation inherits the sign rules from already-tested code, and states the content: `sec 60° = 2` *because* `cos 60° = 1/2`. |
| y-domain for the new three | **±4, shared with tan** (`TAN_MAX` renamed `POLE_MAX`). | A per-function domain. Switching between tan and cot would rescale the box, making two curves that share a shape look unrelated. |
| csc/cot at the default θ = 0 | **Render undefined** — no curve, no marker, caption says so. The five asymptotes still draw, so the strip shows where csc breaks rather than nothing. | *Nudging θ* off the asymptote: inverts the module's stated contract that θ is the single source of truth everything derives from. *Ghosting the untraced curve*: new visual vocabulary that sin/cos/tan would then also want — scope past this feature. |
| Circle mark at a pole | **Keep drawing it clamped**, for all four pole functions. | Suppressing it. `angle-diagram.ts:363` already establishes that a clamped segment carries no endpoint dot precisely so it reads as "runs off past here". Suppressing for csc/cot only would give the four pole functions two rules with nothing to explain the difference; suppressing for all four changes tan's tested behaviour at 90°. |
| Dispatch shape | **Exhaustive `Record<WaveFn, …>` everywhere**, landed as a refactor *before* the union widens. | Extending the ternary chains. Tan-as-else means a new function renders as tan with a green build. |
| Selector layout | **Two columns, reciprocal pairs per row**: `none` spanning both, then `sin\|csc`, `cos\|sec`, `tan\|cot`. | *One column*: ~200px in a sidebar already holding three sliders and two bordered groups. *Column-major* (`none\|sec`, `sin\|csc`, `cos\|cot`, `tan`): avoids e2e keyboard churn but puts "none" beside "sec" and leaves the reciprocal pairs diagonal. The pairing is what this explorer teaches, so the layout should state it. |
| New theme colour | **None.** Reuse `colors.wave` for the marks and `colors.wall` for the asymptotes. | A per-function hue. Every `ExplorerColors` slot is already claimed by an export legend row, and `theme.test.ts`'s `MARK_KEYS` contrast budget is spent. Tangent established this constraint. |

## Architecture

### `angle-wave.ts` — one spec table replaces six identity tests

Function identity is currently tested in six places: `waveDomain:42`, `waveValue:105`,
`wavePath:212`, `waveSpoken:243`, the gridline guard `:312`, and the asymptote block `:344`.
These collapse into a single `Record<WaveFn, WaveSpec>` carrying `domain`, `evaluate`,
`isUndefined`, `stepDeg`, `noun`, and `branches: {centerDeg, edgeDeg, ticks} | null` — where
`null` means "a sinusoid: one polyline, no poles, no asymptote marks".

`tanPath:147` generalises to `branchPath`, the same branch-interval algorithm with
`center = centerDeg + k·180` and `spec.evaluate` in place of `Math.tan`. The negative-θ
reversal is unchanged.

`waveAsymptoteRadians` gains a **required** `fn` argument, and a sibling `waveAsymptoteTicks(fn)`
returns the same fact in tick space so the gridline guard and the asymptote drawing read from
one list instead of two hardcodings that can disagree. Required rather than defaulted, because
an optional parameter falling back to tan is the exact failure mode requirement 8 forbids —
making the 4 call sites compile errors is the forcing function.

`TAN_MAX` becomes `POLE_MAX`. A constant named `TAN_MAX` consumed by `csc` is a lie, and every
site is inside a file this work already edits. No alias is kept.

Two collision fixes in `buildWaveSvg`: the gridline guard becomes a `Set` membership test, and
the solid y-axis at `:387` is suppressed when the selected function has an asymptote at tick 0.
Nothing is lost — the asymptote is drawn at the same x, full height, in a mark that says more.
The ±2π edge asymptotes need no fix; the horizontal zero-axis and unit references terminate at
those x-positions, meeting them at a point rather than along a line.

### `angle.ts` — the second pole predicate

`isCotangentUndefined(deg)` joins `isTangentUndefined:71` as a deliberate pair: tan and sec die
where cos = 0 (odd multiples of 90°), cot and csc die where sin = 0 (multiples of 180°). Same
1e-6 tolerance, same reasoning. The modulo test must be two-sided —
`Math.abs(179.9999999) % 180` is `179.9999999`, not `~0`.

### `unit-circle.ts` — widen, then derive

`ExactValue` gains `numerator: 1 | 2`; 2 is the only coefficient this chart produces, so a 3 is
a type error. All three formatters and `exactToNumber` are updated, with every `numerator === 1`
branch emitting byte-identical output to today.

`reciprocal(v)` computes `1/(s·n·√rad/d) = s·d·√rad/(n·rad)`, reduced. `exactSecant`,
`exactCosecant`, and `exactCotangent` name their own pole first, then delegate. Two boundary
cases the helper cannot see: `exactCotangent` returns `ZERO` at tan's poles (tan's pole is cot's
zero) and `'undefined'` at sin's zeros.

### `angle-coordinates.ts` — generalise `tanEquation`

`tanEquation:112` becomes `ratioEquation`, driven by a table of chain strings. tan's row
reproduces `:120-121` verbatim so its six existing assertions stay green untouched.

```
sec θ = r/x = r/(r cos θ) = 1/cos θ
csc θ = r/y = r/(r sin θ) = 1/sin θ
cot θ = x/y = (r cos θ)/(r sin θ) = cos θ/sin θ
```

The three new chains carry a third step where tan's has two. For tan, `(r sin θ)/(r cos θ)`
already names sin and cos on both sides and the reader is done. For sec, `r/(r cos θ)` shows the
cancellation but never names the identity `sec = 1/cos`, which is the entire reason sec has a
name. Different content, not gratuitous asymmetry — and it means tan's pinned strings never move.

`CoordinateReadout` gains the six flat `*Latex`/`*Text` fields plus
`waveLatex: Record<WaveFn, string>` and `waveText`, mapping each function to the equation the
strip should caption (`sin → yLatex`, `cos → xLatex`, the four ratios → their own). Keying by
`WaveFn` puts exhaustiveness in the module that owns the equations, and kills the component's
caption ternary.

### `angle-diagram.ts` — the B-side of the construction

Two anchors, two meet points, one shared clamp:

```
anchorA = unit at β            (1,0)     meetT = anchorA + tan θ · unit at β+90°
anchorB = unit at β+90°        (0,1)     meetC = anchorB + cot θ · unit at β
```

`|A→T| = |tan θ|·unit`, `|O→T| = |sec θ|·unit`, `|B→C| = |cot θ|·unit`, `|O→C| = |csc θ|·unit`.
`1/Math.tan(0)` is `Infinity`, and `Math.sign(Infinity) · capMax` is finite, so no NaN reaches
the markup.

The `projectionMarkup` if-chain becomes a `Record<PoleFn, {solid, dashed}>`, with sin/cos
staying on the existing `projection-leg` path. tan's row must reproduce today's markup
byte-for-byte, including emitting the extension before the segment.

The dashed guide differs by role, deliberately: for the **leg** functions (tan, cot) it is the
terminal ray extended, showing how the meet point is found; for the **hypotenuse** functions
(sec, csc) it is the leg, closing the right triangle and showing why the hypotenuse has that
length. A `terminalDot→T` guide for sec would be collinear with the solid mark and invisible
except when clamped.

### `AngleExplorer.tsx` — kill three tan-as-else ternaries

The legend row, the "Function" fact, and the caption become module-scope `Record<WaveFn, string>`
consts beside `DEFAULTS`. A missing key is a type error; there is no `else` left to fall into.
`coordHtml` drops its now-unused `tan` key, and the export's hand-written `'tan θ = y/x'` literal
is replaced by the table, retiring the dead `tanText` path.

## Testing

Per-file, mirroring the existing describe-block structure. The tests that carry weight:

- **A new function silently rendering as tan** — `waveLatex.sec === secLatex` asserted per key,
  at the layer where the mapping now lives.
- **An asymptote at the wrong x** — every `waveAsymptoteRadians(fn)` value lands exactly on a
  member of `waveTickRadians()`, plus a cross-check derived from the definition rather than the
  literal list: `|1/cos|` or `|1/sin|` there exceeds 1e12.
- **The y-axis showing through the red dash at 0** —
  `expect(svg).not.toContain('<line x1="${x}" y1="${top}"')`. One string covers both the gridline
  and the y-axis, since both emit that prefix. The `y1` is load-bearing: at `k = ±8`, `x = 8` and
  the horizontal zero-axis also begins `<line x1="8" y1=`. Paired with a positive control on
  `sin`, which must still draw its y-axis.
- **A subpath spanning an asymptote**, generalised over each function's own poles.
- **Cross-family pole confusion** — `waveValue('csc', 0, 1)` is null but `waveValue('sec', 0, 1)`
  is 1; `waveValue('sec', 90, 1)` is null but `waveValue('csc', 90, 1)` is 1.
- **Quadrant signs** — `sec 210° < 0`, `csc 210° < 0`, **`cot 210° > 0`**. This is the assertion
  that would catch a hand-written sign table.
- **Field unions hold** — all 16 chart angles × 6 functions, asserting each field stays inside its
  union. This prices the two casts inside `reciprocal`.
- **r-independence** of all three, in `waveValue`, `wavePath`, the caption, and the diagram
  segment length.
- **No NaN and no `Infinity`** across θ ∈ [−360, 360], in both the strip and the diagram.
- **Existing tan blocks stay green verbatim** — `angle-diagram.test.ts:504-624` and
  `angle-coordinates.test.ts:151-201` are the proof the generalisation did not move tangent.

e2e: sec draws 4 asymptotes, csc and cot draw 5 — the existing `toHaveCount(4)` at
`angle.spec.ts:420` is a tan-only fact. The single-hop keyboard test at `:407` is replaced by one
walking all seven options in DOM order, which is better coverage than the hop it replaces and
catches an accidental reorder.

## Risks & Tradeoffs

- **The selector's arrow-key order changes** from `none→sin→cos→tan` to
  `none→sin→csc→cos→sec→tan→cot`, because Radix roving focus follows DOM order. Accepted: the
  keyboard test needed updating for the new options regardless, and the paired layout is what
  makes six functions legible in a sidebar.
- **`ExactValue` is a shared type**, so widening it touches the coordinate readout and the SVG
  point label as well as the new functions. Mitigated by making the field required — every
  construction site becomes a compile error until reviewed — and by holding all three formatters
  to byte-identical output at `numerator: 1`.
- **csc and cot land on their undefined case by default**, since θ starts at 0. Accepted per the
  decision above: the asymptotes still draw, so the first thing on screen is where the function
  breaks, which is the lesson.
- **The circle mark at a pole draws in an arbitrary direction**, because `1/Math.tan(0)` is
  `+Infinity` rather than signed. tan has this today at 90° (`Math.tan(π/2)` is a large positive
  float). Accepted for parity; no endpoint dot is drawn, so no specific value is asserted.
- **Two `as` casts inside `reciprocal`.** The reduced result provably lands back inside the field
  unions for all five first-quadrant magnitudes, and the domain-sweep test holds it there.

## Out of Scope

- Any change to `sin`/`cos` behaviour, styling, or copy.
- A ghost/untraced curve for any function.
- A PNG visual baseline for the Angle Explorer.
- Reciprocal identities beyond the three functions (e.g. a Pythagorean-identity readout).
- Exact values for angles off the 16-point chart — unchanged `null` behaviour.

## References

- `docs/superpowers/specs/2026-08-02-angle-wave-tangent-design.md` — the design this extends
- `docs/superpowers/plans/2026-08-03-angle-wave-asymptote-legibility.md` — the ink-coverage
  rationale for `colors.wall` / `1.5` / `6 6`
- `docs/superpowers/specs/2026-07-29-angle-wave-projection-design.md` — the leg-equals-height
  invariant and `AMP_MAX`
- `docs/superpowers/specs/2026-07-27-unit-circle-coordinates-design.md` — `ExactValue`'s origin
- Plan: `docs/superpowers/plans/2026-08-03-angle-wave-reciprocals.md`
