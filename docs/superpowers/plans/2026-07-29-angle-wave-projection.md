# Angle Explorer Wave Projection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Wave` selector (`none` · `sin θ` · `cos θ`, default `none`) to the Angle Explorer that traces the selected wave below the circle as the user drags the angle slider, and move the explorer's default angle from 30° to 0°.

**Architecture:** A new pure string builder, `src/scripts/explorer/angle-wave.ts`, draws the wave strip's SVG with no DOM access — the same contract `angle-diagram.ts` already uses, so the live figure and the PNG/PDF export consume one builder and cannot drift. θ remains the single source of truth: the wave derives from it exactly as the coordinates and readouts already do, so there is no animation loop, no second clock, and no synchronization code. Because the stacked layout forecloses a horizontal tie-line, `buildAngleDiagramSvg` gains an optional `projection` that highlights the matching reference-triangle leg in a new palette colour.

**Tech Stack:** Astro 7 + React 19 (`client:only="react"`), TypeScript, `radix-ui` 1.6.0 umbrella primitives, Tailwind 4, KaTeX 0.17 for readouts, Vitest (node environment) for unit tests, Playwright for e2e.

## Global Constraints

Every task's requirements implicitly include this section.

- **Strict TDD.** Red → green → refactor. Write the failing test, run it and see it fail for the expected reason, then implement.
- **Unit tests run in the node environment only.** `vitest.config.ts` sets `environment: 'node'` and `include: ['src/**/*.{test,spec}.ts']`. There is no jsdom. Any logic that needs a unit test must live in a `.ts` module under `src/scripts/**` — logic inside a `.tsx` component is unreachable by the test runner.
- **Pure builders are DOM-free by construction.** String concatenation only. No `document`, no `createElementNS`.
- **No new dependencies.** Everything needed is already installed.
- **Radix imports come from the umbrella:** `import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'`. Match `src/components/ui/slider.tsx` and `checkbox.tsx`.
- **Exact-π text uses an ASCII hyphen.** `formatPiText` emits `-7π/4`, never `−7π/4` (U+2212). Assert ASCII in tests.
- **Non-text graphical marks must clear 3:1 contrast** against `themeColors(dark).bg` in *both* themes (WCAG 2.1 SC 1.4.11). Enforced by `src/scripts/graphing/theme.test.ts`.
- **Playwright locator rules for this codebase.** Radix puts `role="slider"` on the thumb while the id and `aria-label` sit on the root, so target `#slider-<id> [role="slider"]`. Never use a descendant `svg` selector inside a container that renders KaTeX — radicals become nested `<svg>` elements. Give new figures their own `data-testid`.
- **Conventional Commits.** `feat:`, `fix:`, `refactor:`, `test:`, `docs:`. **No co-author or AI-generation trailers.**
- **Append a `SUMMARY.md` entry before every commit**, using the format already in that file (`## [YYYY-MM-DD HH:MM] Commit Summary` with Change Type / Scope / Summary / Rationale / References).
- **Branch:** `feature/angle-wave-projection`, already created and pushed. No direct commits to `main`.
- **Commands:** unit `npx vitest run <path>`; full unit suite `npm test`; e2e `npx playwright test <path>`; typecheck `npx astro check`.

---

## File Structure

| File | Responsibility | Task |
| --- | --- | --- |
| `src/scripts/explorer/angle.ts` | Gains `formatFractionText` / `formatPiText`, moved out of the component to sit beside their LaTeX twins | 1 |
| `src/scripts/explorer/angle-readout.ts` **(new)** | `buildReadout` — the five-way identity chain and arc-length line, extracted so it is testable | 1, 2 |
| `src/scripts/graphing/theme.ts` | Gains `ExplorerColors.wave` | 3 |
| `src/scripts/explorer/angle-wave.ts` **(new)** | Wave strip: types, scales, ticks, values, path, prose, SVG markup | 4, 5, 6 |
| `src/scripts/explorer/angle-diagram.ts` | Gains the optional `projection` leg | 7 |
| `src/components/explorer/AngleExplorer.tsx` | Default angle, wave state, radio group, strip, caption, live region, reset, export | 8, 9, 10 |
| `src/components/ui/radio-group.tsx` **(new)** | shadcn radio group over the Radix primitive (scaffolding for task 9) | 9 |
| `src/pages/explorers/angles.astro` | One sentence of page copy | 10 |

---

### Task 1: Extract the pure formatters and `buildReadout`

Two behaviour-preserving moves. `buildReadout` currently lives inside `AngleExplorer.tsx`, where the node test runner cannot reach it — which is exactly what blocks the θ = 0 fix in task 2. Move first, characterise with tests, then change behaviour in a separate commit so the fix is provably the only delta.

**Files:**
- Modify: `src/scripts/explorer/angle.ts` (append the two text formatters)
- Modify: `src/scripts/explorer/angle.test.ts` (append tests)
- Create: `src/scripts/explorer/angle-readout.ts`
- Create: `src/scripts/explorer/angle-readout.test.ts`
- Modify: `src/components/explorer/AngleExplorer.tsx` (delete lines 47-92 and 101-119; add imports)

**Interfaces:**
- Consumes: `Fraction`, `formatPiLatex`, `formatFractionLatex`, `piMultiple`, `turnFraction`, `isIntegerDegrees`, `arcLength`, `degreesToRadians` from `angle.ts`; `round4` from `format.ts`
- Produces:
  - `formatFractionText(f: Fraction): string` — `'0'`, `'1'`, `'1/12'`, `'-1/4'`
  - `formatPiText(f: Fraction): string` — `'0'`, `'π'`, `'2π'`, `'π/6'`, `'-2π/3'`
  - `buildReadout(theta: number, r: number): { chain: string; arc: string; spoken: string }`

- [ ] **Step 1: Write the failing test for the text formatters**

Append to `src/scripts/explorer/angle.test.ts`:

```ts
describe('plain-text exact forms (for SVG labels and the export artifact)', () => {
  it('formats fractions without LaTeX markup', () => {
    expect(formatFractionText({ n: 0, d: 1 })).toBe('0');
    expect(formatFractionText({ n: 1, d: 1 })).toBe('1');
    expect(formatFractionText({ n: 1, d: 12 })).toBe('1/12');
    expect(formatFractionText({ n: -1, d: 4 })).toBe('-1/4');
  });

  it('formats π multiples without LaTeX markup', () => {
    expect(formatPiText({ n: 0, d: 1 })).toBe('0');
    expect(formatPiText({ n: 1, d: 1 })).toBe('π');
    expect(formatPiText({ n: 2, d: 1 })).toBe('2π');
    expect(formatPiText({ n: 1, d: 6 })).toBe('π/6');
    expect(formatPiText({ n: -2, d: 3 })).toBe('-2π/3');
  });

  it('uses an ASCII hyphen, not a Unicode minus sign', () => {
    // The SVG label and the export artifact are plain text; a U+2212 would not
    // match the tick-label assertions in angle-wave.test.ts.
    expect(formatPiText({ n: -1, d: 4 })).toBe('-π/4');
    expect(formatPiText({ n: -1, d: 4 })).not.toContain('−');
  });
});
```

Add `formatFractionText, formatPiText` to the existing import from `'./angle'` at the top of the file.

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/scripts/explorer/angle.test.ts`
Expected: FAIL — `formatFractionText is not a function` (the import resolves to `undefined`).

- [ ] **Step 3: Move the two formatters into `angle.ts`**

Append to `src/scripts/explorer/angle.ts`, after `formatFractionSpoken`:

```ts
/**
 * Plain-text (non-KaTeX) exact fraction: `0`, `1`, `1/12`, `-1/4`. Mirrors
 * {@link formatFractionLatex} without markup — the export artifact renders as
 * plain HTML text and SVG labels are plain text, never through KaTeX.
 */
export function formatFractionText(f: Fraction): string {
  if (f.n === 0) return '0';
  const sign = f.n < 0 ? '-' : '';
  const mag = Math.abs(f.n);
  return f.d === 1 ? `${sign}${mag}` : `${sign}${mag}/${f.d}`;
}

/**
 * Plain-text exact π-multiple: `0`, `π`, `2π`, `π/6`, `-2π/3`. Mirrors
 * {@link formatPiLatex} without markup, for the same reason.
 */
export function formatPiText(f: Fraction): string {
  if (f.n === 0) return '0';
  const sign = f.n < 0 ? '-' : '';
  const mag = Math.abs(f.n);
  const numerator = mag === 1 ? 'π' : `${mag}π`;
  return f.d === 1 ? `${sign}${numerator}` : `${sign}${numerator}/${f.d}`;
}
```

Delete the identical `formatFractionText` and `formatPiText` definitions from `AngleExplorer.tsx` (lines 101-119, including their doc comments), and add both names to the existing `from '@/scripts/explorer/angle'` import block.

- [ ] **Step 4: Run and confirm green**

Run: `npx vitest run src/scripts/explorer/angle.test.ts`
Expected: PASS. Then `npx astro check` — expected: no errors (proves the component's import rewiring is complete).

- [ ] **Step 5: Commit**

Append a `SUMMARY.md` entry (Change Type: Refactor, Scope: Angle Explorer — formatters), then:

```bash
git add src/scripts/explorer/angle.ts src/scripts/explorer/angle.test.ts \
        src/components/explorer/AngleExplorer.tsx SUMMARY.md
git commit -m "refactor(explorer): move plain-text exact formatters into angle.ts

They were always general-purpose formatters that happened to live in a
component. angle-wave.ts needs formatPiText for its tick labels, and a .ts
module cannot import from a .tsx."
```

- [ ] **Step 6: Write the characterization test for `buildReadout`**

Create `src/scripts/explorer/angle-readout.test.ts`. These assertions capture **current** behaviour, including the verbose θ = 0 chain, so task 2's change is visible as a diff rather than smuggled in:

```ts
import { describe, it, expect } from 'vitest';

import { buildReadout } from './angle-readout';

describe('buildReadout — whole degrees show every exact form', () => {
  it('chains degrees, turn fraction, π multiple and decimal at 30°', () => {
    const out = buildReadout(30, 1);
    expect(out.chain).toBe(
      '30^\\circ = \\frac{1}{12}\\text{ of a full turn} = \\frac{1}{12} \\times 2\\pi ' +
        '= \\frac{\\pi}{6} \\approx 0.5236\\text{ rad}',
    );
  });

  it('substitutes the unsigned angle into the arc equation', () => {
    // s = r|θ|: a length has no sign even when the sweep is clockwise.
    expect(buildReadout(-30, 1).arc).toBe(
      's = r|\\theta| = 1 \\times \\frac{\\pi}{6} \\approx 0.5236',
    );
  });

  it('scales the arc by r', () => {
    expect(buildReadout(180, 1.5).arc).toBe(
      's = r|\\theta| = 1.5 \\times \\pi \\approx 4.7124',
    );
  });

  it('speaks the exact forms as prose, with no LaTeX for a screen reader to mangle', () => {
    const out = buildReadout(30, 1);
    expect(out.spoken).toContain('1 over 12 of a full turn');
    expect(out.spoken).toContain('pi over 6');
    expect(out.spoken).not.toContain('\\');
  });
});

describe('buildReadout — non-integer degrees fall back to decimals', () => {
  it('emits no absurd reduced fraction for a typed radian value', () => {
    // 1 rad is 57.2958°, whose deg/180 has no meaningful integer reduction.
    const out = buildReadout(57.2958, 1);
    expect(out.chain).toBe('57.2958^\\circ = 1\\text{ rad}');
    expect(out.chain).not.toContain('full turn');
  });

  it('agrees with English grammar for a singular radian', () => {
    expect(buildReadout(57.2958, 1).spoken).toContain('1 radian.');
    expect(buildReadout(57.2958, 1).spoken).not.toContain('1 radians');
  });
});
```

- [ ] **Step 7: Run it and confirm it fails**

Run: `npx vitest run src/scripts/explorer/angle-readout.test.ts`
Expected: FAIL — `Failed to resolve import './angle-readout'`.

- [ ] **Step 8: Create `angle-readout.ts` by moving the function verbatim**

Create `src/scripts/explorer/angle-readout.ts` with the module doc comment below, then move `buildReadout` **unchanged** from `AngleExplorer.tsx:47-92` (its body and all its comments):

```ts
/**
 * The Angle Explorer's five-way identity chain and arc-length line, in all three
 * output alphabets.
 *
 * Extracted from `AngleExplorer.tsx` because vitest collects only `.ts` in the
 * node environment — the branching here (exact forms for whole degrees, decimals
 * otherwise, singular/plural agreement) is the part worth testing, and it was
 * unreachable while it lived inside the component.
 */
import {
  arcLength,
  degreesToRadians,
  formatFractionLatex,
  formatFractionSpoken,
  formatPiLatex,
  formatPiSpoken,
  isIntegerDegrees,
  piMultiple,
  turnFraction,
} from './angle';
import { round4 } from './format';

export interface AngleReadout {
  /** KaTeX source for the identity chain. */
  chain: string;
  /** KaTeX source for the arc-length line. */
  arc: string;
  /** Screen-reader prose. No LaTeX markup. */
  spoken: string;
}

export function buildReadout(theta: number, r: number): AngleReadout {
  // ...body moved verbatim from AngleExplorer.tsx:48-91...
}
```

In `AngleExplorer.tsx`: delete lines 47-92 (`buildReadout` and its doc comment), add `import { buildReadout } from '@/scripts/explorer/angle-readout';`, and prune the now-unused names from the `'@/scripts/explorer/angle'` import — `arcLength`, `formatFractionLatex`, `formatFractionSpoken`, `formatPiSpoken`, `turnFraction` are only used by `buildReadout`. `degreesToRadians`, `isIntegerDegrees`, `piMultiple`, `formatPiLatex`, `formatPiText`, `formatFractionText` and the `Fraction` type are still used directly by the component.

- [ ] **Step 9: Run and confirm green**

Run: `npx vitest run src/scripts/explorer/angle-readout.test.ts`
Expected: PASS — all 6 tests, including the verbose 30° chain.

Run: `npx astro check`
Expected: no errors, and **no unused-import warnings** (proves the import pruning is right).

Run: `npm test`
Expected: the whole unit suite passes; nothing else consumed `buildReadout`.

- [ ] **Step 10: Commit**

Append a `SUMMARY.md` entry (Change Type: Refactor, Scope: Angle Explorer — readout), then:

```bash
git add src/scripts/explorer/angle-readout.ts src/scripts/explorer/angle-readout.test.ts \
        src/components/explorer/AngleExplorer.tsx SUMMARY.md
git commit -m "refactor(explorer): extract buildReadout into a testable module

vitest collects only .ts in the node env, so the readout's branching was
unreachable while it lived inside the component. Moved verbatim and
characterised, so the θ=0 fix that follows is a visible diff."
```

---

### Task 2: Collapse the θ = 0 readout

At θ = 0 the chain currently reads `0° = 0 of a full turn = 0 × 2π = 0 ≈ 0 rad` — true, but mush, and with task 8's new default it becomes the first thing every visitor reads.

**Files:**
- Modify: `src/scripts/explorer/angle-readout.ts`
- Modify: `src/scripts/explorer/angle-readout.test.ts`

**Interfaces:**
- Consumes: `buildReadout` from task 1
- Produces: no signature change. `buildReadout(0, r)` returns a collapsed `chain` and an exact `=` in `arc`.

- [ ] **Step 1: Write the failing test**

Append to `src/scripts/explorer/angle-readout.test.ts`:

```ts
describe('buildReadout — θ = 0 states the identity once', () => {
  it('collapses the chain instead of repeating zero four times', () => {
    // "0° = 0 of a full turn = 0 × 2π = 0 ≈ 0 rad" is true and useless. With the
    // 0° default this is the first mathematics every visitor reads.
    const out = buildReadout(0, 1);
    expect(out.chain).toBe('0^\\circ = 0\\text{ rad}');
    expect(out.chain).not.toContain('full turn');
    expect(out.chain).not.toContain('2\\pi');
  });

  it('uses = rather than ≈ for the arc, because r × 0 is exactly 0', () => {
    expect(buildReadout(0, 1).arc).toBe('s = r|\\theta| = 1 \\times 0 = 0');
    expect(buildReadout(0, 1.5).arc).toBe('s = r|\\theta| = 1.5 \\times 0 = 0');
    expect(buildReadout(0, 1).arc).not.toContain('\\approx');
  });

  it('speaks the collapsed form', () => {
    const out = buildReadout(0, 1);
    expect(out.spoken).toContain('0 degrees is 0 radians.');
    expect(out.spoken).not.toContain('of a full turn');
  });

  it('leaves every non-zero angle untouched', () => {
    // Regression guard: the collapse must be a θ = 0 special case, not a
    // simplification that leaks into small or negative angles.
    expect(buildReadout(1, 1).chain).toContain('full turn');
    expect(buildReadout(-30, 1).chain).toContain('full turn');
    expect(buildReadout(360, 1).chain).toContain('full turn');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/scripts/explorer/angle-readout.test.ts -t "θ = 0"`
Expected: FAIL — received `'0^\\circ = 0\\text{ of a full turn} = 0 \\times 2\\pi = 0 \\approx 0\\text{ rad}'`.

- [ ] **Step 3: Add the special case**

In `angle-readout.ts`, insert this block immediately after the `isIntegerDegrees` early-return branch and before `const whole = Math.round(theta);`:

```ts
  // θ = 0 is the one angle whose every exact form is the same symbol, so the
  // full chain degenerates into "0 = 0 = 0 = 0". State it once. With 0° as the
  // explorer's default this is the first mathematics a visitor reads, and the
  // arc relation is `=` rather than `≈` because r × 0 is exactly 0 for any r.
  if (Math.round(theta) === 0) {
    return {
      chain: '0^\\circ = 0\\text{ rad}',
      arc: `s = r|\\theta| = ${round4(r)} \\times 0 = 0`,
      spoken: `0 degrees is 0 radians. Arc length is ${round4(r)} times 0, giving 0.`,
    };
  }
```

Guarding on `Math.round(theta) === 0` rather than `theta === 0` matches the surrounding code, which has already established that `isIntegerDegrees` only confirms θ is *within* `DEG_EPS` of an integer — a typed value can be `4e-17` rather than a literal zero.

- [ ] **Step 4: Run and confirm green**

Run: `npx vitest run src/scripts/explorer/angle-readout.test.ts`
Expected: PASS — all 10 tests, including task 1's four characterization tests unchanged.

- [ ] **Step 5: Commit**

Append a `SUMMARY.md` entry (Change Type: Fix, Scope: Angle Explorer — readout), then:

```bash
git add src/scripts/explorer/angle-readout.ts src/scripts/explorer/angle-readout.test.ts SUMMARY.md
git commit -m "fix(explorer): state the θ=0 identity once instead of four times

\"0° = 0 of a full turn = 0 × 2π = 0 ≈ 0 rad\" is true and useless, and the
0° default makes it the first mathematics a visitor reads. Also tightens
the arc relation to = , since r × 0 is exactly 0."
```

---

### Task 3: Add the `wave` palette colour

All six existing `ExplorerColors` entries are already used in the angle figure — `curve` is the swept arc, `floor` the initial ray, `wall` the terminal ray, `arrow` the measure arc, `axis`/`ghost` the reference geometry. The wave and its projection leg need a seventh.

**Files:**
- Modify: `src/scripts/graphing/theme.ts:75-121` (interface + both palettes)
- Modify: `src/scripts/graphing/theme.test.ts:80` (add to `MARK_KEYS`)

**Interfaces:**
- Produces: `ExplorerColors.wave: string` — consumed by tasks 6, 7, 9, 10.

- [ ] **Step 1: Write the failing test**

In `src/scripts/graphing/theme.test.ts`, add `'wave'` to the existing `MARK_KEYS` tuple on line 80:

```ts
  const MARK_KEYS = ['curve', 'wall', 'floor', 'arrow', 'ghost', 'axis', 'wave'] as const;
```

Then append a new describe block at the end of the file:

```ts
describe('the wave colour is distinguishable from the marks it sits beside', () => {
  // The projection leg is drawn inside the polar figure, where six other marks
  // already compete. Contrast against the BACKGROUND is covered by MARK_KEYS
  // above; this guards against picking a hue that reads as one of the others.
  for (const dark of [true, false] as const) {
    const label = dark ? 'dark' : 'light';
    const c = explorerColors(dark);

    it(`${label}: wave differs from every other overlay mark`, () => {
      const others = [c.curve, c.wall, c.floor, c.arrow, c.ghost, c.axis];
      expect(others).not.toContain(c.wave);
    });

    it(`${label}: wave separates from the initial-side ray it runs alongside`, () => {
      // The cos leg lies ON the initial side. If the two colours are close, the
      // leg vanishes into the ray it is supposed to be measuring against.
      expect(lineContrast(c.wave, 1, c.floor)).toBeGreaterThanOrEqual(1.5);
    });
  }
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/scripts/graphing/theme.test.ts`
Expected: FAIL — the `MARK_KEYS` loop reports `wave clears 3:1` receiving `NaN` (from `hexToRgb(undefined)`), and the new block fails on `c.wave` being `undefined`.

- [ ] **Step 3: Add the colour**

In `theme.ts`, add to the `ExplorerColors` interface after `axis`:

```ts
  /** The traced sin/cos wave and the reference-triangle leg it measures. */
  wave: string;
```

In `explorerColors`, add to the dark branch:

```ts
        wave: '#2dd4bf',
```

and to the light branch:

```ts
        // Teal, chosen to sit apart from the violet curve, red terminal ray,
        // blue initial ray and orange measure arc that already occupy this
        // figure. teal-700 rather than a lighter tint so it clears 3:1 on white.
        wave: '#0f766e',
```

- [ ] **Step 4: Run and confirm green**

Run: `npx vitest run src/scripts/graphing/theme.test.ts`
Expected: PASS — 14 mark-contrast tests (7 keys × 2 themes) plus the 4 new distinguishability tests.

**If a contrast assertion fails**, the hex is wrong, not the test. Darken the light value or brighten the dark value and re-run. If the `floor` separation assertion fails, switch families to green (`#15803d` light / `#4ade80` dark) as the spec records.

Run: `npm test`
Expected: whole suite green. Adding an interface member is source-compatible for every existing consumer because they only read.

- [ ] **Step 5: Commit**

Append a `SUMMARY.md` entry (Change Type: Feature, Scope: Theme palette), then:

```bash
git add src/scripts/graphing/theme.ts src/scripts/graphing/theme.test.ts SUMMARY.md
git commit -m "feat(theme): add the wave colour to the explorer palette

All six existing entries are already used in the angle figure, so the wave
and its projection leg need a seventh. Test-enforced for 3:1 non-text
contrast in both themes and for separation from the initial-side ray."
```

---

### Task 4: `angle-wave.ts` — types, scales, ticks and values

**Files:**
- Create: `src/scripts/explorer/angle-wave.ts`
- Create: `src/scripts/explorer/angle-wave.test.ts`

**Interfaces:**
- Consumes: `degreesToRadians`, `formatPiText`, `reduceFraction` from `angle.ts`
- Produces (all used by tasks 5-10):
  - `type WaveFn = 'sin' | 'cos'`
  - `type WaveMode = 'none' | WaveFn`
  - `interface WaveTick { k: number; radians: number }`
  - `interface WaveScales { xFor(radians: number): number; yFor(value: number): number }`
  - `WAVE_WIDTH = 512`, `WAVE_HEIGHT = 176`, `AMP_MAX = 1.5`
  - `waveScales(width?: number, height?: number): WaveScales`
  - `waveTickRadians(): WaveTick[]`
  - `waveTickLabel(k: number): string`
  - `waveValue(fn: WaveFn, theta: number, r: number): number`

- [ ] **Step 1: Write the failing test**

Create `src/scripts/explorer/angle-wave.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

import {
  AMP_MAX,
  WAVE_HEIGHT,
  WAVE_WIDTH,
  waveScales,
  waveTickLabel,
  waveTickRadians,
  waveValue,
} from './angle-wave';

describe('waveTickRadians', () => {
  it('emits every multiple of π/4 across -2π…2π — seventeen of them', () => {
    const ticks = waveTickRadians();
    expect(ticks).toHaveLength(17);
    expect(ticks[0]).toEqual({ k: -8, radians: -2 * Math.PI });
    expect(ticks[8]).toEqual({ k: 0, radians: 0 });
    expect(ticks[16]).toEqual({ k: 8, radians: 2 * Math.PI });
  });

  it('spaces them exactly π/4 apart', () => {
    const ticks = waveTickRadians();
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]!.radians - ticks[i - 1]!.radians).toBeCloseTo(Math.PI / 4, 12);
    }
  });
});

describe('waveTickLabel', () => {
  it('reduces to the exact π form, reusing the Radians field\'s own formatter', () => {
    expect(waveTickLabel(0)).toBe('0');
    expect(waveTickLabel(1)).toBe('π/4');
    expect(waveTickLabel(2)).toBe('π/2');
    expect(waveTickLabel(3)).toBe('3π/4');
    expect(waveTickLabel(4)).toBe('π');
    expect(waveTickLabel(6)).toBe('3π/2');
    expect(waveTickLabel(8)).toBe('2π');
  });

  it('signs negatives with an ASCII hyphen', () => {
    expect(waveTickLabel(-1)).toBe('-π/4');
    expect(waveTickLabel(-7)).toBe('-7π/4');
    expect(waveTickLabel(-8)).toBe('-2π');
    expect(waveTickLabel(-8)).not.toContain('−');
  });
});

describe('waveValue', () => {
  it('is the terminal point\'s coordinate, so the radius is the amplitude', () => {
    expect(waveValue('sin', 90, 1)).toBeCloseTo(1, 12);
    expect(waveValue('sin', 90, 1.5)).toBeCloseTo(1.5, 12);
    expect(waveValue('cos', 0, 1.5)).toBeCloseTo(1.5, 12);
    expect(waveValue('cos', 180, 0.5)).toBeCloseTo(-0.5, 12);
  });

  it('starts sin at zero and cos at r — how the two differ at θ = 0', () => {
    expect(waveValue('sin', 0, 1.2)).toBeCloseTo(0, 12);
    expect(waveValue('cos', 0, 1.2)).toBeCloseTo(1.2, 12);
  });

  it('is odd in θ for sin and even in θ for cos', () => {
    for (const theta of [17, 45, 90, 137, 210, 359]) {
      expect(waveValue('sin', -theta, 1)).toBeCloseTo(-waveValue('sin', theta, 1), 12);
      expect(waveValue('cos', -theta, 1)).toBeCloseTo(waveValue('cos', theta, 1), 12);
    }
  });
});

describe('waveScales', () => {
  const s = waveScales();

  it('puts -2π on the left edge, 0 at the centre and 2π on the right edge', () => {
    const left = s.xFor(-2 * Math.PI);
    const centre = s.xFor(0);
    const right = s.xFor(2 * Math.PI);
    expect(centre).toBeCloseTo(WAVE_WIDTH / 2, 6);
    expect(left).toBeLessThan(centre);
    expect(right).toBeGreaterThan(centre);
    expect(centre - left).toBeCloseTo(right - centre, 6);
  });

  it('is linear in radians', () => {
    const a = s.xFor(0);
    const b = s.xFor(Math.PI / 4);
    const c = s.xFor(Math.PI / 2);
    expect(c - b).toBeCloseTo(b - a, 6);
  });

  it('fixes the y domain at ±AMP_MAX so the amplitude change is visible', () => {
    // A y-scale that adapted to r would cancel out the very change the radius
    // slider is meant to demonstrate.
    expect(s.yFor(AMP_MAX)).toBeLessThan(s.yFor(0));
    expect(s.yFor(-AMP_MAX)).toBeGreaterThan(s.yFor(0));
    expect(s.yFor(0) - s.yFor(AMP_MAX)).toBeCloseTo(s.yFor(-AMP_MAX) - s.yFor(0), 6);
  });

  it('keeps every reachable value inside the box', () => {
    for (const v of [-AMP_MAX, -1, 0, 1, AMP_MAX]) {
      expect(s.yFor(v)).toBeGreaterThanOrEqual(0);
      expect(s.yFor(v)).toBeLessThanOrEqual(WAVE_HEIGHT);
    }
  });

  it('accepts a custom box, so the export can fill its own slot', () => {
    // 960 × 190 is the export slot. Reusing the live 512 × 176 viewBox there
    // would letterbox the strip to ~552px inside a 960px box.
    const wide = waveScales(960, 190);
    expect(wide.xFor(0)).toBeCloseTo(480, 6);
    expect(wide.xFor(2 * Math.PI)).toBeGreaterThan(wide.xFor(0));
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/scripts/explorer/angle-wave.test.ts`
Expected: FAIL — `Failed to resolve import './angle-wave'`.

- [ ] **Step 3: Create the module**

Create `src/scripts/explorer/angle-wave.ts`:

```ts
/**
 * Pure geometry and SVG-markup builder for the Angle Explorer's wave strip.
 *
 * The strip shows what sweeping the angle *generates*: with `sin θ` or `cos θ`
 * selected, the curve is traced from 0 out to the current θ. There is no
 * animation — θ is the single source of truth and this module derives from it,
 * exactly as `angle-coordinates.ts` and `angle-diagram.ts` already do.
 *
 * DOM-free by construction (string concatenation, no `document`), so every
 * scale and arc decision unit-tests in the node environment — the same contract
 * `angle-diagram.ts` follows, and the reason the live figure and the exported
 * artifact draw through one builder and cannot drift.
 */
import type { ExplorerColors } from '@/scripts/graphing/theme';
import { degreesToRadians, formatPiText, reduceFraction } from './angle';

/** Which coordinate of the terminal point the strip plots. */
export type WaveFn = 'sin' | 'cos';

/** The selector's full state. `none` draws no strip at all. */
export type WaveMode = 'none' | WaveFn;

/** Live-figure viewBox. The container is fluid, so this scales with the column. */
export const WAVE_WIDTH = 512;
export const WAVE_HEIGHT = 176;

/**
 * Half-height of the y domain, fixed at the radius slider's maximum.
 *
 * Deliberately NOT derived from the current r: a y-scale that adapted to the
 * radius would redraw every amplitude to the same on-screen height, cancelling
 * out the one thing the radius slider exists to show.
 */
export const AMP_MAX = 1.5;

/** Padding inside the viewBox. `bottom` reserves both staggered label baselines. */
const PAD = { left: 8, right: 8, top: 12, bottom: 34 } as const;

/** Total x span: -2π to 2π, matching the angle slider's -360°…360°. */
const X_SPAN = 4 * Math.PI;

export interface WaveTick {
  /** Integer numerator over 4, so k = 6 is 3π/2. */
  k: number;
  radians: number;
}

export interface WaveScales {
  /** Radians → viewBox x. */
  xFor(radians: number): number;
  /** Value (in units) → viewBox y. */
  yFor(value: number): number;
}

export function waveScales(
  width: number = WAVE_WIDTH,
  height: number = WAVE_HEIGHT,
): WaveScales {
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  return {
    xFor: (radians) => PAD.left + ((radians + X_SPAN / 2) / X_SPAN) * plotW,
    // SVG y grows downward, so the domain is inverted here — the same flip
    // `angle-render.ts` applies by negating its sine.
    yFor: (value) => PAD.top + ((AMP_MAX - value) / (2 * AMP_MAX)) * plotH,
  };
}

/** Every multiple of π/4 from -2π to 2π inclusive: seventeen ticks. */
export function waveTickRadians(): WaveTick[] {
  return Array.from({ length: 17 }, (_, i) => {
    const k = i - 8;
    return { k, radians: (k * Math.PI) / 4 };
  });
}

/**
 * A tick's exact π label: `-2π`, `-7π/4`, … `0` … `7π/4`, `2π`.
 *
 * Routed through `reduceFraction` + `formatPiText` rather than a lookup table,
 * so the axis and the Radians field's exact companion can never express the
 * same quantity in different notation.
 */
export function waveTickLabel(k: number): string {
  return formatPiText(reduceFraction(k, 4));
}

/** The plotted value: the terminal point's y (sin) or x (cos), scaled by r. */
export function waveValue(fn: WaveFn, theta: number, r: number): number {
  const rad = degreesToRadians(theta);
  return fn === 'sin' ? r * Math.sin(rad) : r * Math.cos(rad);
}
```

- [ ] **Step 4: Run and confirm green**

Run: `npx vitest run src/scripts/explorer/angle-wave.test.ts`
Expected: PASS — 11 tests.

- [ ] **Step 5: Commit**

Append a `SUMMARY.md` entry (Change Type: Feature, Scope: Angle Explorer — wave scales), then:

```bash
git add src/scripts/explorer/angle-wave.ts src/scripts/explorer/angle-wave.test.ts SUMMARY.md
git commit -m "feat(explorer): add wave strip scales, π/4 ticks and values

x spans -2π…2π to match the angle slider's range; y is fixed at ±1.5 so the
radius slider's amplitude change stays visible. Tick labels route through
reduceFraction + formatPiText, so the axis and the Radians field cannot
disagree on notation."
```

---

### Task 5: `angle-wave.ts` — the traced path and its prose

**Files:**
- Modify: `src/scripts/explorer/angle-wave.ts`
- Modify: `src/scripts/explorer/angle-wave.test.ts`

**Interfaces:**
- Consumes: `waveScales`, `waveValue`, `WaveFn`, `WaveScales` from task 4
- Produces:
  - `wavePath(fn: WaveFn, theta: number, r: number, scales: WaveScales): string`
  - `waveSpoken(fn: WaveFn, theta: number, r: number): string`

- [ ] **Step 1: Write the failing test**

Append to `src/scripts/explorer/angle-wave.test.ts`, and add `wavePath, waveSpoken` to the import block:

```ts
/** Pull the vertices back out of an `M x y L x y …` path. */
function vertices(path: string): Array<{ x: number; y: number }> {
  return [...path.matchAll(/[ML] ([-\d.e]+) ([-\d.e]+)/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }));
}

describe('wavePath', () => {
  const s = waveScales();

  it('draws nothing at θ = 0 — a zero-length trace is nothing, not a degenerate path', () => {
    // Same threshold and same reasoning as arcPath in angle-render.ts.
    expect(wavePath('sin', 0, 1, s)).toBe('');
    expect(wavePath('cos', 0, 1, s)).toBe('');
    expect(wavePath('sin', 1e-12, 1, s)).toBe('');
  });

  it('starts at θ = 0 and ends exactly at θ, so the curve meets the marker', () => {
    const v = vertices(wavePath('sin', 137, 1, s));
    expect(v[0]!.x).toBeCloseTo(s.xFor(0), 6);
    expect(v.at(-1)!.x).toBeCloseTo(s.xFor(degreesToRadians(137)), 6);
    expect(v.at(-1)!.y).toBeCloseTo(s.yFor(waveValue('sin', 137, 1)), 6);
  });

  it('grows rightward for positive θ and leftward for negative θ', () => {
    expect(vertices(wavePath('sin', 90, 1, s)).at(-1)!.x).toBeGreaterThan(s.xFor(0));
    expect(vertices(wavePath('sin', -90, 1, s)).at(-1)!.x).toBeLessThan(s.xFor(0));
  });

  it('samples densely enough to read as a curve, and bounds the vertex count', () => {
    // 2° steps: 360° needs 181 vertices. Enough to look smooth, few enough that
    // a slider drag redraws without a visible cost.
    const full = vertices(wavePath('sin', 360, 1, s));
    expect(full.length).toBe(181);
    expect(vertices(wavePath('sin', 10, 1, s)).length).toBe(6);
  });

  it('scales the traced height by r', () => {
    const peakAt = (r: number) => vertices(wavePath('sin', 90, r, s)).at(-1)!.y;
    expect(peakAt(1.5)).toBeCloseTo(s.yFor(1.5), 6);
    expect(peakAt(0.5)).toBeCloseTo(s.yFor(0.5), 6);
    expect(peakAt(1.5)).toBeLessThan(peakAt(0.5));
  });

  it('emits no NaN across the whole θ × r domain', () => {
    for (let theta = -360; theta <= 360; theta += 7) {
      for (const r of [0.5, 1, 1.5]) {
        for (const fn of ['sin', 'cos'] as const) {
          const path = wavePath(fn, theta, r, s);
          expect(path).not.toContain('NaN');
          expect(path).not.toContain('undefined');
        }
      }
    }
  });

  it('keeps every vertex inside the viewBox', () => {
    for (let theta = -360; theta <= 360; theta += 11) {
      for (const v of vertices(wavePath('cos', theta, AMP_MAX, s))) {
        expect(v.x).toBeGreaterThanOrEqual(0);
        expect(v.x).toBeLessThanOrEqual(WAVE_WIDTH);
        expect(v.y).toBeGreaterThanOrEqual(0);
        expect(v.y).toBeLessThanOrEqual(WAVE_HEIGHT);
      }
    }
  });
});

describe('waveSpoken', () => {
  it('names the function and the swept range for the live region', () => {
    expect(waveSpoken('sin', 135, 1)).toBe(
      'Sine wave traced from 0 to 135 degrees. sin of theta is 0.7071.',
    );
    expect(waveSpoken('cos', 0, 1.5)).toBe(
      'Cosine wave traced from 0 to 0 degrees. cos of theta is 1.5.',
    );
  });

  it('carries no LaTeX for a screen reader to read aloud', () => {
    expect(waveSpoken('cos', -210, 1.2)).not.toContain('\\');
    expect(waveSpoken('cos', -210, 1.2)).toContain('-210 degrees');
  });
});
```

Add `degreesToRadians` to the test file's imports from `'./angle'`.

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/scripts/explorer/angle-wave.test.ts -t "wavePath"`
Expected: FAIL — `wavePath is not a function`.

- [ ] **Step 3: Implement both functions**

Append to `src/scripts/explorer/angle-wave.ts`:

```ts
/** Below this, a sweep is nothing rather than a degenerate path. Mirrors `arcPath`. */
const ZERO_DEG = 1e-9;

/** Sampling interval along θ, in degrees. 360° yields 181 vertices. */
const STEP_DEG = 2;

/**
 * The curve traced from 0 out to θ, as an SVG path.
 *
 * Grows in whichever direction θ points, so a negative angle traces leftward
 * from the origin and sin's odd symmetry / cos's even symmetry become visible by
 * dragging rather than by assertion. The final vertex is snapped to θ exactly
 * (rather than to the last whole step) so the curve always meets the marker,
 * which is positioned from θ itself.
 *
 * Returns `''` below `ZERO_DEG` — the same gate `arcPath` applies, for the same
 * reason. Note the marker is drawn independently of this, so at θ = 0 `cos`
 * still shows a dot at r while `sin` shows one at 0.
 */
export function wavePath(
  fn: WaveFn,
  theta: number,
  r: number,
  scales: WaveScales,
): string {
  if (Math.abs(theta) < ZERO_DEG) return '';

  const dir = theta < 0 ? -1 : 1;
  const steps = Math.ceil(Math.abs(theta) / STEP_DEG);
  const points: string[] = [];

  for (let i = 0; i <= steps; i++) {
    const at = i === steps ? theta : dir * i * STEP_DEG;
    const x = scales.xFor(degreesToRadians(at));
    const y = scales.yFor(waveValue(fn, at, r));
    points.push(`${x} ${y}`);
  }

  return `M ${points[0]}${points.slice(1).map((p) => ` L ${p}`).join('')}`;
}

/** Whole-degree display, matching what the Degrees field shows. */
const degreeText = (theta: number): string => String(Math.round(theta * 1e4) / 1e4);

/**
 * The strip as prose, for the existing debounced live region. Both KaTeX boxes
 * are `aria-hidden`, so this is the only channel a screen-reader user has.
 */
export function waveSpoken(fn: WaveFn, theta: number, r: number): string {
  const name = fn === 'sin' ? 'Sine' : 'Cosine';
  const value = Math.round(waveValue(fn, theta, r) * 1e4) / 1e4;
  return (
    `${name} wave traced from 0 to ${degreeText(theta)} degrees. ` +
    `${fn} of theta is ${value}.`
  );
}
```

- [ ] **Step 4: Run and confirm green**

Run: `npx vitest run src/scripts/explorer/angle-wave.test.ts`
Expected: PASS — 20 tests.

If the `waveSpoken` assertions fail on a value like `0.7071000000000001`, the rounding is the bug — confirm the `Math.round(x * 1e4) / 1e4` is applied to the value and not to the string.

- [ ] **Step 5: Commit**

Append a `SUMMARY.md` entry (Change Type: Feature, Scope: Angle Explorer — wave path), then:

```bash
git add src/scripts/explorer/angle-wave.ts src/scripts/explorer/angle-wave.test.ts SUMMARY.md
git commit -m "feat(explorer): trace the wave from 0 to θ

Grows in whichever direction θ points, with the final vertex snapped to θ
exactly so the curve meets its marker. Returns '' below 1e-9, the same gate
arcPath applies — a zero-length trace is nothing, not a degenerate path."
```

---

### Task 6: `angle-wave.ts` — the SVG markup

**Files:**
- Modify: `src/scripts/explorer/angle-wave.ts`
- Modify: `src/scripts/explorer/angle-wave.test.ts`

**Interfaces:**
- Consumes: everything from tasks 4-5, plus `ExplorerColors` (now including `wave`) from task 3
- Produces: `buildWaveSvg(opts: WaveDiagramOptions): string` — inner markup only; the caller owns the outer `<svg>`, its viewBox and its accessible name. Consumed by tasks 9 and 10.

- [ ] **Step 1: Write the failing test**

Append to `src/scripts/explorer/angle-wave.test.ts`, adding `buildWaveSvg` to the imports plus `import { explorerColors } from '@/scripts/graphing/theme';`:

```ts
const colors = explorerColors(false);
const tickText = '#334155';
const waveBase = { r: 1, colors, tickText };

describe('buildWaveSvg', () => {
  it('draws all seventeen π/4 ticks with their exact labels', () => {
    const svg = buildWaveSvg({ ...waveBase, fn: 'sin', theta: 90 });
    expect([...svg.matchAll(/data-role="wave-tick"/g)]).toHaveLength(17);
    for (const label of ['-2π', '-7π/4', '-π/2', '0', 'π/4', 'π', '3π/2', '2π']) {
      expect(svg).toContain(`>${label}</text>`);
    }
  });

  it('staggers odd π/4 labels onto a second baseline so they do not collide', () => {
    // 17 labels on one baseline gives each ~29px where -7π/4 needs ~25px.
    const svg = buildWaveSvg({ ...waveBase, fn: 'sin', theta: 90 });
    const yOf = (label: string) =>
      Number(svg.match(new RegExp(`<text[^>]*y="([-\\d.]+)"[^>]*>${label.replace('/', '\\/')}</text>`))![1]);
    expect(yOf('π/2')).not.toBe(yOf('π/4'));
    expect(yOf('π/2')).toBe(yOf('π'));
    expect(yOf('π/4')).toBe(yOf('3π/4'));
  });

  it('draws the ±1 references dashed, like the figure\'s dashed unit circle', () => {
    const svg = buildWaveSvg({ ...waveBase, fn: 'sin', theta: 90 });
    expect([...svg.matchAll(/data-role="wave-unit-ref"/g)]).toHaveLength(2);
    expect(svg).toContain('stroke-dasharray="3 3"');
  });

  it('draws the traced curve in the wave colour', () => {
    const svg = buildWaveSvg({ ...waveBase, fn: 'sin', theta: 90 });
    expect(svg).toContain('data-role="wave-curve"');
    expect(svg).toContain(colors.wave);
  });

  it('omits the curve element entirely at θ = 0 rather than emitting an empty path', () => {
    const svg = buildWaveSvg({ ...waveBase, fn: 'sin', theta: 0 });
    expect(svg).not.toContain('data-role="wave-curve"');
    expect(svg).not.toContain('d=""');
  });

  it('always draws the marker, so cos reads as non-zero at θ = 0 where sin reads as zero', () => {
    const s = waveScales();
    const markerY = (fn: 'sin' | 'cos') => {
      const svg = buildWaveSvg({ ...waveBase, fn, theta: 0 });
      return Number(svg.match(/data-role="wave-marker"[^>]*cy="([-\d.]+)"/)![1]);
    };
    expect(markerY('sin')).toBeCloseTo(s.yFor(0), 6);
    expect(markerY('cos')).toBeCloseTo(s.yFor(1), 6);
    expect(markerY('sin')).not.toBeCloseTo(markerY('cos'), 3);
  });

  it('uses the circle\'s own point colours for the marker — this is the link', () => {
    // Stacked layout forecloses a tie-line, so a shared marker colour and the
    // projection leg are what connect the strip to the terminal point.
    const svg = buildWaveSvg({ ...waveBase, fn: 'sin', theta: 45 });
    const marker = svg.match(/<circle data-role="wave-marker"[^>]*>/)![0];
    expect(marker).toContain(`fill="${colors.point}"`);
    expect(marker).toContain(`stroke="${colors.pointStroke}"`);
  });

  it('drops a line from the marker to the zero axis to show the signed height', () => {
    expect(buildWaveSvg({ ...waveBase, fn: 'sin', theta: 45 })).toContain(
      'data-role="wave-drop"',
    );
  });

  it('honours a custom box so the export can fill its 960 × 190 slot', () => {
    const svg = buildWaveSvg({ ...waveBase, fn: 'sin', theta: 90, width: 960, height: 190 });
    const cx = Number(svg.match(/data-role="wave-marker"[^>]*cx="([-\d.]+)"/)![1]);
    expect(cx).toBeCloseTo(waveScales(960, 190).xFor(Math.PI / 2), 6);
  });

  it('emits no NaN across the whole domain', () => {
    for (let theta = -360; theta <= 360; theta += 7) {
      for (const r of [0.5, 1, 1.5]) {
        for (const fn of ['sin', 'cos'] as const) {
          const svg = buildWaveSvg({ ...waveBase, fn, theta, r });
          expect(svg).not.toContain('NaN');
          expect(svg).not.toContain('undefined');
        }
      }
    }
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/scripts/explorer/angle-wave.test.ts -t "buildWaveSvg"`
Expected: FAIL — `buildWaveSvg is not a function`.

- [ ] **Step 3: Implement the builder**

Append to `src/scripts/explorer/angle-wave.ts`:

```ts
/** Font size of the π/4 tick labels, in px. */
const TICK_FONT_SIZE = 10;
/** Offsets of the two staggered label baselines from the viewBox bottom, in px. */
const LABEL_BASELINE = { primary: 20, secondary: 6 } as const;
/** Half-length of a tick's vertical line beyond the plot area, in px. */
const TICK_OVERSHOOT = 4;
/** Marker radius, in px. Matches the polar figure's endpoint dots. */
const MARKER_R = 3.5;

export interface WaveDiagramOptions {
  fn: WaveFn;
  /** Swept angle in degrees — the same θ that drives the circle. */
  theta: number;
  /** Circle radius. The wave's amplitude. */
  r: number;
  colors: ExplorerColors;
  /** Stroke colour for the π/4 tick labels. */
  tickText: string;
  /** viewBox width, px. Defaults to the live strip's 512. */
  width?: number;
  /** viewBox height, px. Defaults to the live strip's 176. */
  height?: number;
}

/**
 * Build the wave strip's SVG children as a markup string — π/4 gridlines and
 * their staggered exact-π labels, the zero axis, the dashed ±1 references, the
 * curve traced from 0 to θ, and the marker with its drop-line.
 *
 * Returns only the INNER markup; the caller owns the outer `<svg>`, its viewBox
 * and its accessible name. Both the live component and the export snapshot draw
 * through this one builder, differing only in the box they pass, so the figure
 * on screen and the figure in the PNG cannot drift apart.
 */
export function buildWaveSvg(opts: WaveDiagramOptions): string {
  const { fn, theta, r, colors, tickText } = opts;
  const width = opts.width ?? WAVE_WIDTH;
  const height = opts.height ?? WAVE_HEIGHT;
  const s = waveScales(width, height);

  const top = s.yFor(AMP_MAX);
  const bottom = s.yFor(-AMP_MAX);
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
      // The π/2 multiples (even k) hold the primary baseline; odd π/4 multiples
      // drop to the second, doubling each label's horizontal room.
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

  const path = wavePath(fn, theta, r, s);
  const curve =
    path !== ''
      ? `<path data-role="wave-curve" d="${path}" fill="none" stroke="${colors.wave}" ` +
        `stroke-width="2.5" stroke-linejoin="round" />`
      : '';

  const markerX = s.xFor(degreesToRadians(theta));
  const markerY = s.yFor(waveValue(fn, theta, r));

  return (
    ticks +
    unitRefs +
    // Zero axis and the x = 0 vertical, matching the polar figure's reference axes.
    `<line x1="${s.xFor(-X_SPAN / 2)}" y1="${zeroY}" x2="${s.xFor(X_SPAN / 2)}" y2="${zeroY}" ` +
    `stroke="${colors.axis}" stroke-width="1" />` +
    `<line x1="${s.xFor(0)}" y1="${top}" x2="${s.xFor(0)}" y2="${bottom}" ` +
    `stroke="${colors.axis}" stroke-width="1" />` +
    curve +
    `<line data-role="wave-drop" x1="${markerX}" y1="${zeroY}" x2="${markerX}" y2="${markerY}" ` +
    `stroke="${colors.wave}" stroke-width="1" stroke-dasharray="2 2" />` +
    // Drawn unconditionally, unlike the curve: at θ = 0 the marker is the only
    // thing that distinguishes cos (at r) from sin (at 0).
    `<circle data-role="wave-marker" cx="${markerX}" cy="${markerY}" r="${MARKER_R}" ` +
    `fill="${colors.point}" stroke="${colors.pointStroke}" />`
  );
}
```

- [ ] **Step 4: Run and confirm green**

Run: `npx vitest run src/scripts/explorer/angle-wave.test.ts`
Expected: PASS — 30 tests.

Run: `npm test`
Expected: whole unit suite green.

- [ ] **Step 5: Commit**

Append a `SUMMARY.md` entry (Change Type: Feature, Scope: Angle Explorer — wave markup), then:

```bash
git add src/scripts/explorer/angle-wave.ts src/scripts/explorer/angle-wave.test.ts SUMMARY.md
git commit -m "feat(explorer): build the wave strip's SVG

One builder for both the live strip and the export, differing only in the
box passed, so they cannot drift. π/2 labels hold the primary baseline and
odd π/4 labels drop to a second, doubling each label's room. The marker
draws unconditionally — at θ=0 it is the only thing separating cos from sin."
```

---

### Task 7: Highlight the projection leg in the polar figure

Stacked layout forecloses a horizontal tie-line, so the circle highlights the reference-triangle leg whose length **is** the wave's height.

**Files:**
- Modify: `src/scripts/explorer/angle-diagram.ts` (add option, emit the leg)
- Modify: `src/scripts/explorer/angle-diagram.test.ts` (append)

**Interfaces:**
- Consumes: `WaveFn` from task 4 (type-only import — `angle-wave.ts` does not import `angle-diagram.ts`, so there is no cycle); `colors.wave` from task 3
- Produces: `AngleDiagramOptions.projection?: WaveFn`. Consumed by tasks 9 and 10.

- [ ] **Step 1: Write the failing test**

Append to `src/scripts/explorer/angle-diagram.test.ts`:

```ts
/** Pull a projection leg's endpoints back out of the markup. */
function readLeg(svg: string): { x1: number; y1: number; x2: number; y2: number } | null {
  const m = svg.match(
    /<line data-role="projection-leg" x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"/,
  );
  return m
    ? { x1: Number(m[1]), y1: Number(m[2]), x2: Number(m[3]), y2: Number(m[4]) }
    : null;
}

const legLength = (svg: string): number => {
  const l = readLeg(svg)!;
  return Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
};

/** The builder's default pixels-per-unit. */
const UNIT = 88;

describe('buildAngleDiagramSvg — projection leg', () => {
  it('draws nothing when no projection is asked for, leaving today\'s markup untouched', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 30 });
    expect(svg).not.toContain('data-role="projection-leg"');
  });

  it('draws the sin leg with length r·|sin θ| — the wave\'s own height', () => {
    // THE core invariant. The highlighted leg and the strip's plotted height are
    // the same quantity, which is what replaces the tie-line the stacked layout
    // cannot draw.
    for (const theta of [30, 45, 137, 210, -60, 300]) {
      for (const r of [0.5, 1, 1.5]) {
        const svg = buildAngleDiagramSvg({ ...base, theta, r, projection: 'sin' });
        const expected = r * Math.abs(Math.sin((theta * Math.PI) / 180)) * UNIT;
        expect(legLength(svg)).toBeCloseTo(expected, 6);
      }
    }
  });

  it('draws the cos leg with length r·|cos θ|', () => {
    for (const theta of [30, 45, 137, 210, -60, 300]) {
      for (const r of [0.5, 1, 1.5]) {
        const svg = buildAngleDiagramSvg({ ...base, theta, r, projection: 'cos' });
        const expected = r * Math.abs(Math.cos((theta * Math.PI) / 180)) * UNIT;
        expect(legLength(svg)).toBeCloseTo(expected, 6);
      }
    }
  });

  it('keeps the leg\'s length invariant under β while its endpoints move', () => {
    // β rotates the figure as a rigid body, so the leg must be computed in the
    // rotated frame. A leg built in the unrotated frame would change length.
    const at = (beta: number) =>
      buildAngleDiagramSvg({ ...base, theta: 50, beta, projection: 'sin' });
    expect(legLength(at(0))).toBeCloseTo(legLength(at(37)), 6);
    expect(legLength(at(0))).toBeCloseTo(legLength(at(-140)), 6);
    expect(readLeg(at(0))).not.toEqual(readLeg(at(37)));
  });

  it('anchors the cos leg at the origin', () => {
    const l = readLeg(buildAngleDiagramSvg({ ...base, theta: 50, projection: 'cos' }))!;
    expect(l.x1).toBeCloseTo(160, 6); // view 320 / 2
    expect(l.y1).toBeCloseTo(160, 6);
  });

  it('anchors the sin leg at the terminal point', () => {
    const l = readLeg(buildAngleDiagramSvg({ ...base, theta: 50, projection: 'sin' }))!;
    const rad = (50 * Math.PI) / 180;
    expect(l.x1).toBeCloseTo(160 + UNIT * Math.cos(rad), 6);
    expect(l.y1).toBeCloseTo(160 - UNIT * Math.sin(rad), 6);
  });

  it('draws the leg in the wave colour, so the strip and the circle agree', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 50, projection: 'sin' });
    expect(svg).toContain(`data-role="projection-leg"`);
    expect(svg.match(/<line data-role="projection-leg"[^>]*>/)![0]).toContain(colors.wave);
  });

  it('collapses to zero length rather than vanishing when the coordinate is 0', () => {
    // sin 0° = 0 and cos 90° = 0. A zero-length line is honest; omitting the
    // element would read as "no projection selected".
    expect(legLength(buildAngleDiagramSvg({ ...base, theta: 0, projection: 'sin' }))).toBeCloseTo(0, 6);
    expect(legLength(buildAngleDiagramSvg({ ...base, theta: 90, projection: 'cos' }))).toBeCloseTo(0, 6);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/scripts/explorer/angle-diagram.test.ts -t "projection leg"`
Expected: FAIL — `readLeg` returns `null`, so `legLength` throws on `null!`. The "draws nothing" test passes already, which is correct: it proves the additive change starts from a clean baseline.

- [ ] **Step 3: Add the option and emit the leg**

In `angle-diagram.ts`, add the type-only import beneath the existing ones:

```ts
import type { WaveFn } from './angle-wave';
```

Add to `AngleDiagramOptions`, after `coordinateLabel`:

```ts
  /**
   * Highlight the reference-triangle leg the named wave plots — the vertical leg
   * for `sin`, the leg along the initial side for `cos`. Omitted draws neither.
   *
   * This exists because the wave strip is stacked BELOW the circle rather than
   * beside it, so the two figures share no axis and no horizontal tie-line is
   * geometrically possible. The leg's length is exactly the wave's plotted
   * height, in the same colour, which is what carries the link instead.
   */
  projection?: WaveFn;
```

Then, inside `buildAngleDiagramSvg`, after the `terminalDot` declaration:

```ts
  // The foot of the perpendicular from the terminal point onto the initial side,
  // expressed in the β-rotated frame. Positioned through betaRad like every other
  // element, so the leg rotates with the rigid body — and its length is therefore
  // r|sin θ| (sin) or r|cos θ| (cos) for ANY β, which is what makes it equal to
  // the wave's plotted height.
  const foot = polarToCartesian(c, c, r * Math.cos(thetaRad) * unit, betaRad);
  const projectionMarkup =
    opts.projection === undefined
      ? ''
      : (() => {
          const from = opts.projection === 'sin' ? terminalDot : { x: c, y: c };
          return (
            `<line data-role="projection-leg" x1="${from.x}" y1="${from.y}" ` +
            `x2="${foot.x}" y2="${foot.y}" stroke="${colors.wave}" stroke-width="2.5" />`
          );
        })();
```

Append `projectionMarkup` to the returned concatenation, immediately before `labelMarkup` — the leg belongs under the coordinate label but over the rays it crosses.

- [ ] **Step 4: Run and confirm green**

Run: `npx vitest run src/scripts/explorer/angle-diagram.test.ts`
Expected: PASS — 8 new tests plus every pre-existing one unchanged, proving the option is additive.

Run: `npm test`
Expected: whole suite green.

- [ ] **Step 5: Commit**

Append a `SUMMARY.md` entry (Change Type: Feature, Scope: Angle Explorer — diagram), then:

```bash
git add src/scripts/explorer/angle-diagram.ts src/scripts/explorer/angle-diagram.test.ts SUMMARY.md
git commit -m "feat(explorer): highlight the reference-triangle leg the wave plots

Stacked layout shares no axis with the strip, so no tie-line is possible.
The leg's length is exactly r|sin θ| / r|cos θ| for any β — the same
quantity the strip plots — which is what carries the link instead."
```

---

### Task 8: Move the default angle from 30° to 0°

Isolated in its own task because it breaks seven existing e2e assertions, and the fix for each is a judgement call rather than a find-and-replace.

**Files:**
- Modify: `src/components/explorer/AngleExplorer.tsx:38`
- Modify: `tests/e2e/angle.spec.ts` (5 assertions across 5 tests)
- Modify: `tests/e2e/angle-export.spec.ts` (2 assertions across 2 tests)

**Interfaces:**
- Produces: `DEFAULTS.theta === 0`. Task 9 extends the same `DEFAULTS` object with `wave`.

- [ ] **Step 1: Change the default and watch the suite break**

In `AngleExplorer.tsx` line 38:

```ts
/** Slider defaults, also the reset target. */
const DEFAULTS = { theta: 0, r: 1, beta: 0 };
```

Run: `npx playwright test tests/e2e/angle.spec.ts tests/e2e/angle-export.spec.ts`
Expected: **7 failures.** Record which. This red state is the point of the step — it enumerates exactly what depended on the old default.

- [ ] **Step 2: Update the three tests whose subject really is the default**

The governing rule: **do not weaken an assertion to accommodate the new default.** Only tests *about* the default change their expected values.

In `tests/e2e/angle.spec.ts`, replace the first test (currently lines 28-32):

```ts
test('renders the default angle, stating the zero identity once', async ({ page }) => {
  await goto(page);
  const readout = page.locator(READOUT);
  await expect(deg(page)).toHaveValue('0');
  await expect(rad(page)).toHaveValue('0');
  // The collapsed form. "0° = 0 of a full turn = 0 × 2π = 0 ≈ 0 rad" was true
  // and useless, and at the 0° default it is the first thing a visitor reads.
  await expect(readout).not.toContainText('full turn');
  await expect(readout).toContainText('rad');
});
```

In `reset restores every control [G8]` (lines ~121-122) and `reset still works while a validation error is showing [G14]` (lines ~141-142), change both pairs:

```ts
  await expect(deg(page)).toHaveValue('0');
  await expect(rad(page)).toHaveValue('0');
```

- [ ] **Step 3: Pin 30° explicitly in the four tests about exact-radical rendering**

These tests are about radicals reaching the DOM and the artifact, not about defaults. Setting the angle explicitly keeps each assertion at full strength.

In `tests/e2e/angle.spec.ts`, `shows the exact unit-circle point at the default angle` — rename and add a fill:

```ts
test('shows the exact unit-circle point at a chart angle', async ({ page }) => {
  await goto(page);
  // Explicit, not inherited from the default: this test is about radical
  // rendering, and weakening it to the 0° point (1, 0) would test nothing.
  await deg(page).fill('30');
  const coords = page.locator(COORDS);
  await expect(coords.locator('.sqrt').first()).toBeVisible();
  await expect(coords).toContainText('0.866');
});
```

`labels the terminal point on the diagram itself` — add `await deg(page).fill('30');` immediately after `await goto(page);`.

In `tests/e2e/angle-export.spec.ts`, `exports the current angle as a PNG artifact` — add the fill and drop the stale comment:

```ts
test('exports the current angle as a PNG artifact', async ({ page }) => {
  await goto(page);
  // 30° explicitly: at the 0° default, expecting "0" in the artifact text would
  // match almost anything and prove nothing about the angle reaching it.
  await deg(page).fill('30');

  const download = await downloadExport(page, 'PNG', async (artifact) => {
    const text = await artifact.evaluate((node) => node.textContent);
    expect(text).toContain('Angle Explorer');
    expect(text).toContain('30');
  });
  // ...rest unchanged...
```

This file does not currently define a `deg` helper — add it beneath the existing locator constants, with the same strict-mode note `angle.spec.ts` carries:

```ts
// getByLabel('Degrees') is AMBIGUOUS — it also matches the SVG, whose aria-label
// contains the word "degrees" — and throws a Playwright strict-mode violation.
const deg = (page: Page) => page.getByRole('textbox', { name: 'Degrees' });
```

`carries the terminal point into the exported artifact` — add `await deg(page).fill('30');` after `await goto(page);` and change its comment from `// Default is 30° on the unit circle.` to `// 30° set explicitly; the default is now 0°, whose point (1, 0) has no radical.`

- [ ] **Step 4: Run both specs and confirm green**

Run: `npx playwright test tests/e2e/angle.spec.ts tests/e2e/angle-export.spec.ts`
Expected: all PASS, 0 failures.

Run: `npx playwright test`
Expected: full e2e suite green — nothing outside these two files depends on this default.

- [ ] **Step 5: Commit**

Append a `SUMMARY.md` entry (Change Type: Feature, Scope: Angle Explorer — default angle), then:

```bash
git add src/components/explorer/AngleExplorer.tsx tests/e2e/angle.spec.ts \
        tests/e2e/angle-export.spec.ts SUMMARY.md
git commit -m "feat(explorer): default the angle to 0 degrees

So the first drag of the slider is the one that draws the wave from
nothing. Seven assertions depended on 30°: the three about defaults moved
to 0°, and the four about exact-radical rendering now set 30° explicitly
rather than being weakened to the 0° point (1, 0)."
```

---

### Task 9: Wire the wave into the component

Includes `radio-group.tsx` as scaffolding, since it carries no logic of its own and nothing can test it in isolation under a node-only test runner.

**Files:**
- Create: `src/components/ui/radio-group.tsx`
- Modify: `src/components/explorer/AngleExplorer.tsx`
- Modify: `tests/e2e/angle.spec.ts` (append new tests)

**Interfaces:**
- Consumes: `WaveMode`, `WaveFn`, `buildWaveSvg`, `waveSpoken`, `WAVE_WIDTH`, `WAVE_HEIGHT` (task 4-6); `projection` (task 7); `colors.wave` (task 3); `DEFAULTS` (task 8)
- Produces: `data-testid="angle-wave"` (container), `data-testid="angle-wave-figure"` (the `<svg>`), `data-testid="angle-wave-caption"`; a `wave` state consumed by task 10's export

- [ ] **Step 1: Create the radio group component**

Create `src/components/ui/radio-group.tsx`, modelled on `slider.tsx`'s structure and `checkbox.tsx`'s focus styling:

```tsx
"use client"

import * as React from "react"
import { CircleIcon } from "lucide-react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-2", className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "aspect-square size-4 shrink-0 rounded-full border border-input text-primary shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary dark:bg-input/30",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="relative flex items-center justify-center"
      >
        <CircleIcon className="absolute size-2 fill-primary stroke-primary" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
```

- [ ] **Step 2: Write the failing e2e tests**

Append to `tests/e2e/angle.spec.ts`:

```ts
const WAVE = '[data-testid="angle-wave"]';
const WAVE_FIGURE = '[data-testid="angle-wave-figure"]';

// The strip carries its own test id for the reason FIGURE documents at the top of
// this file: the caption renders KaTeX, whose radicals become nested <svg>
// elements, so any descendant svg selector inside the container is ambiguous.
const curve = (page: Page) => page.locator(`${WAVE_FIGURE} [data-role="wave-curve"]`);
const waveOption = (page: Page, name: string) => page.getByRole('radio', { name });

test('shows no wave strip by default — none is the obvious default', async ({ page }) => {
  await goto(page);
  await expect(page.locator(WAVE)).toHaveCount(0);
  await expect(waveOption(page, 'none')).toBeChecked();
});

test('selecting sin reveals the strip, selecting none removes it', async ({ page }) => {
  await goto(page);
  await waveOption(page, 'sin θ').check();
  await expect(page.locator(WAVE_FIGURE)).toBeVisible();

  await waveOption(page, 'none').check();
  await expect(page.locator(WAVE)).toHaveCount(0);
});

test('the wave selector is reachable and operable by keyboard', async ({ page }) => {
  await goto(page);
  await waveOption(page, 'none').focus();
  await page.keyboard.press('ArrowDown');
  await expect(waveOption(page, 'sin θ')).toBeChecked();
  await page.keyboard.press('ArrowDown');
  await expect(waveOption(page, 'cos θ')).toBeChecked();
});

test('draws no curve at the 0 degree default, then the slider draws it', async ({ page }) => {
  await goto(page);
  await waveOption(page, 'sin θ').check();
  // The whole lesson: pick sin, then drag. At θ = 0 there is nothing to trace.
  await expect(curve(page)).toHaveCount(0);

  await deg(page).fill('90');
  await expect(curve(page)).toHaveCount(1);
});

test('the angle slider lengthens the traced curve', async ({ page }) => {
  await goto(page);
  await waveOption(page, 'sin θ').check();
  await deg(page).fill('90');
  const short = (await curve(page).getAttribute('d'))!.length;

  await deg(page).fill('270');
  const long = (await curve(page).getAttribute('d'))!.length;
  expect(long).toBeGreaterThan(short);
});

test('traces leftward for a negative angle', async ({ page }) => {
  await goto(page);
  await waveOption(page, 'cos θ').check();
  await deg(page).fill('-90');
  const d = (await curve(page).getAttribute('d'))!;
  const xs = [...d.matchAll(/[ML] ([-\d.e]+) /g)].map((m) => Number(m[1]));
  expect(xs.at(-1)!).toBeLessThan(xs[0]!);
});

test('cos reads non-zero at 0 degrees where sin reads zero', async ({ page }) => {
  await goto(page);
  const markerY = async () =>
    Number(
      await page
        .locator(`${WAVE_FIGURE} [data-role="wave-marker"]`)
        .getAttribute('cy'),
    );

  await waveOption(page, 'sin θ').check();
  const sinY = await markerY();
  await waveOption(page, 'cos θ').check();
  const cosY = await markerY();
  expect(cosY).toBeLessThan(sinY); // cos = 1 sits above sin = 0
});

test('the radius slider changes the wave amplitude', async ({ page }) => {
  await goto(page);
  await waveOption(page, 'sin θ').check();
  await deg(page).fill('90');
  const peak = async () =>
    Number(
      await page
        .locator(`${WAVE_FIGURE} [data-role="wave-marker"]`)
        .getAttribute('cy'),
    );
  const atOne = await peak();

  // Radix puts role="slider" on the THUMB while the id sits on the root.
  const radius = page.locator('#slider-radius [role="slider"]');
  await radius.focus();
  for (let i = 0; i < 5; i++) await radius.press('ArrowRight');

  // A taller amplitude is a SMALLER y in SVG coordinates.
  expect(await peak()).toBeLessThan(atOne);
});

test('the highlighted projection leg appears with the wave and matches it', async ({ page }) => {
  await goto(page);
  const leg = page.locator(`${FIGURE} [data-role="projection-leg"]`);
  await expect(leg).toHaveCount(0);

  await waveOption(page, 'sin θ').check();
  await deg(page).fill('45');
  await expect(leg).toHaveCount(1);
});

test('reset returns the wave selector to none', async ({ page }) => {
  await goto(page);
  await waveOption(page, 'cos θ').check();
  await deg(page).fill('200');
  await expect(page.locator(WAVE_FIGURE)).toBeVisible();

  await page.getByRole('button', { name: 'Reset' }).click();

  await expect(waveOption(page, 'none')).toBeChecked();
  await expect(page.locator(WAVE)).toHaveCount(0);
});
```

- [ ] **Step 3: Run them and confirm they fail**

Run: `npx playwright test tests/e2e/angle.spec.ts -g "wave|projection leg"`
Expected: FAIL — no radio with name `none` exists yet.

- [ ] **Step 4: Wire the component**

In `AngleExplorer.tsx`:

Add the imports:

```ts
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  buildWaveSvg,
  waveSpoken,
  WAVE_HEIGHT,
  WAVE_WIDTH,
  type WaveFn,
  type WaveMode,
} from '@/scripts/explorer/angle-wave';
```

Extend `DEFAULTS` (task 8 left it at three keys):

```ts
/** Slider defaults, also the reset target. */
const DEFAULTS = { theta: 0, r: 1, beta: 0, wave: 'none' as WaveMode };
```

Add the state beside the others:

```ts
  const [wave, setWave] = useState<WaveMode>(DEFAULTS.wave);
```

Add to `reset()`:

```ts
    setWave(DEFAULTS.wave);
```

Derive the active function once, above the return:

```ts
  // `undefined` rather than 'none' is what both builders expect for "draw neither".
  const waveFn: WaveFn | undefined = wave === 'none' ? undefined : wave;
```

Extend the live region so the wave reaches assistive tech. Replace the existing effect's body:

```ts
  useEffect(() => {
    const id = setTimeout(() => {
      const wavePart = waveFn ? ` ${waveSpoken(waveFn, theta, r)}` : '';
      setAnnounced(`${readout.spoken} ${coords.spoken}${wavePart}`);
    }, 250);
    return () => clearTimeout(id);
  }, [readout.spoken, coords.spoken, waveFn, theta, r]);
```

Pass the projection into the live figure's builder call — add one property to the existing `buildAngleDiagramSvg({...})` argument object:

```ts
              projection: waveFn,
```

Insert the radio group between the sliders `.map(...)` and the `Convert` box:

```tsx
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium" id="wave-group-label">
            Wave
          </p>
          <RadioGroup
            aria-labelledby="wave-group-label"
            value={wave}
            onValueChange={(v) => setWave(v as WaveMode)}
          >
            {(
              [
                { value: 'none' as const, label: 'none' },
                { value: 'sin' as const, label: 'sin θ' },
                { value: 'cos' as const, label: 'cos θ' },
              ]
            ).map((o) => (
              <div key={o.value} className="flex items-center gap-2">
                <RadioGroupItem id={`wave-${o.value}`} value={o.value} />
                <Label htmlFor={`wave-${o.value}`}>{o.label}</Label>
              </div>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            Drag <strong>angle</strong> to trace the wave from 0.
          </p>
        </div>
```

Insert the strip between the `angle-figure` `<svg>` and the `angle-readout` div:

```tsx
        {waveFn && (
          <div data-testid="angle-wave" className="mt-4">
            <svg
              data-testid="angle-wave-figure"
              viewBox={`0 0 ${WAVE_WIDTH} ${WAVE_HEIGHT}`}
              className="h-auto w-full"
              role="img"
              aria-label={`Graph of ${waveFn === 'sin' ? 'sine' : 'cosine'} traced from 0 to ${formatDegrees(theta)} degrees, on an axis from negative 2 pi to 2 pi.`}
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
                __html: waveFn === 'sin' ? coordHtml.y : coordHtml.x,
              }}
            />
          </div>
        )}
```

- [ ] **Step 5: Run and confirm green**

Run: `npx astro check`
Expected: no errors.

Run: `npx playwright test tests/e2e/angle.spec.ts`
Expected: all PASS — the 10 new tests plus every pre-existing one.

- [ ] **Step 6: Look at it in a browser**

Run: `npm run dev`, open `/explorers/angles`, and check the three things no test can:

1. Select `sin θ`, drag the angle slider. Does the projection leg plus the shared marker colour actually link the circle to the strip? **This is the accepted risk of the stacked layout** and the moment to judge it.
2. Are all 17 staggered π/4 labels legible, and do they read as intentional rather than misaligned? Narrow the window to check the mobile width.
3. Toggle dark mode from the header. Is the teal distinguishable from the blue initial-side ray in both themes?

If (1) reads weakly, note it for review rather than redesigning here. If (2) is untidy, the spec's recorded retreat is to label only π/2 multiples. If (3) fails, switch to the green family in `theme.ts` and re-run task 3's tests.

- [ ] **Step 7: Commit**

Append a `SUMMARY.md` entry (Change Type: Feature, Scope: Angle Explorer — wave selector), then:

```bash
git add src/components/ui/radio-group.tsx src/components/explorer/AngleExplorer.tsx \
        tests/e2e/angle.spec.ts SUMMARY.md
git commit -m "feat(explorer): add the sin/cos wave selector to the Angle Explorer

A Wave radio group (none / sin θ / cos θ, default none) reveals a strip
below the circle, traced from 0 to θ as the user drags. No animation — the
slider is the instrument, so θ stays the single source of truth. The
caption reuses the coordinate readout's own equation rather than
formatting the value twice."
```

---

### Task 10: Carry the wave into the export, plus copy and docs

**Files:**
- Modify: `src/components/explorer/AngleExplorer.tsx` (`createExportSnapshot`)
- Modify: `tests/e2e/angle-export.spec.ts` (append)
- Modify: `src/pages/explorers/angles.astro`
- Modify: `TODO.md`, `SUMMARY.md`

**Interfaces:**
- Consumes: `wave` state (task 9), `buildWaveSvg` (task 6), `waveValue` (task 4), `colors.wave` (task 3)
- Produces: nothing downstream. Final task.

- [ ] **Step 1: Write the failing e2e test**

Append to `tests/e2e/angle-export.spec.ts`:

```ts
test('carries the wave into the exported artifact', async ({ page }) => {
  await goto(page);
  await page.getByRole('radio', { name: 'sin θ' }).check();
  await deg(page).fill('30');

  await downloadExport(page, 'PNG', async (artifact) => {
    const text = await artifact.evaluate((node) => node.textContent);
    expect(text).toContain('Wave');
    expect(text).toContain('y = r·sin θ');
    // 30° on the unit circle: sin is exactly 1/2.
    expect(text).toContain('0.5');
    // Two figures, so the exported graph cannot contradict the screen.
    const svgCount = await artifact.evaluate((node) => node.querySelectorAll('svg').length);
    expect(svgCount).toBeGreaterThanOrEqual(2);
  });
});

test('omits the wave section when no wave is selected', async ({ page }) => {
  await goto(page);
  // Regression guard: the section must be conditional, not emitted empty — the
  // same discipline the optional export table already follows.
  await downloadExport(page, 'PNG', async (artifact) => {
    const text = await artifact.evaluate((node) => node.textContent);
    expect(text).not.toContain('y = r·sin θ');
    expect(text).not.toContain('y = r·cos θ');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx playwright test tests/e2e/angle-export.spec.ts -g "wave"`
Expected: the first test FAILS (no `Wave` section in the artifact); the second PASSES already, which is correct — it is the guard that keeps the new section conditional.

- [ ] **Step 3: Extend the export snapshot**

In `createExportSnapshot`, capture the wave alongside the other values:

```ts
    const snapshotWave = waveFn;
```

Add `waveValue` to the `angle-wave` import block at the top of the file.

Append conditionally to `legend`, after the existing four entries:

```ts
          ...(snapshotWave
            ? [
                {
                  label:
                    snapshotWave === 'sin'
                      ? 'sin θ — height is the y-coordinate'
                      : 'cos θ — height is the x-coordinate',
                  color: lightColors.wave,
                },
              ]
            : []),
```

Append conditionally to `sections`, after the `Circle` section:

```ts
          ...(snapshotWave
            ? [
                {
                  title: 'Wave',
                  color: lightColors.wave,
                  facts: [
                    {
                      label: 'Function',
                      value: snapshotWave === 'sin' ? 'y = r·sin θ' : 'y = r·cos θ',
                    },
                    {
                      label: 'Value',
                      value: round4(waveValue(snapshotWave, snapshotTheta, snapshotR)),
                    },
                    { label: 'Traced', value: `0° to ${formatDegrees(snapshotTheta)}°` },
                  ],
                },
              ]
            : []),
```

No new table row: the table already carries `x = r·cos θ` and `y = r·sin θ`, so the wave's value is present and a fourth row would duplicate it.

Replace the `renderGraph` body:

```ts
      renderGraph: (target) => {
        // With a wave, the circle yields height so both figures fit the 560 the
        // artifact template allows. Without one, the export is unchanged.
        const circleHeight = snapshotWave ? 360 : EXPORT_GRAPH_HEIGHT;
        const circle =
          `<svg viewBox="0 0 320 320" width="${EXPORT_GRAPH_WIDTH}" height="${circleHeight}" ` +
          `preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${buildAngleDiagramSvg(
            {
              theta: snapshotTheta,
              r: snapshotR,
              beta: snapshotBeta,
              colors: lightColors,
              tickText: '#334155',
              coordinateLabel: snapshotCoords.labelText,
              projection: snapshotWave,
            },
          )}</svg>`;

        // A matching viewBox, NOT the live strip's 512 × 176. Reusing that here
        // would make `meet` fit to the height and render the wave ~552px wide,
        // letterboxed inside a 960px box.
        const strip = snapshotWave
          ? `<svg viewBox="0 0 ${EXPORT_GRAPH_WIDTH} 190" width="${EXPORT_GRAPH_WIDTH}" height="190" ` +
            `preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${buildWaveSvg(
              {
                fn: snapshotWave,
                theta: snapshotTheta,
                r: snapshotR,
                colors: lightColors,
                tickText: '#334155',
                width: EXPORT_GRAPH_WIDTH,
                height: 190,
              },
            )}</svg>`
          : '';

        target.innerHTML = circle + strip;
      },
```

- [ ] **Step 4: Run and confirm green**

Run: `npx playwright test tests/e2e/angle-export.spec.ts`
Expected: all PASS.

Run: `npx playwright test`
Expected: full e2e suite green. `export-visual.spec.ts` has no angle-explorer baseline, so no PNG regeneration is needed — and none must be attempted, since those baselines are Linux/Docker-only.

- [ ] **Step 5: Update the page copy**

In `src/pages/explorers/angles.astro`, append to the intro paragraph, after the existing "Type into either field…" sentence:

```astro
      Pick <strong>sin θ</strong> or <strong>cos θ</strong> to trace that wave as you
      sweep &mdash; the highlighted leg inside the circle is the wave's height.
```

- [ ] **Step 6: Run the whole verification suite**

```bash
npm test && npx astro check && npx playwright test && npm run build
```

Expected: unit suite green, no type errors, e2e green, build succeeds. **Record the actual counts** — do not claim completion without them.

- [ ] **Step 7: Close out the docs and commit**

Mark the TODO entry complete, and append a final `SUMMARY.md` entry (Change Type: Feature, Scope: Angle Explorer — export + docs) recording the browser findings from task 9 step 6.

```bash
git add src/components/explorer/AngleExplorer.tsx tests/e2e/angle-export.spec.ts \
        src/pages/explorers/angles.astro TODO.md SUMMARY.md
git commit -m "feat(explorer): carry the wave into the exported artifact

An export that contradicts the screen is worse than none, so renderGraph
emits both figures and the model gains a conditional Wave section and
legend entry. The strip gets its own 960 × 190 viewBox — reusing the live
512 × 176 one would letterbox it to ~552px inside a 960px box."
```

- [ ] **Step 8: Push and open the PR**

```bash
git push
gh pr create --base main --title "feat(explorer): sin/cos wave projection for the Angle Explorer" --body-file - <<'BODY'
## Summary

Adds a `Wave` selector (`none` · `sin θ` · `cos θ`, default `none`) to the Angle
Explorer. Selecting sin or cos reveals a strip below the circle that traces the
wave from 0 out to θ as the user drags the angle slider. The default angle moves
from 30° to 0°, so the first drag is the one that draws the wave from nothing.

## Rationale

- **No animation.** The slider is the drawing instrument, so θ stays the single
  source of truth and there is no second clock to disagree with it. This also
  removes any `prefers-reduced-motion` or WCAG 2.2.2 handling.
- **Plots `r·sin θ`, not `sin θ`.** A fixed ±1 amplitude would show 0.5 while the
  coordinate box two inches below read 0.75 at r = 1.5.
- **Axis spans −2π…2π,** matching the angle slider's −360°…360°, because a wave
  that blanks over a third of the slider's travel reads as a bug.
- **Stacked layout forecloses a tie-line,** so the circle highlights the matching
  reference-triangle leg, whose length is provably `r·|sin θ|` / `r·|cos θ|` for
  any β — the same quantity the strip plots.

## Risks

- The projection leg plus a shared marker colour replace the tie-line. Judged in
  a browser at task 9; see the SUMMARY entry for the finding.
- 17 π/4 labels are staggered onto two baselines to fit legibly.
- The exported circle renders at 360px rather than 560px when a wave is included,
  to keep both figures inside the artifact template's 560px budget.

## Testing

Unit: wave scales, all 17 π/4 tick labels, `wavePath`'s zero gate and direction,
amplitude scaling, sin's oddness and cos's evenness, sin-vs-cos at θ = 0, a
domain sweep for NaN, and the projection leg's length invariant under β. Plus the
new palette colour's 3:1 contrast in both themes and the θ = 0 readout collapse.

E2E: default `none` with no strip in the DOM, reveal/remove, keyboard operation,
curve growth under slider drag, leftward tracing for negative θ, amplitude under
the radius slider, reset, and both export paths.

Seven pre-existing assertions depended on the 30° default. The three about
defaults moved to 0°; the four about exact-radical rendering now set 30°
explicitly rather than being weakened.

No visual snapshot changes — this explorer has no PNG baseline.

## Spec

`docs/superpowers/specs/2026-07-29-angle-wave-projection-design.md`
BODY
```

---

## Self-Review

**Spec coverage.** Every numbered requirement maps to a task: (1) radio group → 9; (2) `none` absent from DOM → 9; (3) strip below circle → 9; (4) traced 0→θ → 5; (5) −2π…2π with π/4 ticks → 4, 6; (6) `r·sin θ` amplitude → 4; (7) reset → 9; (8) default 0° → 8; (9) θ as sole source of truth → 5, 9. Every architecture section maps too: `angle-wave.ts` → 4-6; `projection` → 7; `angle-readout.ts` → 1-2; formatter move → 1; `wave` colour → 3; `radio-group.tsx` → 9; component wiring → 9; export → 10; page copy → 10.

**Placeholder scan.** No `TBD`, no "add error handling", no "similar to Task N". Every code step carries the actual code. The one deliberate ellipsis is task 1 step 8's `...body moved verbatim from AngleExplorer.tsx:48-91...`, which cites exact line numbers for a pure move — writing out 44 unchanged lines would invite the implementer to retype and diverge from the characterization tests written one step earlier.

**Type consistency.** `WaveFn` / `WaveMode` are defined once in task 4 and imported everywhere after. `waveScales(width?, height?)` is called with no arguments in task 4's tests and with `(960, 190)` in tasks 4 and 6. `buildWaveSvg`'s option object is `{ fn, theta, r, colors, tickText, width?, height? }` at every call site — tasks 6, 9, 10. `projection?: WaveFn` is `undefined`-not-`'none'` at both call sites, which is why task 9 derives `waveFn` once rather than passing `wave` through. `data-role` names are stable across unit and e2e assertions: `wave-tick`, `wave-unit-ref`, `wave-curve`, `wave-drop`, `wave-marker`, `projection-leg`.

**One gap found and closed:** task 8's `angle-export.spec.ts` changes need a `deg` locator helper that file does not define. Step 3 now creates it, carrying the strict-mode note from `angle.spec.ts` — without it, `getByLabel('Degrees')` also matches the figure's `aria-label` and throws.
