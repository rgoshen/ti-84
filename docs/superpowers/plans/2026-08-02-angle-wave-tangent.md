# Angle Explorer Tangent Wave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `tan θ` as a fourth option in the Angle Explorer's `Wave` selector (`none · sin θ · cos θ · tan θ`), keeping the existing three unchanged, with its own y-domain, asymptote breaks, a tangent-segment highlight in the circle, and an r-cancellation caption.

**Architecture:** `angle-wave.ts` gains a per-function y-domain (`waveDomain`), a nullable `waveValue` (undefined at the asymptotes), and a tangent-specific path builder that traces the curve as multiple exact-break subpaths rather than one polyline — because tan is unbounded and periodic, unlike sin/cos. `angle-diagram.ts`'s existing `projection` option gains a third branch that draws a tangent segment anchored on the unit circle, geometrically clamped so it never leaves the viewBox. `unit-circle.ts` widens `ExactValue.denominator` to admit `√3/3`, and `angle-coordinates.ts` composes a caption that shows the `r` cancelling out of the ratio. Every new call site is additive — no existing sin/cos code path changes its output.

**Tech Stack:** Astro 7 + React 19 (`client:only="react"`), TypeScript, `radix-ui` 1.6.0 umbrella primitives, Tailwind 4, KaTeX 0.17 for readouts, Vitest (node environment) for unit tests, Playwright for e2e.

## Global Constraints

Every task's requirements implicitly include this section.

- **Strict TDD.** Red → green → refactor. Write the failing test, run it and see it fail for the expected reason, then implement.
- **Unit tests run in the node environment only.** `vitest.config.ts` sets `environment: 'node'` and `include: ['src/**/*.{test,spec}.ts']`. There is no jsdom. Logic that needs a unit test must live in a `.ts` module under `src/scripts/**`.
- **Pure builders are DOM-free by construction.** String concatenation only. No `document`, no `createElementNS`.
- **No new dependencies.** Everything needed is already installed.
- **No new `WaveDiagramOptions` field.** `buildWaveSvg` and `wavePath` derive the y-domain from `fn` internally via `waveDomain(fn)`. Every existing call site (component, export) passes only `fn` and is otherwise unchanged.
- **`waveValue` returns `number | null`.** `null` only at tan's asymptotes (±90°, ±270° and their equivalents). Every call site must handle it — this is deliberate, so the compiler catches a forgotten case rather than a `NaN` reaching markup.
- **No new theme colour.** Tangent reuses `colors.wave`, the same colour sin/cos already use.
- **Exact-π text uses an ASCII hyphen.** `formatPiText` emits `-7π/4`, never `−7π/4` (U+2212). Unrelated to this feature but do not regress it.
- **Non-text graphical marks must clear 3:1 contrast** against `themeColors(dark).bg` in *both* themes (WCAG 2.1 SC 1.4.11). `theme.test.ts` already covers `colors.wave`; reusing it needs no new test.
- **Playwright locator rules for this codebase.** Radix puts `role="slider"` on the thumb while the id and `aria-label` sit on the root, so target `#slider-<id> [role="slider"]`. Never use a descendant `svg` selector inside a container that renders KaTeX — radicals become nested `<svg>` elements; the wave figure already has its own `data-testid="angle-wave-figure"` for this reason.
- **Conventional Commits.** `feat:`, `fix:`, `refactor:`, `test:`, `docs:`. **No co-author or AI-generation trailers.**
- **Append a `SUMMARY.md` entry before every commit**, using the format already in that file (`## [YYYY-MM-DD HH:MM] Commit Summary` with Change Type / Scope / Summary / Rationale / References).
- **Branch:** `feature/angle-wave-tangent`, already created. No direct commits to `main`.
- **Commands:** unit `npx vitest run <path>`; full unit suite `npm test`; e2e `npx playwright test <path>`; typecheck `npx astro check`.

---

## File Structure

| File | Responsibility | Task |
| --- | --- | --- |
| `src/scripts/explorer/angle-wave.ts` | `WaveFn` widens to include `'tan'`; `waveDomain`, `TAN_MAX`; `waveScales` gains a domain param; `waveValue` returns `number \| null`; `waveAsymptoteRadians` | 1 |
| `src/scripts/explorer/angle-wave.ts` | `wavePath`'s tan branch — the exact-break-point subpath builder | 2 |
| `src/scripts/explorer/angle-wave.ts` | `buildWaveSvg` (asymptote lines, marker/drop suppression, domain-aware scale) and `waveSpoken` tan phrasing | 3 |
| `src/scripts/explorer/unit-circle.ts` | `ExactValue.denominator` widens to `1 \| 2 \| 3`; new `exactTangent` | 4 |
| `src/scripts/explorer/angle-coordinates.ts` | `CoordinateReadout` gains `tanLatex` / `tanText`, the r-cancellation chain | 5 |
| `src/scripts/explorer/angle-diagram.ts` | `projection` option's tangent-segment branch, geometrically clamped | 6 |
| `src/components/explorer/AngleExplorer.tsx` | Radio option, `coordHtml.tan`, shared display-name map, export legend/facts | 7 |
| `src/pages/explorers/angles.astro` | One paragraph of page copy | 7 |
| `tests/e2e/angle.spec.ts` | Behavioural e2e coverage for tan | 8 |
| `tests/e2e/angle-export.spec.ts` | Export coverage for tan, including the undefined case | 9 |

---

### Task 1: `angle-wave.ts` — domain, nullable `waveValue`, asymptote positions

**Files:**
- Modify: `src/scripts/explorer/angle-wave.ts:18,34,55-67,89-92`
- Modify: `src/scripts/explorer/angle-wave.test.ts`

**Interfaces:**
- Consumes: nothing new — `degreesToRadians` already imported.
- Produces:
  - `TAN_MAX = 4`
  - `waveDomain(fn: WaveFn): number` — `4` for `'tan'`, `1.5` (the existing `AMP_MAX`) otherwise.
  - `waveScales(width?, height?, domain: number = AMP_MAX): WaveScales` — third param, additive.
  - `waveValue(fn: WaveFn, theta: number, r: number): number | null` — `null` only when `fn === 'tan'` and `θ ≡ 90° (mod 180°)`.
  - `waveAsymptoteRadians(): number[]` — `[-3π/2, -π/2, π/2, 3π/2]`.
  - `WaveFn = 'sin' | 'cos' | 'tan'` (was `'sin' | 'cos'`).

- [ ] **Step 1: Write the failing tests**

Add to the top of `src/scripts/explorer/angle-wave.test.ts`, extending the existing import:

```ts
import {
  AMP_MAX,
  TAN_MAX,
  WAVE_HEIGHT,
  WAVE_WIDTH,
  buildWaveSvg,
  waveAsymptoteRadians,
  waveDomain,
  waveScales,
  waveTickLabel,
  waveTickRadians,
  waveValue,
  wavePath,
  waveSpoken,
} from './angle-wave';
```

Append these new `describe` blocks (do not touch the existing `waveValue` or `waveScales` blocks yet — they still pass unmodified against the current implementation and will keep passing once `fn` includes `'tan'`):

```ts
describe('waveDomain', () => {
  it('is ±1.5 for sin and cos, ±4 for tan', () => {
    expect(waveDomain('sin')).toBe(AMP_MAX);
    expect(waveDomain('cos')).toBe(AMP_MAX);
    expect(waveDomain('tan')).toBe(TAN_MAX);
  });
});

describe('waveScales — custom domain', () => {
  it('rescales the y-axis to the given domain, leaving existing calls untouched', () => {
    const narrow = waveScales(WAVE_WIDTH, WAVE_HEIGHT); // default domain, AMP_MAX
    const wide = waveScales(WAVE_WIDTH, WAVE_HEIGHT, TAN_MAX);
    expect(narrow.yFor(0)).toBeCloseTo(wide.yFor(0), 6); // zero stays at the same pixel
    expect(wide.yFor(TAN_MAX)).toBeCloseTo(narrow.yFor(AMP_MAX), 6); // both land on the top edge
    expect(wide.yFor(1)).toBeGreaterThan(narrow.yFor(1)); // same value, smaller fraction of a wider box
  });
});

describe('waveValue — tan', () => {
  it('is independent of r — the radius cancels out of the ratio', () => {
    for (const theta of [10, 30, 45, 60, 80, -50, 200]) {
      const a = waveValue('tan', theta, 0.5);
      const b = waveValue('tan', theta, 1.5);
      expect(a).not.toBeNull();
      expect(a).toBeCloseTo(b!, 12);
    }
  });

  it('matches Math.tan away from the asymptotes', () => {
    expect(waveValue('tan', 45, 1)).toBeCloseTo(1, 10);
    expect(waveValue('tan', 0, 1)).toBeCloseTo(0, 10);
    expect(waveValue('tan', 30, 1)).toBeCloseTo(Math.tan(Math.PI / 6), 10);
  });

  it('is null at every odd multiple of 90°, positive or negative', () => {
    for (const theta of [90, -90, 270, -270]) {
      expect(waveValue('tan', theta, 1)).toBeNull();
    }
  });

  it('is not null anywhere else, including close neighbours of an asymptote', () => {
    expect(waveValue('tan', 89, 1)).not.toBeNull();
    expect(waveValue('tan', 91, 1)).not.toBeNull();
    expect(waveValue('tan', 180, 1)).not.toBeNull();
  });
});

describe('waveAsymptoteRadians', () => {
  it('returns the four odd π/2 multiples in ascending order', () => {
    expect(waveAsymptoteRadians()).toEqual([
      -3 * (Math.PI / 2),
      -1 * (Math.PI / 2),
      1 * (Math.PI / 2),
      3 * (Math.PI / 2),
    ]);
  });

  it('lands exactly on members of waveTickRadians — the asymptotes are real gridlines', () => {
    const tickRadians = waveTickRadians().map((t) => t.radians);
    for (const asymptote of waveAsymptoteRadians()) {
      expect(tickRadians.some((r) => Math.abs(r - asymptote) < 1e-12)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/scripts/explorer/angle-wave.test.ts`
Expected: FAIL — `TAN_MAX`, `waveDomain`, `waveAsymptoteRadians` are not exported; `waveValue('tan', ...)` type-errors (`'tan'` is not assignable to `WaveFn`) and, once that's silenced, returns `NaN` instead of a number or `null`.

- [ ] **Step 3: Widen `WaveFn`, add the domain, rewrite `waveValue`**

In `src/scripts/explorer/angle-wave.ts`, replace line 18:

```ts
export type WaveFn = 'sin' | 'cos';
```

with:

```ts
export type WaveFn = 'sin' | 'cos' | 'tan';
```

Replace line 34 (`export const AMP_MAX = 1.5;`) with:

```ts
export const AMP_MAX = 1.5;
/** y-domain half-height for tan, in units. atan(4) ≈ 76°, so only the last 14°
 *  before each asymptote is off-screen — atan(1.5) ≈ 56° would hide 34°. */
export const TAN_MAX = 4;

/** Per-function y-domain half-height. sin/cos share AMP_MAX; tan gets its own,
 *  wider domain because it is unbounded and AMP_MAX would hide a third of
 *  every quarter-sweep. */
export function waveDomain(fn: WaveFn): number {
  return fn === 'tan' ? TAN_MAX : AMP_MAX;
}
```

Replace the `waveScales` function (lines 55-67):

```ts
export function waveScales(
  width: number = WAVE_WIDTH,
  height: number = WAVE_HEIGHT,
  domain: number = AMP_MAX,
): WaveScales {
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  return {
    xFor: (radians) => PAD.left + ((radians + X_SPAN / 2) / X_SPAN) * plotW,
    // SVG y grows downward, so the domain is inverted here — the same flip
    // `angle-render.ts` applies by negating its sine.
    yFor: (value) => PAD.top + ((domain - value) / (2 * domain)) * plotH,
  };
}
```

Replace `waveValue` (lines 89-92):

```ts
/** The plotted value: the terminal point's y (sin), x (cos), or ratio (tan),
 *  scaled by r for sin/cos. tan is NOT scaled by r — tan θ = (r sin θ)/(r cos θ)
 *  and r cancels, so the radius slider cannot move this curve. `null` marks
 *  the asymptotes, where tan is undefined. */
export function waveValue(fn: WaveFn, theta: number, r: number): number | null {
  const rad = degreesToRadians(theta);
  if (fn === 'sin') return r * Math.sin(rad);
  if (fn === 'cos') return r * Math.cos(rad);
  // θ arrives from a degree slider (or a parsed, already-rounded field), so a
  // tolerance-checked degree comparison is exact and honest here — unlike
  // testing Math.tan's magnitude, which never actually reaches Infinity.
  if (Math.abs((Math.abs(theta) % 180) - 90) < 1e-6) return null;
  return Math.tan(rad);
}

/** The four vertical asymptotes tan is undefined at, within [-2π, 2π]. */
export function waveAsymptoteRadians(): number[] {
  return [-3, -1, 1, 3].map((k) => (k * Math.PI) / 2);
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run src/scripts/explorer/angle-wave.test.ts`
Expected: PASS — including every pre-existing test in the file, unmodified (`waveValue('sin', ...)` and `waveValue('cos', ...)` still return plain numbers, and `waveScales()` with no third argument still defaults to `AMP_MAX`).

- [ ] **Step 5: Typecheck**

Run: `npx astro check`
Expected: FAIL, in `AngleExplorer.tsx` at the `round4(waveValue(...))` call site — `waveValue` now returns `number | null` and `round4` expects `number`. This is intentional and gets fixed in Task 7; confirm the error is exactly there and nowhere else, then move on.

- [ ] **Step 6: Commit**

Append to `SUMMARY.md`:

```md

## [2026-08-02 HH:MM] Commit Summary

**Change Type:** Feature
**Scope:** Angle Explorer — wave strip

**Summary:**
Widened `WaveFn` to include `'tan'`, added a per-function y-domain
(`waveDomain`), a `null`-at-the-asymptotes `waveValue`, and
`waveAsymptoteRadians`. `waveValue('tan', ...)` deliberately ignores `r` — the
radius cancels out of the ratio — which is now an assertion, not a claim.

**Rationale:**
tan is unbounded, so sharing sin/cos's ±1.5 y-domain would hide a third of
every quarter-sweep; ±4 (atan(4) ≈ 76°) hides only the last 14°. `null` rather
than `NaN` forces every call site to handle the asymptote explicitly — the
existing `AngleExplorer.tsx` export call site already fails to typecheck as a
result, confirming the compiler is doing that job.

**References:**
- TODO.md: 2026-08-02 Angle Explorer Tangent Wave
- Spec: docs/superpowers/specs/2026-08-02-angle-wave-tangent-design.md
- Plan: docs/superpowers/plans/2026-08-02-angle-wave-tangent.md (Task 1)
```

```bash
git add src/scripts/explorer/angle-wave.ts src/scripts/explorer/angle-wave.test.ts SUMMARY.md
git commit -m "feat(explorer): add tan's y-domain, nullable waveValue, and asymptote positions"
```

---

### Task 2: `angle-wave.ts` — `wavePath`'s tan branch

**Files:**
- Modify: `src/scripts/explorer/angle-wave.ts` (the `wavePath` function, lines ~113-133)
- Modify: `src/scripts/explorer/angle-wave.test.ts`

**Interfaces:**
- Consumes: `TAN_MAX`, `waveDomain` (Task 1); `waveScales` (Task 1, third param); `degreesToRadians`.
- Produces: `wavePath(fn, theta, r, scales): string` — unchanged signature, now branches internally for `'tan'`. Zero or more `M … L … L …` subpaths joined by a single space, never spanning an asymptote.

- [ ] **Step 1: Write the failing tests**

Append to `src/scripts/explorer/angle-wave.test.ts`, inside (or right after) the existing `describe('wavePath', ...)` block — it needs `waveDomain` and `TAN_MAX`, already imported by Task 1:

```ts
describe('wavePath — tan', () => {
  // tan needs its own domain-matched scale; the default waveScales() is
  // still ±1.5 and would clip every tan sample well before the real edge.
  const tanScale = waveScales(WAVE_WIDTH, WAVE_HEIGHT, TAN_MAX);

  it('draws one subpath for a sweep that never reaches the visible edge', () => {
    const path = wavePath('tan', 45, 1, tanScale);
    expect((path.match(/M/g) ?? []).length).toBe(1);
  });

  it('breaks into multiple subpaths once the sweep crosses an asymptote', () => {
    const path = wavePath('tan', 120, 1, tanScale);
    expect((path.match(/M/g) ?? []).length).toBeGreaterThan(1);
  });

  it('never lets one subpath span an asymptote', () => {
    // Every asymptote (odd multiple of 90°) must fall strictly BETWEEN two
    // subpaths, never inside the degree range one subpath covers.
    for (const path of [
      wavePath('tan', 180, 1, tanScale),
      wavePath('tan', 400, 1, tanScale),
      wavePath('tan', -260, 1, tanScale),
    ]) {
      for (const subpath of path.split(' M ').map((s, i) => (i === 0 ? s : `M ${s}`))) {
        const xs = [...subpath.matchAll(/[ML] ([-\d.e]+) /g)].map((m) => Number(m[1]));
        for (const asymptoteRad of waveAsymptoteRadians()) {
          const asymptoteX = tanScale.xFor(asymptoteRad);
          const allBefore = xs.every((x) => x < asymptoteX);
          const allAfter = xs.every((x) => x > asymptoteX);
          expect(allBefore || allAfter, `subpath straddles an asymptote: ${subpath}`).toBe(true);
        }
      }
    }
  });

  it('breaks at the exact angle where |tan θ| = TAN_MAX, not an interpolated guess', () => {
    const edgeDeg = (Math.atan(TAN_MAX) * 180) / Math.PI;
    const path = wavePath('tan', 120, 1, tanScale);
    const firstSubpath = path.split(' M ')[0]!;
    const lastPoint = [...firstSubpath.matchAll(/[ML] ([-\d.e]+) ([-\d.e]+)/g)].at(-1)!;
    expect(Number(lastPoint[1])).toBeCloseTo(tanScale.xFor(degreesToRadians(edgeDeg)), 4);
    expect(Number(lastPoint[2])).toBeCloseTo(tanScale.yFor(TAN_MAX), 4);
  });

  it('snaps the final vertex to θ exactly when θ is inside the visible domain', () => {
    const v = [...wavePath('tan', 30, 1, tanScale).matchAll(/[ML] ([-\d.e]+) ([-\d.e]+)/g)].at(-1)!;
    expect(Number(v[1])).toBeCloseTo(tanScale.xFor(degreesToRadians(30)), 6);
    expect(Number(v[2])).toBeCloseTo(tanScale.yFor(waveValue('tan', 30, 1)!), 6);
  });

  it('traces leftward for a negative sweep, mirroring sin/cos', () => {
    const xs = [...wavePath('tan', -45, 1, tanScale).matchAll(/[ML] ([-\d.e]+) /g)].map((m) =>
      Number(m[1]),
    );
    expect(xs.at(-1)!).toBeLessThan(xs[0]!);
  });

  it('is independent of r, matching waveValue', () => {
    expect(wavePath('tan', 45, 0.5, tanScale)).toBe(wavePath('tan', 45, 1.5, tanScale));
  });

  it('keeps every vertex inside the viewBox across a full sweep', () => {
    for (let theta = -360; theta <= 360; theta += 13) {
      if (Math.abs(theta) < 1e-9) continue;
      for (const v of [...wavePath('tan', theta, 1, tanScale).matchAll(/[ML] ([-\d.e]+) ([-\d.e]+)/g)]) {
        const x = Number(v[1]);
        const y = Number(v[2]);
        expect(x, `x out of range at θ=${theta}`).toBeGreaterThanOrEqual(0);
        expect(x, `x out of range at θ=${theta}`).toBeLessThanOrEqual(WAVE_WIDTH);
        expect(y, `y out of range at θ=${theta}`).toBeGreaterThanOrEqual(0);
        expect(y, `y out of range at θ=${theta}`).toBeLessThanOrEqual(WAVE_HEIGHT);
      }
    }
  });

  it('emits no NaN or undefined across a full sweep', () => {
    for (let theta = -360; theta <= 360; theta += 9) {
      const path = wavePath('tan', theta, 1, tanScale);
      expect(path).not.toContain('NaN');
      expect(path).not.toContain('undefined');
    }
  });
});
```

Also add `waveAsymptoteRadians` and `waveDomain`/`TAN_MAX` to this test file's import if not already present from Task 1 (they are).

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/scripts/explorer/angle-wave.test.ts`
Expected: FAIL — `wavePath('tan', ...)` currently falls through to the sin/cos loop, which calls `waveValue('tan', at, r)` per sample; that now type-checks (Task 1) but produces a single unbroken polyline that spans every asymptote and shoots far outside the viewBox (or contains `null` arithmetic — `scales.yFor(null)` is `NaN`).

- [ ] **Step 3: Implement `tanPath` and branch `wavePath`**

In `src/scripts/explorer/angle-wave.ts`, add this constant near `STEP_DEG`:

```ts
/** Sampling interval for tan, in degrees. Tighter than sin/cos's 2° because
 *  the curve steepens sharply near each asymptote, where 2° steps facet visibly. */
const TAN_STEP_DEG = 1;
```

Add this helper directly above `wavePath`:

```ts
/**
 * The tangent curve traced from 0 to θ, as one or more SVG subpaths.
 *
 * tan is periodic every 180° and unbounded within each period, so unlike
 * sin/cos this cannot be one polyline: it is built from the VISIBLE
 * sub-intervals — the portion of each 180°-period branch where |tan θ| stays
 * inside TAN_MAX — intersected with [0, θ]. Each sub-interval becomes its own
 * `M …` subpath, so no subpath ever crosses an asymptote. Break points are the
 * exact angle where |tan θ| = TAN_MAX (± k·180°), computed directly rather
 * than interpolated between samples — tan's curvature near the asymptote makes
 * a straight chord between 1° samples measurably wrong there.
 *
 * The final vertex of the LAST subpath falls out of the same clamp that
 * produces every other subpath's edge: `Math.min(hi, center + edge)` is θ
 * itself whenever θ is the binding constraint (θ inside the visible domain),
 * and the branch's true edge otherwise — so "snap to θ" and "stop at the
 * domain edge" are the same rule, not two.
 */
function tanPath(theta: number, dir: 1 | -1, scales: WaveScales): string {
  const edgeDeg = (Math.atan(TAN_MAX) * 180) / Math.PI;
  const lo = Math.min(0, theta);
  const hi = Math.max(0, theta);

  const intervals: Array<[number, number]> = [];
  const kMin = Math.floor((lo - edgeDeg) / 180) - 1;
  const kMax = Math.ceil((hi + edgeDeg) / 180) + 1;
  for (let k = kMin; k <= kMax; k++) {
    const center = k * 180;
    const segLo = Math.max(lo, center - edgeDeg);
    const segHi = Math.min(hi, center + edgeDeg);
    if (segHi - segLo > 1e-6) intervals.push([segLo, segHi]);
  }

  // Intervals are produced in ascending order (k ascending ⇒ centre
  // ascending), which is the sweep order for a positive θ. A negative θ
  // sweeps from 0 DOWN to θ, so both the interval order and each interval's
  // internal sample order must reverse.
  const ordered = dir === 1 ? intervals : [...intervals].reverse();

  return ordered
    .map(([a, b]) => {
      const n = Math.ceil((b - a) / TAN_STEP_DEG);
      const points: string[] = [];
      for (let i = 0; i <= n; i++) {
        const deg =
          dir === 1
            ? i === n
              ? b
              : a + i * TAN_STEP_DEG
            : i === n
              ? a
              : b - i * TAN_STEP_DEG;
        const rad = degreesToRadians(deg);
        points.push(`${scales.xFor(rad)} ${scales.yFor(Math.tan(rad))}`);
      }
      return `M ${points[0]}${points.slice(1).map((p) => ` L ${p}`).join('')}`;
    })
    .join(' ');
}
```

Replace the start of `wavePath` (the current lines 113-123, up through `const points: string[] = [];`) so the function reads:

```ts
export function wavePath(
  fn: WaveFn,
  theta: number,
  r: number,
  scales: WaveScales,
): string {
  if (Math.abs(theta) < ZERO_DEG) return '';

  const dir = theta < 0 ? -1 : 1;

  if (fn === 'tan') return tanPath(theta, dir, scales);

  const steps = Math.ceil(Math.abs(theta) / STEP_DEG);
  const points: string[] = [];
```

Leave the rest of the function (the sin/cos sampling loop and its `return`) exactly as it is — this keeps sin/cos byte-identical.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run src/scripts/explorer/angle-wave.test.ts`
Expected: PASS — the new `wavePath — tan` block, and every pre-existing test in the file unmodified (sin/cos never enter the new branch).

- [ ] **Step 5: Commit**

Append to `SUMMARY.md` (same format as Task 1; Scope: `Angle Explorer — wave strip`; Summary: "Added `tanPath`, the exact-break-point subpath builder for tan's curve, so no subpath ever crosses an asymptote and every vertex stays inside the viewBox."; Rationale: explain the branch-interval algorithm briefly and that the θ-snap and domain-edge-clamp fall out of one `Math.min` rather than being two separate rules; References: same three lines, `(Task 2)`).

```bash
git add src/scripts/explorer/angle-wave.ts src/scripts/explorer/angle-wave.test.ts SUMMARY.md
git commit -m "feat(explorer): trace the tan curve as exact-break subpaths"
```

---

### Task 3: `angle-wave.ts` — `buildWaveSvg` and `waveSpoken`

**Files:**
- Modify: `src/scripts/explorer/angle-wave.ts` (`buildWaveSvg`, `waveSpoken`)
- Modify: `src/scripts/explorer/angle-wave.test.ts`

**Interfaces:**
- Consumes: `waveDomain`, `waveAsymptoteRadians`, `waveValue`, `wavePath` (Tasks 1-2).
- Produces: `buildWaveSvg(opts): string` — same signature, now domain-aware and drawing dashed asymptote lines for tan; suppresses the marker/drop-line whenever the value is `null` or outside the domain. `waveSpoken(fn, theta, r): string` — names tan as "Tangent curve" and speaks "undefined" at the asymptotes.

- [ ] **Step 1: Write the failing tests**

Append to `src/scripts/explorer/angle-wave.test.ts`:

```ts
describe('waveSpoken — tan', () => {
  it('calls it a curve, not a wave, and reports the value', () => {
    expect(waveSpoken('tan', 45, 1)).toBe(
      'Tangent curve traced from 0 to 45 degrees. tangent of theta is 1.',
    );
  });

  it('reports undefined at an asymptote', () => {
    expect(waveSpoken('tan', 90, 1)).toBe(
      'Tangent curve traced from 0 to 90 degrees. tangent of theta is undefined.',
    );
  });

  it('is independent of r', () => {
    expect(waveSpoken('tan', 30, 0.5)).toBe(waveSpoken('tan', 30, 1.5));
  });
});

describe('buildWaveSvg — tan', () => {
  const tanBase = { ...waveBase, fn: 'tan' as const };

  it('draws four dashed asymptote lines, and none for sin/cos', () => {
    const svg = buildWaveSvg({ ...tanBase, theta: 45 });
    expect([...svg.matchAll(/data-role="wave-asymptote"/g)]).toHaveLength(4);
    expect(buildWaveSvg({ ...waveBase, fn: 'sin', theta: 45 })).not.toContain(
      'data-role="wave-asymptote"',
    );
  });

  it('rescales the box to ±TAN_MAX — a value of 1 sits on the dashed unit reference', () => {
    const svg = buildWaveSvg({ ...tanBase, theta: 45 }); // tan 45° = 1
    const markerY = Number(svg.match(/data-role="wave-marker"[^>]*cy="([-\d.]+)"/)![1]);
    const s = waveScales(WAVE_WIDTH, WAVE_HEIGHT, TAN_MAX);
    expect(markerY).toBeCloseTo(s.yFor(1), 4);
  });

  it('suppresses the marker and drop-line at an asymptote', () => {
    const svg = buildWaveSvg({ ...tanBase, theta: 90 });
    expect(svg).not.toContain('data-role="wave-marker"');
    expect(svg).not.toContain('data-role="wave-drop"');
  });

  it('suppresses the marker once the value leaves the visible domain, short of the true asymptote', () => {
    // tan(80°) ≈ 5.67 > TAN_MAX(4) — a real, finite value, but off-screen.
    const svg = buildWaveSvg({ ...tanBase, theta: 80 });
    expect(svg).not.toContain('data-role="wave-marker"');
  });

  it('still draws the marker for sin/cos everywhere, unaffected by the new domain check', () => {
    const svg = buildWaveSvg({ ...waveBase, fn: 'sin', theta: 90 });
    expect(svg).toContain('data-role="wave-marker"');
  });

  it('draws the curve in one or more subpaths without NaN across a full sweep', () => {
    for (let theta = -360; theta <= 360; theta += 11) {
      if (Math.abs(theta) < 1e-9) continue;
      const svg = buildWaveSvg({ ...tanBase, theta });
      expect(svg).not.toContain('NaN');
      expect(svg).not.toContain('undefined');
    }
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/scripts/explorer/angle-wave.test.ts`
Expected: FAIL — no `wave-asymptote` markup exists yet; the marker is drawn unconditionally regardless of domain; `waveSpoken('tan', ...)` says "Tan wave" or throws on the `{sin:'Sine',cos:'Cosine'}[fn]` lookup miss.

- [ ] **Step 3: Rewrite `buildWaveSvg` and `waveSpoken`**

In `src/scripts/explorer/angle-wave.ts`, replace `waveSpoken`:

```ts
const WAVE_DISPLAY_NAME: Record<WaveFn, string> = { sin: 'Sine', cos: 'Cosine', tan: 'Tangent' };
const WAVE_SPOKEN_FN_NAME: Record<WaveFn, string> = { sin: 'sine', cos: 'cosine', tan: 'tangent' };

/**
 * The strip as prose, for the existing debounced live region. Both KaTeX boxes
 * are `aria-hidden`, so this is the only channel a screen-reader user has.
 *
 * tan is called a "curve", not a "wave" — it is periodic but not a sinusoid —
 * and reports "undefined" at the asymptotes rather than a bogus huge number.
 */
export function waveSpoken(fn: WaveFn, theta: number, r: number): string {
  const noun = fn === 'tan' ? 'curve' : 'wave';
  const value = waveValue(fn, theta, r);
  const valueText = value === null ? 'undefined' : String(Math.round(value * 1e4) / 1e4);
  return (
    `${WAVE_DISPLAY_NAME[fn]} ${noun} traced from 0 to ${degreeText(theta)} degrees. ` +
    `${WAVE_SPOKEN_FN_NAME[fn]} of theta is ${valueText}.`
  );
}
```

Replace the body of `buildWaveSvg` (everything from `const s = waveScales(width, height);` through the final `return`) with:

```ts
  const domain = waveDomain(fn);
  const s = waveScales(width, height, domain);

  const top = s.yFor(domain);
  const bottom = s.yFor(-domain);
  const zeroY = s.yFor(0);

  // Full-height gridlines rather than short ticks at the axis: the label sits at
  // the bottom of the box, and a line spanning the plot is what ties the two
  // together without ambiguity about which tick a label belongs to.
  const ticks = waveTickRadians()
    .map(({ k, radians }) => {
      const x = s.xFor(radians);
      const label = waveTickLabel(k);
      const even = k % 2 === 0;
      const labelY =
        height - (even ? LABEL_BASELINE.primary : LABEL_BASELINE.secondary);
      return (
        `<g data-role="wave-tick">` +
        `<line x1="${x}" y1="${top}" x2="${x}" y2="${bottom + TICK_OVERSHOOT}" ` +
        `stroke="${colors.axis}" stroke-width="${even ? 0.75 : 0.5}" />` +
        `<text x="${x}" y="${labelY}" fill="${tickText}" font-size="${TICK_FONT_SIZE}" ` +
        `text-anchor="middle" dominant-baseline="middle">${label}</text>` +
        `</g>`
      );
    })
    .join('');

  // The strip's counterpart to the polar figure's dashed unit circle — same
  // dasharray, same idea: this is the reference, the solid thing is yours.
  const unitRefs = [1, -1]
    .map(
      (v) =>
        `<line data-role="wave-unit-ref" x1="${s.xFor(-X_SPAN / 2)}" y1="${s.yFor(v)}" ` +
        `x2="${s.xFor(X_SPAN / 2)}" y2="${s.yFor(v)}" stroke="${colors.axis}" ` +
        `stroke-width="1" stroke-dasharray="3 3" />`,
    )
    .join('');

  // Dashed verticals at tan's four asymptotes, spanning the plot area like the
  // π/4 gridlines. Absent for sin/cos, which have no asymptote to mark.
  const asymptotes =
    fn === 'tan'
      ? waveAsymptoteRadians()
          .map((rad) => {
            const x = s.xFor(rad);
            return (
              `<line data-role="wave-asymptote" x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" ` +
              `stroke="${colors.axis}" stroke-width="1" stroke-dasharray="2 4" />`
            );
          })
          .join('')
      : '';

  const path = wavePath(fn, theta, r, s);
  const curve =
    path !== ''
      ? `<path data-role="wave-curve" d="${path}" fill="none" stroke="${colors.wave}" ` +
        `stroke-width="2.5" stroke-linejoin="round" />`
      : '';

  // The marker/drop-line pair is suppressed whenever the value is null (the
  // exact asymptote) OR simply outside the visible domain (a real but
  // off-screen tan value) — a marker pinned to the box edge would assert a
  // value that was clipped away. For sin/cos this check never fires: their
  // values never exceed AMP_MAX, so the marker still draws unconditionally,
  // matching today's behaviour exactly.
  const value = waveValue(fn, theta, r);
  const showMarker = value !== null && Math.abs(value) <= domain;
  const markerX = s.xFor(degreesToRadians(theta));
  const markerMarkup = showMarker
    ? `<line data-role="wave-drop" x1="${markerX}" y1="${zeroY}" x2="${markerX}" y2="${s.yFor(value)}" ` +
      `stroke="${colors.wave}" stroke-width="1" stroke-dasharray="2 2" />` +
      `<circle data-role="wave-marker" cx="${markerX}" cy="${s.yFor(value)}" r="${MARKER_R}" ` +
      `fill="${colors.point}" stroke="${colors.pointStroke}" />`
    : '';

  return (
    ticks +
    unitRefs +
    asymptotes +
    // Zero axis and the x = 0 vertical, matching the polar figure's reference axes.
    `<line x1="${s.xFor(-X_SPAN / 2)}" y1="${zeroY}" x2="${s.xFor(X_SPAN / 2)}" y2="${zeroY}" ` +
    `stroke="${colors.axis}" stroke-width="1" />` +
    `<line x1="${s.xFor(0)}" y1="${top}" x2="${s.xFor(0)}" y2="${bottom}" ` +
    `stroke="${colors.axis}" stroke-width="1" />` +
    curve +
    markerMarkup
  );
}
```

Leave the function's opening (`export function buildWaveSvg(opts: WaveDiagramOptions): string {` through `const height = opts.height ?? WAVE_HEIGHT;`) untouched.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run src/scripts/explorer/angle-wave.test.ts`
Expected: PASS — the full file, including every pre-existing `buildWaveSvg` and `waveSpoken` test for sin/cos, unmodified.

- [ ] **Step 5: Typecheck**

Run: `npx astro check`
Expected: Same single pre-existing error as Task 1 (the `AngleExplorer.tsx` export call site), still pending Task 7. No new errors.

- [ ] **Step 6: Commit**

Append to `SUMMARY.md` (Scope: `Angle Explorer — wave strip`; Summary: "buildWaveSvg now rescales to each function's own domain, draws tan's four asymptotes, and suppresses the marker whenever a value is null or off-screen; waveSpoken names tan a curve and speaks undefined at the asymptotes."; Rationale: one line on why a real-but-off-screen value (e.g. tan 80°) must also suppress the marker, not just the literal null case; References as before, `(Task 3)`).

```bash
git add src/scripts/explorer/angle-wave.ts src/scripts/explorer/angle-wave.test.ts SUMMARY.md
git commit -m "feat(explorer): rescale buildWaveSvg per function and draw tan's asymptotes"
```

---

### Task 4: `unit-circle.ts` — exact tangent values

**Files:**
- Modify: `src/scripts/explorer/unit-circle.ts`
- Modify: `src/scripts/explorer/unit-circle.test.ts`

**Interfaces:**
- Consumes: `isIntegerDegrees` from `./angle` (already imported).
- Produces:
  - `ExactValue.denominator: 1 | 2 | 3` (was `1 | 2`).
  - `exactTangent(deg: number): ExactValue | 'undefined' | null` — `null` for a non-chart angle, `'undefined'` at 90°/270° (and their normalized equivalents), otherwise the exact value.

- [ ] **Step 1: Write the failing tests**

Append to `src/scripts/explorer/unit-circle.test.ts`, extending the existing import:

```ts
import {
  exactCoordinates,
  exactTangent,
  exactToNumber,
  formatExactLatex,
  formatExactSpoken,
  formatExactText,
  type ExactValue,
} from './unit-circle';
```

```ts
describe('exactTangent', () => {
  it('agrees with Math.tan at every chart angle away from the asymptotes', () => {
    for (const deg of CHART_ANGLES) {
      if (deg === 90 || deg === 270) continue;
      const v = exactTangent(deg);
      expect(v, `no exact tangent for ${deg}°`).not.toBeNull();
      expect(v).not.toBe('undefined');
      expect(exactToNumber(v as ExactValue)).toBeCloseTo(Math.tan((deg * Math.PI) / 180), 10);
    }
  });

  it('is undefined at 90° and 270°, and at their normalized equivalents', () => {
    for (const deg of [90, 270, -90, -270, 450]) {
      expect(exactTangent(deg)).toBe('undefined');
    }
  });

  it('renders √3/3 at 30° and 150°, with the correct sign', () => {
    expect(exactTangent(30)).toEqual({ sign: 1, radicand: 3, denominator: 3 });
    expect(exactTangent(150)).toEqual({ sign: -1, radicand: 3, denominator: 3 });
  });

  it('is 0 at 0° and 180°, and exactly √3 at 60°', () => {
    expect(exactTangent(0)).toEqual({ sign: 0, radicand: 1, denominator: 1 });
    expect(exactTangent(180)).toEqual({ sign: 0, radicand: 1, denominator: 1 });
    expect(exactTangent(60)).toEqual({ sign: 1, radicand: 3, denominator: 1 });
  });

  it('is positive in Q1/Q3 and negative in Q2/Q4', () => {
    expect(exactToNumber(exactTangent(210) as ExactValue)).toBeGreaterThan(0); // Q3
    expect(exactToNumber(exactTangent(300) as ExactValue)).toBeLessThan(0); // Q4
  });

  it('returns null for integers off the chart and for non-integer degrees', () => {
    expect(exactTangent(37)).toBeNull();
    expect(exactTangent(30.5)).toBeNull();
  });

  it('normalises past-360° and negative angles onto the same value', () => {
    expect(exactTangent(390)).toEqual(exactTangent(30));
    expect(exactTangent(-330)).toEqual(exactTangent(30));
  });
});

describe('exactCoordinates — never needs a denominator of 3', () => {
  it('proves the ExactValue.denominator widening is non-invasive for x/y', () => {
    for (const deg of CHART_ANGLES) {
      const point = exactCoordinates(deg)!;
      expect(point.x.denominator).not.toBe(3);
      expect(point.y.denominator).not.toBe(3);
    }
  });
});

describe('formatters — denominator 3', () => {
  const rootThirdOverThree = { sign: 1 as const, radicand: 3 as const, denominator: 3 as const };

  it('renders √3/3 across all three formatters with no formatter changes needed', () => {
    expect(formatExactLatex(rootThirdOverThree)).toBe('\\frac{\\sqrt{3}}{3}');
    expect(formatExactText(rootThirdOverThree)).toBe('√3/3');
    expect(formatExactSpoken(rootThirdOverThree)).toBe('square root of 3 over 3');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/scripts/explorer/unit-circle.test.ts`
Expected: FAIL — `exactTangent` is not exported; `{ denominator: 3 }` type-errors against the current `1 | 2` union.

- [ ] **Step 3: Widen the type and add `exactTangent`**

In `src/scripts/explorer/unit-circle.ts`, replace line 27 (`denominator: 1 | 2;`) with:

```ts
  denominator: 1 | 2 | 3;
```

Add these constants after `ROOT3_OVER_2` (line 39):

```ts
const ROOT3: ExactValue = { sign: 1, radicand: 3, denominator: 1 };
const ROOT3_OVER_3: ExactValue = { sign: 1, radicand: 3, denominator: 3 };
```

Add this map after `FIRST_QUADRANT` (line 52):

```ts
/**
 * tan at the first-quadrant reference angles. Five entries, the same rule
 * `exactCoordinates` already teaches: everything else is a reference angle
 * plus a quadrant sign. `'undefined'` at 90° propagates through unchanged —
 * there is no sign to negate at an asymptote.
 */
const FIRST_QUADRANT_TAN = new Map<number, ExactValue | 'undefined'>([
  [0, ZERO],
  [30, ROOT3_OVER_3],
  [45, ONE],
  [60, ROOT3],
  [90, 'undefined'],
]);
```

Add this function after `exactCoordinates`:

```ts
/**
 * The exact tan θ for θ, `'undefined'` at the asymptotes, or `null` when no
 * exact form exists — the same three-state split `exactCoordinates` uses for
 * its two states, with `'undefined'` added because tan (unlike a coordinate)
 * genuinely has no value at some chart angles.
 *
 * Positive in Q1/Q3 (where sin and cos share a sign), negative in Q2/Q4
 * (where they differ) — tan's own quadrant rule, distinct from x/y's.
 */
export function exactTangent(deg: number): ExactValue | 'undefined' | null {
  if (!isIntegerDegrees(deg)) return null;
  const d = normalizeDegrees(Math.round(deg));

  let reference: number;
  let flip: boolean;
  if (d <= 90) {
    reference = d;
    flip = false;
  } else if (d <= 180) {
    reference = 180 - d;
    flip = true;
  } else if (d <= 270) {
    reference = d - 180;
    flip = false;
  } else {
    reference = 360 - d;
    flip = true;
  }

  const base = FIRST_QUADRANT_TAN.get(reference);
  if (base === undefined) return null;
  if (base === 'undefined') return base;
  return flip ? negate(base) : base;
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run src/scripts/explorer/unit-circle.test.ts`
Expected: PASS — the full file, including every pre-existing test unmodified.

- [ ] **Step 5: Commit**

Append to `SUMMARY.md` (Scope: `Angle Explorer — unit circle`; Summary: "Widened `ExactValue.denominator` to admit `√3/3` and added `exactTangent`, a five-entry-plus-quadrant-rule lookup mirroring `exactCoordinates`."; Rationale: note the formatter test proving the widening needed zero formatter changes, and the `exactCoordinates` sweep proving the widening is invisible to the existing x/y path; References as before, `(Task 4)`).

```bash
git add src/scripts/explorer/unit-circle.ts src/scripts/explorer/unit-circle.test.ts SUMMARY.md
git commit -m "feat(explorer): add exactTangent alongside exactCoordinates"
```

---

### Task 5: `angle-coordinates.ts` — the r-cancellation caption

**Files:**
- Modify: `src/scripts/explorer/angle-coordinates.ts`
- Modify: `src/scripts/explorer/angle-coordinates.test.ts`

**Interfaces:**
- Consumes: `exactTangent`, `formatExactLatex`, `formatExactText` (Task 4); `round4`, `formatDegrees` (already imported).
- Produces: `CoordinateReadout.tanLatex: string`, `CoordinateReadout.tanText: string`.

- [ ] **Step 1: Write the failing tests**

Append to `src/scripts/explorer/angle-coordinates.test.ts`:

```ts
describe('buildCoordinateReadout — tan', () => {
  it('shows the r cancelling out of the ratio, exact and irrational', () => {
    const out = buildCoordinateReadout(30, 1.2);
    expect(out.tanLatex).toBe(
      '\\tan\\theta = \\frac{y}{x} = \\frac{r\\sin\\theta}{r\\cos\\theta} = ' +
        '\\frac{\\sqrt{3}}{3} \\approx 0.5774',
    );
    expect(out.tanText).toBe(
      'tan θ = y/x = (r sin θ)/(r cos θ) = √3/3 ≈ 0.5774',
    );
  });

  it('is identical for every r — the whole point of the cancellation', () => {
    expect(buildCoordinateReadout(30, 0.5).tanLatex).toBe(
      buildCoordinateReadout(30, 1.5).tanLatex,
    );
  });

  it('uses = for an exact rational value', () => {
    const out = buildCoordinateReadout(45, 1);
    expect(out.tanLatex).toBe(
      '\\tan\\theta = \\frac{y}{x} = \\frac{r\\sin\\theta}{r\\cos\\theta} = 1',
    );
    expect(out.tanLatex).not.toContain('\\approx');
  });

  it('states 0 once rather than "0 = 0"', () => {
    expect(buildCoordinateReadout(0, 1).tanLatex).toBe(
      '\\tan\\theta = \\frac{y}{x} = \\frac{r\\sin\\theta}{r\\cos\\theta} = 0',
    );
  });

  it('reads as undefined at 90° and 270°, in both alphabets', () => {
    const at90 = buildCoordinateReadout(90, 1);
    expect(at90.tanLatex).toBe(
      '\\tan\\theta = \\frac{y}{x} = \\frac{r\\sin\\theta}{r\\cos\\theta}\\text{ is undefined}',
    );
    expect(at90.tanText).toBe(
      'tan θ = y/x = (r sin θ)/(r cos θ) is undefined',
    );
    expect(buildCoordinateReadout(270, 1).tanText).toContain('is undefined');
  });

  it('falls back to a named tangent when no exact form exists', () => {
    const out = buildCoordinateReadout(37, 1);
    expect(out.tanLatex).toBe(
      '\\tan\\theta = \\frac{y}{x} = \\frac{r\\sin\\theta}{r\\cos\\theta} = ' +
        '\\tan 37^\\circ \\approx 0.7536',
    );
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/scripts/explorer/angle-coordinates.test.ts`
Expected: FAIL — `out.tanLatex` / `out.tanText` are `undefined`.

- [ ] **Step 3: Implement**

In `src/scripts/explorer/angle-coordinates.ts`, add to the `unit-circle` import (line 17-23):

```ts
import {
  exactCoordinates,
  exactTangent,
  formatExactLatex,
  formatExactSpoken,
  formatExactText,
  type ExactValue,
} from './unit-circle';
```

Add `tanLatex: string;` and `tanText: string;` to the `CoordinateReadout` interface, next to `xLatex`/`yLatex`:

```ts
export interface CoordinateReadout {
  tripleLatex: string;
  xLatex: string;
  yLatex: string;
  /** `tan θ = y/x = (r sin θ)/(r cos θ) = …` — no `r ×` prefix, because r
   *  cancels out of the ratio; showing the cancellation IS the point. */
  tanLatex: string;
  tanText: string;
  spoken: string;
  labelText: string;
  pairText: string;
  xText: string;
  yText: string;
}
```

Add this function after `equation` (after line 98):

```ts
/**
 * The tan θ worked equation: `tan θ = y/x = (r sin θ)/(r cos θ) = …`. Unlike
 * {@link equation}, there is no `r ×` prefix — r cancels out of the ratio, so
 * substituting it on both sides of the fraction would be noise. The literal
 * `(r sin θ)/(r cos θ)` step is what makes the cancellation visible; the
 * value that follows never depends on r.
 */
function tanEquation(
  exact: ExactValue | 'undefined' | null,
  value: number,
  degreeLabel: string,
  alphabet: 'latex' | 'text',
): string {
  const latex = alphabet === 'latex';
  const chain = latex
    ? '\\tan\\theta = \\frac{y}{x} = \\frac{r\\sin\\theta}{r\\cos\\theta}'
    : 'tan θ = y/x = (r sin θ)/(r cos θ)';

  if (exact === 'undefined') {
    return `${chain}${latex ? '\\text{ is undefined}' : ' is undefined'}`;
  }

  const approx = latex ? ' \\approx ' : ' ≈ ';
  const exactPart =
    exact === null
      ? latex
        ? `\\tan ${degreeLabel}^\\circ`
        : `tan ${degreeLabel}°`
      : latex
        ? formatExactLatex(exact)
        : formatExactText(exact);
  const decimal = round4(value);
  if (exactPart === decimal) return `${chain} = ${decimal}`;
  const relation = exact !== null && isRational(exact) ? ' = ' : approx;
  return `${chain} = ${exactPart}${relation}${decimal}`;
}
```

In `buildCoordinateReadout`, after the `const degreeLabel = formatDegrees(theta);` line, add:

```ts
  const exactTan = exactTangent(theta);
  const tanValue = Math.tan(rad);
  const tanLatex = tanEquation(exactTan, tanValue, degreeLabel, 'latex');
  const tanText = tanEquation(exactTan, tanValue, degreeLabel, 'text');
```

Add `tanLatex,` and `tanText,` to the returned object, alongside `xLatex,`/`yLatex,`.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run src/scripts/explorer/angle-coordinates.test.ts`
Expected: PASS — the full file, including every pre-existing test unmodified.

- [ ] **Step 5: Commit**

Append to `SUMMARY.md` (Scope: `Angle Explorer — coordinate readout`; Summary: "`CoordinateReadout` gains `tanLatex`/`tanText`, showing `tan θ = y/x = (r sin θ)/(r cos θ) = …` with no `r ×` prefix — the cancellation itself is the content."; Rationale: one line on why this differs structurally from the x/y `equation()` helper (no r-substitution step, since r never appears in the final value); References as before, `(Task 5)`).

```bash
git add src/scripts/explorer/angle-coordinates.ts src/scripts/explorer/angle-coordinates.test.ts SUMMARY.md
git commit -m "feat(explorer): add the tan coordinate readout with visible r-cancellation"
```

---

### Task 6: `angle-diagram.ts` — the tangent segment

**Files:**
- Modify: `src/scripts/explorer/angle-diagram.ts` (the `projectionMarkup` block, lines ~340-362)
- Modify: `src/scripts/explorer/angle-diagram.test.ts`

**Interfaces:**
- Consumes: `WaveFn` (now includes `'tan'`, Task 1); `polarToCartesian` (already imported); `LABEL_MARGIN` (already defined in this file, line 127).
- Produces: no signature change — `AngleDiagramOptions.projection` already types as `WaveFn | undefined`. `'tan'` draws `data-role="tangent-segment"` (solid) and `data-role="tangent-extension"` (dashed) instead of `data-role="projection-leg"`.

- [ ] **Step 1: Write the failing tests**

Append to `src/scripts/explorer/angle-diagram.test.ts`:

```ts
function readTangentSegment(svg: string): { x1: number; y1: number; x2: number; y2: number } | null {
  const m = svg.match(
    /<line data-role="tangent-segment" x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"/,
  );
  return m ? { x1: Number(m[1]), y1: Number(m[2]), x2: Number(m[3]), y2: Number(m[4]) } : null;
}

const tangentSegmentLength = (svg: string): number => {
  const l = readTangentSegment(svg)!;
  return Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
};

describe('buildAngleDiagramSvg — tangent segment', () => {
  it('draws nothing for sin/cos/undefined, and no old-style projection-leg for tan', () => {
    expect(buildAngleDiagramSvg({ ...base, theta: 30 })).not.toContain('tangent-segment');
    expect(buildAngleDiagramSvg({ ...base, theta: 30, projection: 'sin' })).not.toContain(
      'tangent-segment',
    );
    expect(buildAngleDiagramSvg({ ...base, theta: 30, projection: 'tan' })).not.toContain(
      'data-role="projection-leg"',
    );
  });

  it('has length |tan θ| · unit, for any β and any r — unclamped', () => {
    // Kept well inside ±60° so the segment never clamps at the default view.
    for (const theta of [10, 30, 45, -20, -55]) {
      for (const beta of [0, 40, -90]) {
        for (const r of [0.5, 1, 1.5]) {
          const svg = buildAngleDiagramSvg({ ...base, theta, beta, r, projection: 'tan' });
          const expected = Math.abs(Math.tan((theta * Math.PI) / 180)) * UNIT;
          expect(tangentSegmentLength(svg)).toBeCloseTo(expected, 4);
        }
      }
    }
  });

  it('is unchanged by r — the same cancellation, now in the figure', () => {
    const at = (r: number) => buildAngleDiagramSvg({ ...base, theta: 40, r, projection: 'tan' });
    expect(tangentSegmentLength(at(0.5))).toBeCloseTo(tangentSegmentLength(at(1.5)), 4);
  });

  it('collapses to zero length at θ = 0, drawn with a round cap so it stays visible', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 0, projection: 'tan' });
    expect(tangentSegmentLength(svg)).toBeCloseTo(0, 6);
    expect(svg.match(/<line data-role="tangent-segment"[^>]*>/)![0]).toContain(
      'stroke-linecap="round"',
    );
  });

  it('draws a dashed extension from the terminal point to the segment endpoint', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 40, projection: 'tan' });
    expect(svg).toContain('data-role="tangent-extension"');
    expect(svg.match(/<line data-role="tangent-extension"[^>]*>/)![0]).toContain(
      'stroke-dasharray',
    );
  });

  it('draws both elements in the wave colour', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 40, projection: 'tan' });
    expect(svg.match(/<line data-role="tangent-segment"[^>]*>/)![0]).toContain(colors.wave);
    expect(svg.match(/<line data-role="tangent-extension"[^>]*>/)![0]).toContain(colors.wave);
  });

  it('never leaves the viewBox near an asymptote, across β', () => {
    for (const beta of [0, 90, -45, 180]) {
      for (const theta of [88, 89, 89.9, -89, -89.9]) {
        const svg = buildAngleDiagramSvg({ ...base, theta, beta, projection: 'tan' });
        const seg = readTangentSegment(svg)!;
        for (const v of [seg.x1, seg.x2]) {
          expect(v, `x out of range θ=${theta} β=${beta}`).toBeGreaterThanOrEqual(0);
          expect(v, `x out of range θ=${theta} β=${beta}`).toBeLessThanOrEqual(320);
        }
        for (const v of [seg.y1, seg.y2]) {
          expect(v, `y out of range θ=${theta} β=${beta}`).toBeGreaterThanOrEqual(0);
          expect(v, `y out of range θ=${theta} β=${beta}`).toBeLessThanOrEqual(320);
        }
      }
    }
  });

  it('keeps the length invariant under β while its endpoints move, matching the sin/cos legs', () => {
    const at = (beta: number) =>
      buildAngleDiagramSvg({ ...base, theta: 40, beta, projection: 'tan' });
    expect(tangentSegmentLength(at(0))).toBeCloseTo(tangentSegmentLength(at(75)), 4);
    expect(readTangentSegment(at(0))).not.toEqual(readTangentSegment(at(75)));
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/scripts/explorer/angle-diagram.test.ts`
Expected: FAIL — `'tan'` is not assignable to the sin/cos-shaped `projection` branch's expectations at the type level once `WaveFn` includes it (Task 1 already landed), and at runtime the current code draws a `data-role="projection-leg"` for ANY defined `projection`, including `'tan'` — not the new `tangent-segment`/`tangent-extension` roles.

- [ ] **Step 3: Implement**

In `src/scripts/explorer/angle-diagram.ts`, replace the `projectionMarkup` block (lines 340-362):

```ts
  const projectionMarkup = (() => {
    if (opts.projection === undefined) return '';

    if (opts.projection === 'tan') {
      // The tangent segment's own construction: T sits on the UNIT circle
      // (not r·unit) at angle β — the point where the initial side crosses
      // it, and the fixed anchor of the tangent line. E sits along the
      // TERMINAL ray at signed distance sec(θ)·unit from the origin — the
      // standard "extend the terminal side until it meets the tangent line"
      // construction. Because T is independent of r and E's angle is
      // β + θ (also independent of r), segment length is exactly
      // |tan θ|·unit for any r — the cancellation, geometrically.
      //
      // Clamped to the viewBox's inscribed circle (radius c − LABEL_MARGIN)
      // so the segment never overflows near an asymptote, regardless of β —
      // a circle centred on the origin is bounded the same way in every
      // direction. No endpoint dot is ever drawn at E, clamped or not, so a
      // clamped segment never asserts a value it was truncated out of.
      const secTheta = 1 / Math.cos(thetaRad);
      const rawDist = secTheta * unit;
      const maxDist = c - LABEL_MARGIN;
      const dist = Math.abs(rawDist) > maxDist ? Math.sign(rawDist) * maxDist : rawDist;
      const tangentPoint = polarToCartesian(c, c, unit, betaRad);
      const lineEnd = polarToCartesian(c, c, dist, endRad);
      return (
        `<line data-role="tangent-extension" x1="${terminalDot.x}" y1="${terminalDot.y}" ` +
        `x2="${lineEnd.x}" y2="${lineEnd.y}" stroke="${colors.wave}" stroke-width="1" ` +
        `stroke-dasharray="3 3" />` +
        `<line data-role="tangent-segment" x1="${tangentPoint.x}" y1="${tangentPoint.y}" ` +
        `x2="${lineEnd.x}" y2="${lineEnd.y}" stroke="${colors.wave}" stroke-width="2.5" ` +
        `stroke-linecap="round" />`
      );
    }

    // The foot of the perpendicular from the terminal point onto the initial
    // side, expressed in the β-rotated frame. Positioned through betaRad like
    // every other element, so the leg rotates with the rigid body — and its
    // length is therefore r|sin θ| (sin) or r|cos θ| (cos) for ANY β, which is
    // what makes it equal to the wave's plotted height.
    const foot = polarToCartesian(c, c, r * Math.cos(thetaRad) * unit, betaRad);
    const from = opts.projection === 'sin' ? terminalDot : { x: c, y: c };
    // stroke-linecap="round": a zero-length line (sin 0° / cos 90°) is
    // deliberately drawn rather than omitted — a missing element would read
    // as "no projection selected" rather than "the value is zero" — but
    // "butt" (the SVG default) paints nothing for a zero-length line. Only
    // "round" (or "square") gives it any visible extent, so the zero value
    // renders honestly instead of silently as nothing.
    return (
      `<line data-role="projection-leg" x1="${from.x}" y1="${from.y}" ` +
      `x2="${foot.x}" y2="${foot.y}" stroke="${colors.wave}" stroke-width="2.5" ` +
      `stroke-linecap="round" />`
    );
  })();
```

This is a drop-in replacement for the existing `const projectionMarkup = opts.projection === undefined ? '' : (() => {...})();` block — same variable name, same position, same closing usage two lines later (`projectionMarkup +` in the final `return`).

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run src/scripts/explorer/angle-diagram.test.ts`
Expected: PASS — the full file, including every pre-existing `projection-leg` (sin/cos) test unmodified, since that code path only moved, not changed.

- [ ] **Step 5: Typecheck**

Run: `npx astro check`
Expected: Same single pre-existing error as Tasks 1 and 3 (the `AngleExplorer.tsx` export call site). No new errors.

- [ ] **Step 6: Commit**

Append to `SUMMARY.md` (Scope: `Angle Explorer — diagram`; Summary: "`projection: 'tan'` now draws a tangent segment anchored on the unit circle, geometrically clamped to the viewBox's inscribed circle so it never overflows near an asymptote."; Rationale: explain the T/E construction in one or two sentences and why the clamp is a magnitude bound on distance-from-origin rather than a per-axis clamp; References as before, `(Task 6)`).

```bash
git add src/scripts/explorer/angle-diagram.ts src/scripts/explorer/angle-diagram.test.ts SUMMARY.md
git commit -m "feat(explorer): draw a clamped tangent segment in the angle diagram"
```

---

### Task 7: Wire it into `AngleExplorer.tsx` and `angles.astro`

**Files:**
- Modify: `src/components/explorer/AngleExplorer.tsx`
- Modify: `src/pages/explorers/angles.astro`

**Interfaces:**
- Consumes: everything from Tasks 1-6 — `waveValue` (nullable), `coords.tanLatex`, `buildWaveSvg`/`buildAngleDiagramSvg` (already generically typed over `WaveFn`).
- Produces: no new exports — this task only wires existing pieces into the component and fixes the `npx astro check` error that has been pending since Task 1.

This task has no unit tests of its own (`.tsx` logic is outside the node test environment, per the Global Constraints) — Tasks 8-9 cover it end-to-end.

- [ ] **Step 1: Add the display-name map and the fourth radio option**

In `src/components/explorer/AngleExplorer.tsx`, after line 63 (`const VIEW = 320;`), add:

```ts

/** Spoken function name for the wave strip's aria-label and live-region text. */
const WAVE_SPOKEN_NAME: Record<WaveFn, string> = { sin: 'sine', cos: 'cosine', tan: 'tangent' };
```

Replace the radio options array (lines 420-426):

```tsx
            {(
              [
                { value: 'none' as const, label: 'none' },
                { value: 'sin' as const, label: 'sin θ' },
                { value: 'cos' as const, label: 'cos θ' },
                { value: 'tan' as const, label: 'tan θ' },
              ]
            ).map((o) => (
```

- [ ] **Step 2: Add `tan` to the `coordHtml` memo**

Replace lines 111-119:

```tsx
  const coords = useMemo(() => buildCoordinateReadout(theta, r), [theta, r]);
  const coordHtml = useMemo(
    () => ({
      triple: renderMathHtml(coords.tripleLatex) ?? '',
      x: renderMathHtml(coords.xLatex) ?? '',
      y: renderMathHtml(coords.yLatex) ?? '',
      tan: renderMathHtml(coords.tanLatex) ?? '',
    }),
    [coords.tripleLatex, coords.xLatex, coords.yLatex, coords.tanLatex],
  );
```

- [ ] **Step 3: Fix the export snapshot's `waveValue` call site**

Replace line 246 (`const snapshotCoords = buildCoordinateReadout(snapshotTheta, snapshotR);`) with:

```ts
    const snapshotCoords = buildCoordinateReadout(snapshotTheta, snapshotR);
    const waveNumericValue = snapshotWave
      ? waveValue(snapshotWave, snapshotTheta, snapshotR)
      : null;
```

Replace the legend entry (lines 270-280):

```tsx
          ...(snapshotWave
            ? [
                {
                  label:
                    snapshotWave === 'sin'
                      ? 'sin θ — height is the y-coordinate'
                      : snapshotWave === 'cos'
                        ? 'cos θ — height is the x-coordinate'
                        : 'tan θ — height is the tangent segment',
                  color: lightColors.wave,
                },
              ]
            : []),
```

Replace the `Wave` facts section (lines 304-322):

```tsx
          ...(snapshotWave
            ? [
                {
                  title: 'Wave',
                  color: lightColors.wave,
                  facts: [
                    {
                      label: 'Function',
                      value:
                        snapshotWave === 'sin'
                          ? 'y = r·sin θ'
                          : snapshotWave === 'cos'
                            ? 'y = r·cos θ'
                            : 'tan θ = y/x',
                    },
                    {
                      label: 'Value',
                      value: waveNumericValue === null ? 'undefined' : round4(waveNumericValue),
                    },
                    { label: 'Traced', value: `0° to ${formatDegrees(snapshotTheta)}°` },
                  ],
                },
              ]
            : []),
```

- [ ] **Step 4: Update the live wave figure's aria-label and caption**

Replace lines 553-584 (the `{waveFn && (...)}` block):

```tsx
        {waveFn && (
          <div data-testid="angle-wave" className="mt-4">
            <svg
              data-testid="angle-wave-figure"
              viewBox={`0 0 ${WAVE_WIDTH} ${WAVE_HEIGHT}`}
              className="h-auto w-full"
              role="img"
              aria-label={`Graph of ${WAVE_SPOKEN_NAME[waveFn]} traced from 0 to ${formatDegrees(theta)} degrees, on an axis from negative 2 pi to 2 pi.`}
              dangerouslySetInnerHTML={{
                __html: buildWaveSvg({
                  fn: waveFn,
                  theta,
                  r,
                  colors,
                  tickText,
                }),
              }}
            />
            {/* The value is the coordinate the strip plots, so this reuses the
                equation angle-coordinates.ts already built rather than
                formatting it a second time — the strip's number and the
                coordinate box's number cannot then disagree. */}
            <div
              data-testid="angle-wave-caption"
              aria-hidden="true"
              className="mt-2 text-center text-sm text-muted-foreground"
              dangerouslySetInnerHTML={{
                __html:
                  waveFn === 'sin' ? coordHtml.y : waveFn === 'cos' ? coordHtml.x : coordHtml.tan,
              }}
            />
          </div>
        )}
```

- [ ] **Step 5: Update the page copy**

In `src/pages/explorers/angles.astro`, replace lines 19-20:

```astro
      Pick <strong>sin θ</strong>, <strong>cos θ</strong>, or <strong>tan θ</strong> to trace
      that wave as you sweep &mdash; the highlighted leg or segment inside the circle is the
      wave's height. Tangent breaks at its asymptotes and does not move with the radius
      slider, since r cancels out of the ratio.
```

- [ ] **Step 6: Typecheck**

Run: `npx astro check`
Expected: PASS — no errors. This is the first point since Task 1 where the type error at the `waveValue` call site is actually fixed, not just confirmed-present.

- [ ] **Step 7: Run the full unit suite**

Run: `npm test`
Expected: PASS — every test across every file, including all of Tasks 1-6.

- [ ] **Step 8: Manual smoke check**

Run: `npm run dev`, open `/explorers/angles` in a browser.
- Select `tan θ`. Confirm the strip appears with dashed asymptote lines and a curve that breaks cleanly at each one.
- Drag the angle slider past 90°. Confirm the curve is absent in the dead zone and reappears past it, and the caption reads "is undefined" at exactly 90°.
- Drag the radius slider while `tan θ` is selected. Confirm the tan curve does NOT move, and that the caption's `(r sin θ)/(r cos θ)` chain reads clearly as the reason why.
- Switch back to `sin θ` and confirm the radius slider still changes its amplitude as before.
- Toggle dark mode. Confirm the asymptote lines and tangent segment remain visible.
- Kill the dev server when done (`shut-down-dev-servers-when-done` — do not leave it running).

- [ ] **Step 9: Commit**

Append to `SUMMARY.md` (Scope: `Angle Explorer`; Summary: "Wired `tan θ` into `AngleExplorer.tsx` — fourth radio option, `coordHtml.tan`, export legend/facts, and the shared spoken-name map — and updated the page copy. This is the change that fixes the `waveValue` nullability typecheck error introduced in Task 1."; Rationale: note that every prior task was additive/type-safe in isolation, and this is the integration point; References as before, `(Task 7)`).

```bash
git add src/components/explorer/AngleExplorer.tsx src/pages/explorers/angles.astro SUMMARY.md
git commit -m "feat(explorer): wire tan θ into the Angle Explorer UI and export"
```

---

### Task 8: E2E — `tests/e2e/angle.spec.ts`

**Files:**
- Modify: `tests/e2e/angle.spec.ts`

**Interfaces:**
- Consumes: `WAVE_FIGURE`, `waveOption`, `curve`, `deg` (all already defined in this file).

- [ ] **Step 1: Write the tests**

Append after the existing `test('reset returns the wave selector to none', ...)` block:

```ts
test('the tan option is reachable by keyboard from cos', async ({ page }) => {
  await goto(page);
  await waveOption(page, 'cos θ').focus();
  // Same 50ms rationale as the sin→cos test above: Radix's roving-focus group
  // defers the arrow-key selection to a setTimeout(0).
  await page.keyboard.press('ArrowDown', { delay: 50 });
  await expect(waveOption(page, 'tan θ')).toBeChecked();
});

test('selecting tan reveals the strip with its four asymptote lines', async ({ page }) => {
  await goto(page);
  await waveOption(page, 'tan θ').check();
  await expect(page.locator(WAVE_FIGURE)).toBeVisible();
  await expect(page.locator(`${WAVE_FIGURE} [data-role="wave-asymptote"]`)).toHaveCount(4);
});

test('the radius slider does not move the tan curve — r cancels out of the ratio', async ({
  page,
}) => {
  await goto(page);
  await waveOption(page, 'tan θ').check();
  await deg(page).fill('45');
  const before = await curve(page).getAttribute('d');

  const radius = page.locator('#slider-radius [role="slider"]');
  await radius.focus();
  for (let i = 0; i < 5; i++) await radius.press('ArrowRight');

  expect(await curve(page).getAttribute('d')).toBe(before);
});

test('shows undefined with no marker at 90 degrees', async ({ page }) => {
  await goto(page);
  await waveOption(page, 'tan θ').check();
  await deg(page).fill('90');
  await expect(page.locator(`${WAVE_FIGURE} [data-role="wave-marker"]`)).toHaveCount(0);
  await expect(page.locator('[data-testid="angle-wave-caption"]')).toContainText('undefined');
});

test('sweeping past the asymptote breaks the curve into more than one subpath', async ({
  page,
}) => {
  await goto(page);
  await waveOption(page, 'tan θ').check();
  await deg(page).fill('120');
  const d = (await curve(page).getAttribute('d'))!;
  expect((d.match(/M/g) ?? []).length).toBeGreaterThan(1);
});

test('the tangent segment appears in the circle with tan selected', async ({ page }) => {
  await goto(page);
  const segment = page.locator(`${FIGURE} [data-role="tangent-segment"]`);
  await expect(segment).toHaveCount(0);

  await waveOption(page, 'tan θ').check();
  await deg(page).fill('45');
  await expect(segment).toHaveCount(1);
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx playwright test tests/e2e/angle.spec.ts -g "tan"`
Expected: FAIL — `tan θ` is not yet a radio option (before Task 7 lands). If run AFTER Task 7, this should already pass; run it anyway to confirm no regression and treat any failure as a real bug to fix before continuing.

- [ ] **Step 3: Run it and confirm it passes**

Run: `npx playwright test tests/e2e/angle.spec.ts`
Expected: PASS — the full file, every existing test plus the six new ones.

- [ ] **Step 4: Commit**

Append to `SUMMARY.md` (Scope: `Angle Explorer — e2e`; Summary: "Added browser coverage for tan: keyboard reachability, the four asymptote lines, the radius slider's non-effect (the r-cancellation risk flagged in the design spec, now a permanent regression check), the undefined state at 90°, multi-subpath breaking, and the tangent segment."; Rationale: one line noting this converts a design-doc "needs a browser check" risk into an automated test; References as before, `(Task 8)`).

```bash
git add tests/e2e/angle.spec.ts SUMMARY.md
git commit -m "test(explorer): cover tan θ in the angle explorer e2e suite"
```

---

### Task 9: E2E — `tests/e2e/angle-export.spec.ts`

**Files:**
- Modify: `tests/e2e/angle-export.spec.ts`

**Interfaces:**
- Consumes: `downloadExport`, `readDownload`, `goto`, `deg`, `FIGURE` (all already defined in this file).

- [ ] **Step 1: Write the test**

Append after the existing `test('omits the wave section when no wave is selected', ...)` block:

```ts
test('carries the tangent wave into the exported artifact, including the undefined case', async ({
  page,
}) => {
  await goto(page);
  await page.getByRole('radio', { name: 'tan θ' }).check();
  await deg(page).fill('45');

  await downloadExport(page, 'PNG', async (artifact) => {
    const text = await artifact.evaluate((node) => node.textContent);
    expect(text).toContain('Wave');
    expect(text).toContain('tan θ = y/x');
    expect(text).toContain('Traced');
    expect(text).toContain('0° to 45°');
  });

  await deg(page).fill('90');
  await downloadExport(page, 'PNG', async (artifact) => {
    const text = await artifact.evaluate((node) => node.textContent);
    expect(text).toContain('undefined');
  });
});
```

- [ ] **Step 2: Run it and confirm it passes**

Run: `npx playwright test tests/e2e/angle-export.spec.ts`
Expected: PASS — the full file, every existing test plus the new one. (If run before Task 7 lands, this fails because `tan θ` is not yet a radio option — same caveat as Task 8.)

- [ ] **Step 3: Commit**

Append to `SUMMARY.md` (Scope: `Angle Explorer — export e2e`; Summary: "Added export coverage confirming the tan wave section, its `tan θ = y/x` function label, and the literal `undefined` text at 90° all reach the exported PNG artifact."; Rationale: one line — the export path is a separate code path (`renderGraph` builds its own detached-DOM markup) from the live figure, so it needs its own regression check rather than inheriting Task 8's coverage; References as before, `(Task 9)`).

```bash
git add tests/e2e/angle-export.spec.ts SUMMARY.md
git commit -m "test(explorer): cover tan θ in the angle explorer export"
```

---

### Task 10: Final verification and PR

**Files:** none — verification only.

- [ ] **Step 1: Full unit suite**

Run: `npm test`
Expected: PASS, zero failures.

- [ ] **Step 2: Typecheck**

Run: `npx astro check`
Expected: PASS, zero errors.

- [ ] **Step 3: Full e2e suite for the touched files**

Run: `npx playwright test tests/e2e/angle.spec.ts tests/e2e/angle-export.spec.ts`
Expected: PASS, zero failures.

- [ ] **Step 4: Confirm no visual-snapshot regression**

Run: `git status` and confirm `tests/e2e/__snapshots__/` is untouched — the design spec noted there is still no `angle-explorer` PNG baseline, so `test:e2e:visual` is unaffected by this feature and does not need to run.

- [ ] **Step 5: Push and open a PR**

```bash
git push -u origin feature/angle-wave-tangent
gh pr create --title "feat(explorer): add tan θ to the Angle Explorer wave selector" --body "$(cat <<'EOF'
## Summary
- Adds `tan θ` as a fourth Wave option (`none · sin θ · cos θ · tan θ`), keeping the existing three unchanged.
- Tangent gets its own ±4 y-domain, exact-break-point subpaths at each asymptote, a clamped tangent-segment highlight in the circle (anchored on the unit circle, length exactly `|tan θ|·unit`), and a caption that shows `r` cancelling out of the ratio.
- `waveValue` now returns `number | null` (`null` at the asymptotes) — every call site handles it, including a fixed typecheck error at the export snapshot.

## Test plan
- [x] `npm test` — full unit suite passes
- [x] `npx astro check` — typechecks clean
- [x] `npx playwright test tests/e2e/angle.spec.ts tests/e2e/angle-export.spec.ts` — passes
- [x] Manual smoke check in both themes (Task 7, Step 8)

Spec: `docs/superpowers/specs/2026-08-02-angle-wave-tangent-design.md`
Plan: `docs/superpowers/plans/2026-08-02-angle-wave-tangent.md`
EOF
)"
```

Report the PR URL back once created.
