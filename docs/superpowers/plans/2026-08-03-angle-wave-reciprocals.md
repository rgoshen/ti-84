# Angle Explorer Reciprocal Waves — Implementation Plan

**Date:** 2026-08-03
**Branch:** `feature/angle-wave-reciprocals`
**Spec:** `docs/superpowers/specs/2026-08-03-angle-wave-reciprocals-design.md`
**Baseline:** 492 Vitest tests, 48 e2e, `astro check` clean

Strict TDD throughout: failing test first, minimum code to green, then refactor. Every task is
one commit with a `SUMMARY.md` entry written before it.

## Task order and dependencies

```text
T1 ──▶ T2 ──────────────▶ T7 ──▶ T8 ──▶ T9
                          ▲             └─▶ T10
T3 ──▶ T5 ──▶ T6 ─────────┘
T4 ────┘
```

T3 and T4 are independent of T1/T2 and may be done in any order relative to them.

---

## T1 — Drive the wave strip from a per-function spec table

`refactor(explorer): drive the wave strip from a per-function spec table`

**Files:** `src/scripts/explorer/angle-wave.ts`, `src/scripts/explorer/angle-wave.test.ts`

**Pure refactor. `WaveFn` does not change.** Behaviour is byte-identical; only call-site
arguments move.

1. Add `interface WaveSpec { domain; evaluate(theta, r); isUndefined(theta); stepDeg; noun; branches }`
   and `interface WaveBranches { centerDeg: 0 | 90; edgeDeg: number; ticks: readonly number[] }`.
   `branches: WaveBranches | null` — null for the two sinusoids, so destructuring narrows it and
   `branchPath` never carries a `!`.
2. Build `const WAVE_SPEC: Record<WaveFn, WaveSpec>` with the three existing rows only.
3. Rename `TAN_MAX` → `POLE_MAX` (7 sites across the two files). No alias.
4. Fold `STEP_DEG` / `TAN_STEP_DEG` into the table as `SINUSOID_STEP_DEG` / `POLE_STEP_DEG`.
5. `waveDomain` → `WAVE_SPEC[fn].domain`. Signature unchanged, so no call site moves.
6. `waveValue` → `spec.isUndefined(theta) ? null : spec.evaluate(theta, r)`. The if-chain and its
   `'sin'`/`'cos'` literals disappear.
7. `tanPath` → `branchPath(spec, branches, theta, r, dir, scales)`, with
   `center = centerDeg + k * 180` and `spec.evaluate(deg, r)` in place of `Math.tan(rad)`. The
   `kMin`/`kMax` bounds shift by `centerDeg`. Reversal handling unchanged.
8. `wavePath` dispatches on `branches !== null`. The `waveValue(fn, at, r)!` non-null assertion
   in the sinusoid loop becomes `spec.evaluate(at, r)` — the `!` and its justifying comment both
   go away.
9. `waveSpoken`'s `noun` reads from the table.
10. `waveAsymptoteRadians()` gains a **required** `fn` argument; add
    `waveAsymptoteTicks(fn): readonly number[]` returning the same fact in tick space. Both
    return `[]` for sin/cos.

**Tests:** existing 61 in `angle-wave.test.ts` must pass with only these edits — `TAN_MAX` →
`POLE_MAX`, and `waveAsymptoteRadians()` → `waveAsymptoteRadians('tan')` at `:216`, `:426`,
`:436`. Add one new test: `waveAsymptoteTicks('tan')` is `[-6, -2, 2, 6]` and
`waveAsymptoteTicks('sin')` is `[]`.

**Green when:** `npx vitest run src/scripts/explorer/angle-wave.test.ts`, then `npm test` (492).

---

## T2 — Make every WaveFn dispatch exhaustive

`refactor(explorer): make every WaveFn dispatch exhaustive`

**Files:** `angle-wave.ts`, `angle-diagram.ts`, `AngleExplorer.tsx`

**The correctness commit.** Output stays byte-identical; afterwards, adding a `WaveFn` member is
a compile error in five places.

1. `buildWaveSvg`'s gridline guard `:312` → `asymptoteTicks.has(k)`, from a `Set` hoisted above
   the ticks map. Delete the hardcoded `fn === 'tan' && (k === -6 || …)`.
2. The asymptote block `:344` drops its `fn === 'tan' ? … : ''` wrapper — `waveAsymptoteRadians`
   already returns `[]` for sin/cos, so a plain `.map().join('')` is equivalent.
3. Suppress the solid y-axis `:387` when `asymptoteTicks.has(0)`. **Inert for all three current
   functions** — none has an asymptote at tick 0 — but in place for T7.
4. `angle-diagram.ts`: extract `cap(v)` from the existing `cappedTan` expression; replace the
   `projectionMarkup` if-chain with `Record<PoleFn, {solid, dashed}>` holding tan's row only.
   Keep sin/cos on the existing `projection-leg` path. **Emit the dashed extension before the
   solid segment**, matching today's order exactly.
5. `AngleExplorer.tsx`: add `WAVE_LEGEND` and `WAVE_FUNCTION_FACT` as `Record<WaveFn, string>`
   consts beside `DEFAULTS:50`, seeded with the three current strings verbatim. Point `:277` and
   `:318` at them; the export's `'tan θ = y/x'` literal moves into the table.

**Tests:** no new assertions. Every existing unit and e2e test must pass **untouched** — that is
the proof the refactor moved nothing. If any test needs editing, the refactor changed behaviour
and is wrong.

**Green when:** `npm test` (492), `npx astro check` (0 errors),
`npx playwright test tests/e2e/angle.spec.ts tests/e2e/angle-export.spec.ts`.

---

## T3 — Add isCotangentUndefined

`feat(explorer): add isCotangentUndefined for the sine-zero poles`

**Files:** `src/scripts/explorer/angle.ts`, `angle.test.ts`

Pure function directly below `isTangentUndefined:71`, documented as its deliberate pair. No
consumers yet — same shape as `e216351`, which shipped `exactTangent` one commit ahead of its
caller.

```ts
const m = Math.abs(deg) % 180;
return m < 1e-6 || 180 - m < 1e-6;
```

**Tests (red first):** new `describe('isCotangentUndefined')` —
- true at `0, 180, -180, 360, -360, 540`
- false at `90, -90, 270, 1, 179`
- true at hand-typed near-multiples `179.9999999`, `-0.0000001`, `360.0000001` — **this is the
  test the one-sided modulo fails**
- disjointness: no degree in a −360…360 step-1 sweep satisfies both predicates

---

## T4 — Widen ExactValue with a numerator coefficient

`feat(explorer): widen ExactValue with a numerator coefficient`

**Files:** `src/scripts/explorer/unit-circle.ts`, `unit-circle.test.ts`

1. `ExactValue` gains `numerator: 1 | 2`, **required**.
2. Add it to the seven consts at `:35-41`, all as `1`.
3. `formatExactLatex:162` / `Text:172` / `Spoken:184` — each `radicand === 1` arm gains a
   numerator case. Every `numerator === 1` path must emit **byte-identical** output.
4. `exactToNumber:194` → `(v.sign * v.numerator * Math.sqrt(v.radicand)) / v.denominator`.
5. `isRational` in `angle-coordinates.ts:59` is **deliberately untouched**.

**Tests:** every existing `toEqual({sign…})` literal gains `numerator: 1` (~20 sites); all
formatter assertions stay green. New `describe('formatters — numerator 2')`:
`{1,2,3,3}` → `\frac{2\sqrt{3}}{3}` / `2√3/3` / `2 times square root of 3 over 3`;
`{1,2,1,1}` → `2` / `2` / `2`. Plus a test asserting `isRational({1,2,1,1})` is true — the field
most likely to be "helpfully" updated during the widening.

---

## T5 — Derive the three reciprocal exact values

`feat(explorer): derive exactSecant/exactCosecant/exactCotangent by reciprocal`

**Files:** `unit-circle.ts`, `unit-circle.test.ts`. Depends on T3 and T4.

Private `reciprocal(v)` — `1/(s·n·√rad/d) = s·d·√rad/(n·rad)`, reduced by `gcd`. Callers must
exclude `sign === 0`; each names its own pole first:

- `exactSecant` — `'undefined'` at `isTangentUndefined`, else `reciprocal(exactCoordinates(deg).x)`
- `exactCosecant` — `'undefined'` at `isCotangentUndefined`, else `reciprocal(…y)`
- `exactCotangent` — `'undefined'` at `isCotangentUndefined`, **`ZERO` at `isTangentUndefined`**
  (tan's pole is cot's zero), else `reciprocal(exactTangent(deg))`

**Tests (red first):** one describe per function, mirroring `exactTangent`'s at `:112`:
- agrees with `1/Math.cos` / `1/Math.sin` / `1/Math.tan` at every chart angle away from its poles
- `'undefined'` at its own poles and their normalised equivalents
- `cot 90° = 0` and `cot 270° = 0`; `sec 0° = 1`; `csc 90° = 1`
- `sec 30° = {sign:1, numerator:2, radicand:3, denominator:3}`; `sec 60° = {1,2,1,1}`;
  `csc 45° = {1,1,2,1}`
- **quadrant signs: `sec 210° < 0`, `csc 210° < 0`, `cot 210° > 0`**
- `null` at 37° and 30.5°; `exactSecant(390) === exactSecant(30)`
- `'undefined'` for near-pole decimals `exactSecant(89.9999999)`, `exactCosecant(0.0000001)`
- **field-union sweep**: 16 chart angles × 6 functions, every field inside its union. This prices
  the two casts inside `reciprocal`.

---

## T6 — Add the sec/csc/cot coordinate readouts

`feat(explorer): add the sec/csc/cot coordinate readouts`

**Files:** `src/scripts/explorer/angle-coordinates.ts`, `angle-coordinates.test.ts`. Depends on T5.

`tanEquation:112` → `ratioEquation`, driven by a `RATIO` table of `{chainLatex, chainText,
fnLatex, fnText}`. tan's row reproduces `:120-121` **verbatim**. Six new flat fields on
`CoordinateReadout`. `waveLatex`/`waveText` are deferred to T7 — they need the widened union.

**Tests:** the existing `describe('buildCoordinateReadout — tan')` at `:151-201` must stay green
**verbatim** — that is the proof the generalisation did not move tangent. New describe, one `it`
per row of tan's block:
- exact chain at 30°, both alphabets
- r-independence: `buildCoordinateReadout(30, 0.5).secLatex === buildCoordinateReadout(30, 1.5).secLatex`, ×3
- `=` vs `≈`: `sec 60°` is exactly 2, so `= 2` with no `\approx`
- undefined in both alphabets: sec at 90°, csc/cot at 0° and 180°
- named fallback at 37°: `… = \sec 37^\circ \approx 1.2521`
- `cot 90°` states `0` once, not `0 = 0`

---

## T7 — Trace sec/csc/cot and draw their constructions

`feat(explorer): trace sec/csc/cot in the strip and draw their constructions`

**Files:** `angle-wave.ts`, `angle-diagram.ts`, `angle-coordinates.ts` + their three test files.
Depends on T2 and T6.

**Turn-it-on.** Widening `WaveFn` makes the compiler demand every row T2/T5/T6 pre-built.

1. `WaveFn` gains `'sec' | 'csc' | 'cot'`.
2. Three `WAVE_SPEC` rows per the spec's math table.
3. `WAVE_DISPLAY_NAME` / `WAVE_SPOKEN_FN_NAME` gain their entries.
4. The y-axis suppression added in T2 now actually fires, for csc and cot.
5. `angle-diagram.ts`: add `anchorB` / `meetC` and the three `POLE_MARK` rows.
6. `angle-coordinates.ts`: add `waveLatex` / `waveText` as `Record<WaveFn, string>`.

**Tests (red first):** write these as `for (const fn of [...] as const)` loops so a future pole
function costs one array entry.

`angle-wave.test.ts`:
- `waveAsymptoteTicks`: sec `[-6,-2,2,6]`; csc/cot `[-8,-4,0,4,8]`
- every asymptote lands exactly on a `waveTickRadians()` member; **plus** a definition-derived
  cross-check that `|1/cos|` or `|1/sin|` there exceeds 1e12
- **cross-family**: `waveValue('csc',0,1)` null but `waveValue('sec',0,1)` is 1;
  `waveValue('sec',90,1)` null but `waveValue('csc',90,1)` is 1
- `|sec|, |csc| ≥ 1` wherever defined; r-independence over a θ sweep
- no subpath spans an asymptote; the break lands at the exact edge angle (14.478° csc,
  14.036° cot, 75.522° sec)
- csc/cot draw nothing until θ passes the branch edge: `wavePath('cot',10,…) === ''`,
  `wavePath('cot',20,…) !== ''`
- no NaN and no `Infinity` across θ ∈ [−360,360]; every vertex inside the viewBox
- `buildWaveSvg`: sec draws **4** asymptotes, csc/cot draw **5**
- **collision A+B**: per tick, `not.toContain('<line x1="${x}" y1="${top}"')` **and**
  `toContain('>${waveTickLabel(k)}</text>')`. Note the `y1` is load-bearing — at `k = ±8`,
  `x = 8` and the horizontal zero-axis also begins `<line x1="8" y1=`
- **positive control**: `sin`'s svg still contains `<line x1="${x0}" y1="${top}"`
- every `wave-asymptote` x is within `0…WAVE_WIDTH`
- marker suppressed at θ=0 for csc/cot, present for sec at `yFor(1)`

`angle-diagram.test.ts`: the existing tangent block at `:504-624` stays green **verbatim**. New
block: length = `|fn θ|·unit` across θ × β × r; r-independence; β-invariance; the endpoint stays
on its tangent line when clamped (`meetC.y === anchorB.y` at β=0); `sec` at 89° gives
`|O→T| === maxDist` exactly; no NaN at θ=0 with `projection: 'cot'`; `cot` at 90° is zero-length
with a round cap; cross-contamination — `projection: 'sec'` emits no `projection-leg` and no
`tangent-segment`.

`angle-coordinates.test.ts`: `waveLatex.sin === yLatex`, `waveLatex.cos === xLatex`,
`waveLatex.tan === tanLatex`, and so on per key — **the regression test for "a new fn silently
falls into the tan branch"**. Plus: every `waveLatex` value renders through `renderMathHtml`
without returning null, pinning KaTeX's `\sec`/`\csc`/`\cot` support.

---

## T8 — Offer sec/csc/cot in the wave selector

`feat(explorer): offer sec/csc/cot in the wave selector`

**Files:** `AngleExplorer.tsx` only.

Radio array gains three options in DOM order `none, sin, csc, cos, sec, tan, cot`;
`className="grid grid-cols-2 gap-x-4 gap-y-2"` on the `RadioGroup` and `col-span-2` on the `none`
row. Fill in `WAVE_LEGEND` / `WAVE_FUNCTION_FACT` copy for the three new keys. Caption reads
`coords.waveLatex[waveFn]`; `coordHtml` drops its `tan` key.

---

## T9 / T10 — e2e coverage

`test(explorer): cover sec/csc/cot in the angle e2e suite`
`test(explorer): cover sec/csc/cot in the export e2e suite`

`tests/e2e/angle.spec.ts`:
- **replace** `'the tan option is reachable by keyboard from cos'` (`:407`) with one test walking
  all seven options in DOM order — 6 × ArrowDown with `{delay: 50}` for Radix roving focus. Better
  coverage than the single hop, and it catches an accidental reorder.
- sec reveals 4 asymptotes; csc and cot reveal 5 (the existing `toHaveCount(4)` at `:420` is a
  tan-only fact and stays as such)
- **csc and cot read undefined at the default 0°, with the asymptotes still drawn** — no
  `wave-marker`, no `wave-curve`, caption contains "undefined", 5 `wave-asymptote`
- the radius slider does not move any of the three curves
- sweeping past an asymptote breaks csc into ≥ 2 subpaths
- each new `data-role` appears in the circle; switching tan → sec swaps the mark rather than
  adding one

`tests/e2e/angle-export.spec.ts`: extend `:107` into a loop over the three — the artifact carries
the Wave section, the function fact string, `Traced`, and `undefined` at each function's own pole.
The existing tan case stays untouched.

---

## Verification

```bash
npx vitest run src/scripts/explorer/angle-wave.test.ts   # substitute the task's own test file, red first
npm test                                                 # 492 baseline, must grow
npx astro check                                          # 0 errors
npx playwright test tests/e2e/angle.spec.ts tests/e2e/angle-export.spec.ts
npm run test:e2e:visual                                  # no Angle baseline; green-stays-green
```

Manual pass on `/explorers/angles` in **both themes** (`colors.wall` is `#e24b4a` light,
`#f87171` dark — the asymptotes must read as asymptotes in each):

1. Select each of sec, csc, cot; confirm asymptote count and position against the spec's table.
2. Drag **angle** through a pole for each; the curve must break, never bridge.
3. Drag **radius** with each selected; no curve may move.
4. Drag **position β**; the construction rotates rigidly and segment length does not change.
5. Confirm csc/cot at the default 0° show the undefined caption with asymptotes drawn.
6. Export with each selected; check the legend row, the Function fact, and `undefined` at a pole.

Shut down the dev server as soon as the browser pass finishes.

## Status

Complete. All 10 tasks landed as separate commits on `feature/angle-wave-reciprocals`
(PR #33), plus one addendum fixing an intro-copy gap found during manual verification.
579 unit tests pass (up from the 492 baseline), 62 e2e tests pass (up from 48), `astro
check` is clean. Manually verified in both themes: asymptote counts and colours, curve
breaking through every pole, radius-slider invariance, position-slider rigid rotation,
and csc/cot's undefined state at the default 0° angle.
