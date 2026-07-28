# Unit Circle Coordinates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the terminal point `(x, y)` to the Angle Explorer in the unit-circle reference chart's three-part form — degrees, radian measure, and exact coordinates — updating live as the angle and radius sliders move.

**Architecture:** Two new pure, DOM-free modules. `unit-circle.ts` owns the exact-value maths: an `ExactValue` type covering the five chart magnitudes, a five-entry first-quadrant table, and reference-angle/quadrant-sign derivation for the other twelve angles. `angle-coordinates.ts` owns presentation, composing `unit-circle.ts` with the existing `angle.ts`/`angle-parse.ts` into KaTeX, plain-text, and spoken readout strings. `angle-diagram.ts` gains an optional pre-formatted label string, so the shared SVG builder never needs to know about exact maths, and the label reaches the exported PNG/PDF for free. `AngleExplorer.tsx` only renders what these modules produce.

**Tech Stack:** TypeScript (Astro `strict`), React 19, Vitest (node environment), KaTeX, Playwright.

## Global Constraints

- **Strict TDD.** Red → Green → Refactor. Write the failing test, run it, watch it fail, then implement.
- **Test environment is `node`.** `vitest.config.ts` sets `environment: 'node'` and `include: ['src/**/*.{test,spec}.ts']` — `.ts` only. There is no jsdom and no `@testing-library`. Pure logic is unit-tested; React behaviour is covered by Playwright. Where a component test is unavoidable, the established pattern is `renderToStaticMarkup` from `react-dom/server` (see `src/components/FunctionDetailsPanels.test.ts`).
- **Import alias** is `@/*` → `./src/*`. Sibling modules inside `src/scripts/explorer/` import each other by relative path (`./angle`), matching `angle-parse.ts`.
- **No new dependencies.**
- **Coordinates are measured from θ alone.** β is a viewing rotation. The on-diagram label *sits* at `β + θ` but *reports* θ's values.
- **Exact coverage is the 16 chart angles only** — multiples of 30° and 45°. Everything else falls back to decimals. Never fabricate a radical.
- **`-0` must never appear** in any rendered output.
- **`MAX_EXPORT_TABLE_ROWS = 9`.** The Angle Explorer table currently has 5 rows; this feature takes it to 7.
- **Commit style:** Conventional Commits. No co-author or AI-generation trailers.
- **`SUMMARY.md` gets an entry before every commit** (project rule, `CLAUDE.md` §11.5.2).

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/scripts/explorer/unit-circle.ts` | Create | Exact unit-circle coordinate maths and its three formatters. Knows nothing about angles-as-display. |
| `src/scripts/explorer/unit-circle.test.ts` | Create | Cross-checks the derivation against `Math.cos`/`Math.sin`. |
| `src/scripts/explorer/angle-coordinates.ts` | Create | Builds every display string the coordinate readout needs. Composes `unit-circle.ts` + `angle.ts` + `angle-parse.ts`. |
| `src/scripts/explorer/angle-coordinates.test.ts` | Create | Covers prefix-dropping, exact/decimal fallback, `=` vs `≈`, spoken text. |
| `src/scripts/explorer/angle-diagram.ts` | Modify | Gains an optional `coordinateLabel` string and clamped placement. |
| `src/scripts/explorer/angle-diagram.test.ts` | Modify | Placement invariants across the full `r × θ` domain. |
| `src/components/explorer/AngleExplorer.tsx` | Modify | Renders the readout block, passes the label into the diagram, extends the export snapshot. |
| `tests/e2e/angle.spec.ts` | Modify | Coordinates update when sliders move. |
| `tests/e2e/angle-export.spec.ts` | Modify | New fact and table rows appear in the artifact. |
| `README.md`, `SUMMARY.md` | Modify | Documentation. |

---

### Task 1: Exact unit-circle coordinates

**Files:**
- Create: `src/scripts/explorer/unit-circle.ts`
- Test: `src/scripts/explorer/unit-circle.test.ts`

**Interfaces:**
- Consumes: `isIntegerDegrees` from `./angle`.
- Produces: `ExactValue`, `ExactPoint`, `exactCoordinates(deg: number): ExactPoint | null`, `formatExactLatex(v: ExactValue): string`, `formatExactText(v: ExactValue): string`, `formatExactSpoken(v: ExactValue): string`, `exactToNumber(v: ExactValue): number`.

- [ ] **Step 1: Write the failing test**

Create `src/scripts/explorer/unit-circle.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

import {
  exactCoordinates,
  exactToNumber,
  formatExactLatex,
  formatExactSpoken,
  formatExactText,
} from './unit-circle';

/** The 16 angles the reference chart labels. */
const CHART_ANGLES = [
  0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330,
];

describe('exactCoordinates', () => {
  it('agrees with Math.cos and Math.sin at every chart angle', () => {
    for (const deg of CHART_ANGLES) {
      const point = exactCoordinates(deg);
      expect(point, `no exact point for ${deg}°`).not.toBeNull();
      const rad = (deg * Math.PI) / 180;
      expect(exactToNumber(point!.x)).toBeCloseTo(Math.cos(rad), 12);
      expect(exactToNumber(point!.y)).toBeCloseTo(Math.sin(rad), 12);
    }
  });

  it('places the quadrantals exactly, with no floating-point residue', () => {
    expect(exactCoordinates(0)).toEqual({
      x: { sign: 1, radicand: 1, denominator: 1 },
      y: { sign: 0, radicand: 1, denominator: 1 },
    });
    expect(exactCoordinates(180)).toEqual({
      x: { sign: -1, radicand: 1, denominator: 1 },
      y: { sign: 0, radicand: 1, denominator: 1 },
    });
    expect(exactCoordinates(270)).toEqual({
      x: { sign: 0, radicand: 1, denominator: 1 },
      y: { sign: -1, radicand: 1, denominator: 1 },
    });
  });

  it('normalises negative and past-360° angles onto the same point', () => {
    expect(exactCoordinates(-330)).toEqual(exactCoordinates(30));
    expect(exactCoordinates(390)).toEqual(exactCoordinates(30));
    expect(exactCoordinates(360)).toEqual(exactCoordinates(0));
    expect(exactCoordinates(-360)).toEqual(exactCoordinates(0));
  });

  it('returns null for integers that are not chart angles', () => {
    expect(exactCoordinates(37)).toBeNull();
    expect(exactCoordinates(15)).toBeNull();
    expect(exactCoordinates(100)).toBeNull();
  });

  it('returns null for non-integer degrees, which have no exact form', () => {
    // 1 radian typed into the Radians field arrives as 57.2958°.
    expect(exactCoordinates(57.2958)).toBeNull();
    expect(exactCoordinates(30.5)).toBeNull();
  });

  it('accepts the float noise a radian-typed pi/3 produces', () => {
    // isIntegerDegrees treats this as 60°; so must the lookup.
    expect(exactCoordinates(59.99999999999999)).toEqual(exactCoordinates(60));
  });
});

describe('formatExactLatex', () => {
  it('renders zero, unit, rational, and radical magnitudes', () => {
    expect(formatExactLatex({ sign: 0, radicand: 1, denominator: 1 })).toBe('0');
    expect(formatExactLatex({ sign: 1, radicand: 1, denominator: 1 })).toBe('1');
    expect(formatExactLatex({ sign: 1, radicand: 1, denominator: 2 })).toBe('\\frac{1}{2}');
    expect(formatExactLatex({ sign: 1, radicand: 3, denominator: 2 })).toBe(
      '\\frac{\\sqrt{3}}{2}',
    );
  });

  it('carries the sign, and never emits a signed zero', () => {
    expect(formatExactLatex({ sign: -1, radicand: 1, denominator: 1 })).toBe('-1');
    expect(formatExactLatex({ sign: -1, radicand: 2, denominator: 2 })).toBe(
      '-\\frac{\\sqrt{2}}{2}',
    );
    expect(formatExactLatex({ sign: 0, radicand: 1, denominator: 1 })).not.toContain('-');
  });
});

describe('formatExactText', () => {
  it('mirrors the latex form without markup, for SVG and export', () => {
    expect(formatExactText({ sign: 0, radicand: 1, denominator: 1 })).toBe('0');
    expect(formatExactText({ sign: 1, radicand: 1, denominator: 2 })).toBe('1/2');
    expect(formatExactText({ sign: 1, radicand: 3, denominator: 2 })).toBe('√3/2');
    expect(formatExactText({ sign: -1, radicand: 2, denominator: 2 })).toBe('-√2/2');
    expect(formatExactText({ sign: -1, radicand: 1, denominator: 1 })).toBe('-1');
  });
});

describe('formatExactSpoken', () => {
  it('reads aloud with no backslashes or braces for a screen reader to mangle', () => {
    expect(formatExactSpoken({ sign: 0, radicand: 1, denominator: 1 })).toBe('0');
    expect(formatExactSpoken({ sign: 1, radicand: 1, denominator: 2 })).toBe('1 over 2');
    expect(formatExactSpoken({ sign: 1, radicand: 3, denominator: 2 })).toBe(
      'square root of 3 over 2',
    );
    expect(formatExactSpoken({ sign: -1, radicand: 2, denominator: 2 })).toBe(
      'negative square root of 2 over 2',
    );
    expect(formatExactSpoken({ sign: -1, radicand: 1, denominator: 1 })).toBe('negative 1');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/scripts/explorer/unit-circle.test.ts`

Expected: FAIL — `Failed to resolve import "./unit-circle"`.

- [ ] **Step 3: Write the implementation**

Create `src/scripts/explorer/unit-circle.ts`:

```ts
/**
 * Exact terminal-point coordinates for the Angle Explorer — the `(√3/2, 1/2)`
 * half of the standard unit-circle reference chart.
 *
 * Every exact coordinate on that chart is one of five magnitudes: `0`, `1/2`,
 * `√2/2`, `√3/2`, `1`. So rather than store sixteen literal points, this module
 * keeps only the first quadrant and derives the other twelve angles by reference
 * angle plus quadrant sign — the same rule the chart teaches. The test suite
 * cross-checks every derived angle against `Math.cos`/`Math.sin`, which is what
 * makes that trade (five entries and a rule, instead of sixteen literals and no
 * reasoning) safe.
 *
 * Pure and DOM-free so it unit-tests in the node environment, like `angle.ts`.
 */
import { isIntegerDegrees } from './angle';

/**
 * An exact unit-circle coordinate: `(sign · √radicand) / denominator`.
 *
 * A `radicand` of 1 means "no radical" — `{sign: 1, radicand: 1, denominator: 2}`
 * is 1/2, not √1/2. `sign: 0` is the zero coordinate and is immune to negation,
 * so `-0` can never reach the screen.
 */
export interface ExactValue {
  sign: -1 | 0 | 1;
  radicand: 1 | 2 | 3;
  denominator: 1 | 2;
}

export interface ExactPoint {
  x: ExactValue;
  y: ExactValue;
}

const ZERO: ExactValue = { sign: 0, radicand: 1, denominator: 1 };
const ONE: ExactValue = { sign: 1, radicand: 1, denominator: 1 };
const HALF: ExactValue = { sign: 1, radicand: 1, denominator: 2 };
const ROOT2_OVER_2: ExactValue = { sign: 1, radicand: 2, denominator: 2 };
const ROOT3_OVER_2: ExactValue = { sign: 1, radicand: 3, denominator: 2 };

/**
 * (cos, sin) at the first-quadrant reference angles. A Map rather than an object
 * so a miss is `undefined` by type, not by index-signature assumption — every
 * non-chart angle reduces to a reference that is simply absent here.
 */
const FIRST_QUADRANT = new Map<number, ExactPoint>([
  [0, { x: ONE, y: ZERO }],
  [30, { x: ROOT3_OVER_2, y: HALF }],
  [45, { x: ROOT2_OVER_2, y: ROOT2_OVER_2 }],
  [60, { x: HALF, y: ROOT3_OVER_2 }],
  [90, { x: ZERO, y: ONE }],
]);

/** Negate a magnitude. Zero is returned untouched so `-0` never renders. */
function negate(v: ExactValue): ExactValue {
  return v.sign === 0 ? v : { ...v, sign: (-v.sign) as -1 | 1 };
}

/** Fold any angle onto [0, 360). `-330` → `30`, `390` → `30`, `-360` → `0`. */
function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * The exact terminal point for θ, or `null` when no exact form exists.
 *
 * Null covers two distinct cases that both mean "show decimals instead": a
 * non-integer angle (57.2958°, from typing 1 into the Radians field), and an
 * integer that is not a multiple of 30° or 45° (37°).
 */
export function exactCoordinates(deg: number): ExactPoint | null {
  // Same gate as the π-multiple readout: exact treatment of a raw float is
  // meaningless, and a radian-typed pi/3 arrives as 59.99999999999999.
  if (!isIntegerDegrees(deg)) return null;
  const d = normalizeDegrees(Math.round(deg));

  // Reference angle and quadrant signs — the rule the chart teaches. Boundary
  // angles fall out of it rather than needing cases: 180° reduces to reference 0°
  // with quadrant II signs, giving (−1, 0).
  let reference: number;
  let negX: boolean;
  let negY: boolean;
  if (d <= 90) {
    reference = d;
    negX = false;
    negY = false;
  } else if (d <= 180) {
    reference = 180 - d;
    negX = true;
    negY = false;
  } else if (d <= 270) {
    reference = d - 180;
    negX = true;
    negY = true;
  } else {
    reference = 360 - d;
    negX = false;
    negY = true;
  }

  const base = FIRST_QUADRANT.get(reference);
  if (base === undefined) return null;
  return {
    x: negX ? negate(base.x) : base.x,
    y: negY ? negate(base.y) : base.y,
  };
}

/** KaTeX source: `0`, `1`, `-1`, `\frac{1}{2}`, `-\frac{\sqrt{3}}{2}`. */
export function formatExactLatex(v: ExactValue): string {
  if (v.sign === 0) return '0';
  const sign = v.sign < 0 ? '-' : '';
  const numerator = v.radicand === 1 ? '1' : `\\sqrt{${v.radicand}}`;
  return v.denominator === 1
    ? `${sign}${numerator}`
    : `${sign}\\frac{${numerator}}{${v.denominator}}`;
}

/** Plain text for SVG labels and the export artifact: `0`, `1/2`, `√3/2`, `-1`. */
export function formatExactText(v: ExactValue): string {
  if (v.sign === 0) return '0';
  const sign = v.sign < 0 ? '-' : '';
  const numerator = v.radicand === 1 ? '1' : `√${v.radicand}`;
  return v.denominator === 1 ? `${sign}${numerator}` : `${sign}${numerator}/${v.denominator}`;
}

/**
 * Spoken counterpart for the screen-reader live region: `0`, `1 over 2`,
 * `square root of 3 over 2`, `negative 1`. No backslashes or braces for a
 * screen reader to read aloud.
 */
export function formatExactSpoken(v: ExactValue): string {
  if (v.sign === 0) return '0';
  const sign = v.sign < 0 ? 'negative ' : '';
  const numerator = v.radicand === 1 ? '1' : `square root of ${v.radicand}`;
  return v.denominator === 1
    ? `${sign}${numerator}`
    : `${sign}${numerator} over ${v.denominator}`;
}

/** Numeric value, for tests to cross-check the derivation against Math.cos/sin. */
export function exactToNumber(v: ExactValue): number {
  return (v.sign * Math.sqrt(v.radicand)) / v.denominator;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/scripts/explorer/unit-circle.test.ts`

Expected: PASS — 10 tests.

- [ ] **Step 5: Type-check**

Run: `npx astro check`

Expected: 0 errors.

- [ ] **Step 6: Append the SUMMARY.md entry**

Append to `SUMMARY.md`:

```markdown

## [2026-07-27 18:00] Commit Summary

**Change Type:** Feature
**Scope:** Angle Explorer — unit-circle exact coordinates

**Summary:**
Added `src/scripts/explorer/unit-circle.ts`: an `ExactValue` type covering the five
chart magnitudes (`0, 1/2, √2/2, √3/2, 1`), a five-entry first-quadrant table, and
reference-angle derivation for the other twelve chart angles, plus latex/text/spoken
formatters.

**Rationale:**
Deriving twelve angles from five keeps the quadrant rule in one place and makes the
code encode the same reasoning the student is learning, rather than smearing it across
sixteen literals. The trade — a sign slip would be invisible on inspection — is covered
by cross-checking every chart angle against `Math.cos`/`Math.sin` in the tests.

`sign: 0` is immune to negation so `-0` can never reach the screen, and the
`isIntegerDegrees` gate is reused from `angle.ts` because exact treatment of a raw
float is meaningless — a radian-typed `pi/3` arrives as 59.99999999999999.

**References:**
- TODO.md: [2026-07-27] Feature: Unit Circle Coordinates
- Spec: docs/superpowers/specs/2026-07-27-unit-circle-coordinates-design.md
```

- [ ] **Step 7: Commit**

```bash
git add src/scripts/explorer/unit-circle.ts src/scripts/explorer/unit-circle.test.ts SUMMARY.md
git commit -m "feat(explorer): exact unit-circle coordinate maths

Derives the chart's 16 exact points from a five-entry first-quadrant
table via reference angle and quadrant sign, with latex, plain-text,
and spoken formatters. Tests cross-check every angle against Math.cos
and Math.sin."
```

---

### Task 2: Coordinate readout strings

**Files:**
- Create: `src/scripts/explorer/angle-coordinates.ts`
- Test: `src/scripts/explorer/angle-coordinates.test.ts`

**Interfaces:**
- Consumes: `exactCoordinates`, `formatExactLatex`, `formatExactText`, `formatExactSpoken`, `type ExactValue` from `./unit-circle`; `degreesToRadians`, `isIntegerDegrees`, `piMultiple`, `formatPiLatex` from `./angle`; `formatDegrees` from `./angle-parse`.
- Produces: `CoordinateReadout` interface and `buildCoordinateReadout(theta: number, r: number): CoordinateReadout`, with fields `tripleLatex`, `xLatex`, `yLatex`, `spoken`, `labelText`, `pairText`, `xText`, `yText`.

**Why this module exists:** the readout strings are the part of this feature with real branching — prefix dropping, exact-versus-decimal fallback, `=` versus `≈`. Building them inside the React component would put that logic where the node-environment test runner cannot reach it. Here it is fully unit-testable, and `AngleExplorer.tsx` is left with nothing to do but render.

- [ ] **Step 1: Write the failing test**

Create `src/scripts/explorer/angle-coordinates.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

import { buildCoordinateReadout } from './angle-coordinates';

describe('buildCoordinateReadout — worked equations', () => {
  it('drops the "1 ×" prefix on the unit circle, where it is only noise', () => {
    const out = buildCoordinateReadout(30, 1);
    expect(out.xLatex).toBe('x = r\\cos\\theta = \\frac{\\sqrt{3}}{2} \\approx 0.866');
    expect(out.yLatex).toBe('y = r\\sin\\theta = \\frac{1}{2} = 0.5');
  });

  it('shows r × the unit-circle value when the radius is not 1', () => {
    const out = buildCoordinateReadout(30, 1.2);
    expect(out.xLatex).toBe(
      'x = r\\cos\\theta = 1.2 \\times \\frac{\\sqrt{3}}{2} \\approx 1.0392',
    );
    expect(out.yLatex).toBe('y = r\\sin\\theta = 1.2 \\times \\frac{1}{2} = 0.6');
  });

  it('uses = for rational values and ≈ only where a radical forces rounding', () => {
    const out = buildCoordinateReadout(30, 1);
    // y = 1/2 is exactly 0.5; x = √3/2 is not exactly 0.866.
    expect(out.yLatex).toContain(' = 0.5');
    expect(out.yLatex).not.toContain('\\approx');
    expect(out.xLatex).toContain('\\approx');
  });

  it('falls back to a named cosine and sine when no exact form exists', () => {
    const out = buildCoordinateReadout(37, 1);
    expect(out.xLatex).toBe('x = r\\cos\\theta = \\cos 37^\\circ \\approx 0.7986');
    expect(out.yLatex).toBe('y = r\\sin\\theta = \\sin 37^\\circ \\approx 0.6018');
  });

  it('scales the fallback by r as well', () => {
    // 1.2 × cos 37° = 1.2 × 0.79863551 = 0.95836261, which rounds to 0.9584.
    const out = buildCoordinateReadout(37, 1.2);
    expect(out.xLatex).toBe(
      'x = r\\cos\\theta = 1.2 \\times \\cos 37^\\circ \\approx 0.9584',
    );
  });

  it('states a whole coordinate once instead of writing "0 = 0"', () => {
    // At 90° on the unit circle the exact x is 0 and the decimal is 0 — repeating
    // it as "0 = 0" is noise. Same for the exact 1 at 0°.
    expect(buildCoordinateReadout(90, 1).xLatex).toBe('x = r\\cos\\theta = 0');
    expect(buildCoordinateReadout(90, 1).yLatex).toBe('y = r\\sin\\theta = 1');
    expect(buildCoordinateReadout(0, 1).xLatex).toBe('x = r\\cos\\theta = 1');
    // With an r prefix the substitution is worth showing in full.
    expect(buildCoordinateReadout(0, 1.2).xLatex).toBe(
      'x = r\\cos\\theta = 1.2 \\times 1 = 1.2',
    );
  });
});

describe('buildCoordinateReadout — chart-style triple line', () => {
  it('reads degrees, exact radians, and the exact pair on the unit circle', () => {
    const out = buildCoordinateReadout(30, 1);
    expect(out.tripleLatex).toBe(
      '30^\\circ \\quad \\frac{\\pi}{6} \\quad \\left(\\frac{\\sqrt{3}}{2},\\ \\frac{1}{2}\\right)',
    );
  });

  it('shows decimals once the radius leaves the unit circle', () => {
    const out = buildCoordinateReadout(30, 1.2);
    expect(out.tripleLatex).toBe(
      '30^\\circ \\quad \\frac{\\pi}{6} \\quad \\left(1.0392,\\ 0.6\\right)',
    );
  });

  it('shows a decimal radian measure and decimal pair for a non-chart angle', () => {
    const out = buildCoordinateReadout(37, 1);
    expect(out.tripleLatex).toBe(
      '37^\\circ \\quad 0.6458\\text{ rad} \\quad \\left(0.7986,\\ 0.6018\\right)',
    );
  });
});

describe('buildCoordinateReadout — diagram label and export text', () => {
  it('labels the figure with the exact pair on the unit circle', () => {
    expect(buildCoordinateReadout(30, 1).labelText).toBe('(√3/2, 1/2)');
    expect(buildCoordinateReadout(225, 1).labelText).toBe('(-√2/2, -√2/2)');
  });

  it('labels the figure with two decimals elsewhere, keeping it narrow', () => {
    expect(buildCoordinateReadout(30, 1.2).labelText).toBe('(1.04, 0.60)');
    expect(buildCoordinateReadout(37, 1).labelText).toBe('(0.80, 0.60)');
  });

  it('never emits a signed zero in the label', () => {
    // cos(270°) is -1.8e-16 in floating point, which naively renders as "-0.00".
    expect(buildCoordinateReadout(270, 1.1).labelText).toBe('(0.00, -1.10)');
  });

  it('supplies four-decimal export text for the facts block and table', () => {
    const out = buildCoordinateReadout(30, 1.2);
    expect(out.pairText).toBe('(1.0392, 0.6)');
    expect(out.xText).toBe('1.2 × √3/2 ≈ 1.0392');
    expect(out.yText).toBe('1.2 × 1/2 = 0.6');
  });

  it('supplies bare export text on the unit circle, with no 1 × prefix', () => {
    const out = buildCoordinateReadout(30, 1);
    expect(out.xText).toBe('√3/2 ≈ 0.866');
    expect(out.yText).toBe('1/2 = 0.5');
  });

  it('supplies a named cosine in export text when no exact form exists', () => {
    expect(buildCoordinateReadout(37, 1).xText).toBe('cos 37° ≈ 0.7986');
  });
});

describe('buildCoordinateReadout — spoken', () => {
  it('speaks the exact form with no latex markup', () => {
    const spoken = buildCoordinateReadout(30, 1).spoken;
    expect(spoken).toBe(
      'The point is x equals square root of 3 over 2, about 0.866, ' +
        'and y equals 1 over 2, 0.5.',
    );
    expect(spoken).not.toContain('\\');
  });

  it('speaks the scaling factor when the radius is not 1', () => {
    expect(buildCoordinateReadout(30, 1.2).spoken).toBe(
      'The point is x equals 1.2 times square root of 3 over 2, about 1.0392, ' +
        'and y equals 1.2 times 1 over 2, 0.6.',
    );
  });

  it('speaks decimals only when no exact form exists', () => {
    expect(buildCoordinateReadout(37, 1).spoken).toBe(
      'The point is x equals about 0.7986, and y equals about 0.6018.',
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/scripts/explorer/angle-coordinates.test.ts`

Expected: FAIL — `Failed to resolve import "./angle-coordinates"`.

- [ ] **Step 3: Write the implementation**

Create `src/scripts/explorer/angle-coordinates.ts`:

```ts
/**
 * Display strings for the Angle Explorer's terminal-point readout.
 *
 * `unit-circle.ts` answers "what is the exact point"; this module answers "how
 * should it read". It is a separate module because the branching here — dropping
 * a `1 ×` prefix on the unit circle, falling back from radicals to a named
 * cosine, choosing `=` over `≈` — is the part worth testing, and the node test
 * runner cannot reach logic that lives inside a React component.
 *
 * Three output channels, three formatters, mirroring the trio `angle.ts`
 * establishes: KaTeX for the readout, plain text for the SVG label and export
 * artifact, and prose for the screen-reader live region.
 */
import {
  degreesToRadians,
  formatPiLatex,
  isIntegerDegrees,
  piMultiple,
} from './angle';
import { formatDegrees } from './angle-parse';
import {
  exactCoordinates,
  formatExactLatex,
  formatExactSpoken,
  formatExactText,
  type ExactValue,
} from './unit-circle';

export interface CoordinateReadout {
  /** Chart-style spoke: degrees, radian measure, and the point. KaTeX source. */
  tripleLatex: string;
  /** `x = r\cos\theta = 1.2 \times \frac{\sqrt{3}}{2} \approx 1.0392`. KaTeX source. */
  xLatex: string;
  yLatex: string;
  /** Screen-reader prose. No latex markup. */
  spoken: string;
  /** Narrow pair for the SVG label: `(√3/2, 1/2)` or `(1.04, 0.60)`. */
  labelText: string;
  /** Four-decimal pair for the export facts block: `(1.0392, 0.6)`. */
  pairText: string;
  /** Export table cells: `1.2 × √3/2 ≈ 1.0392`. */
  xText: string;
  yText: string;
}

/** Four decimals, matching the rest of the readout, with no float noise. */
const round4 = (n: number): string => String(Number(n.toFixed(4)));

/**
 * Two fixed decimals for the diagram label, where width is the constraint —
 * `(1.04, 0.60)` fits beside the dot where `(1.0392, 0.6018)` does not. Trailing
 * zeros are kept so the pair reads as a pair. `-0.00` is folded to `0.00`,
 * because cos(270°) is -1.8e-16 in floating point, not 0.
 */
const fixed2 = (n: number): string => {
  const s = n.toFixed(2);
  return s === '-0.00' ? '0.00' : s;
};

/** True when the value is rational, so its decimal form is exact and takes `=`. */
const isRational = (v: ExactValue): boolean => v.radicand === 1;

/**
 * One coordinate's worked equation, in whichever output alphabet the caller
 * needs. `exact` is null for non-chart angles, where the equation names the
 * trig function instead of a radical.
 *
 * `scaled` carries the `r ×` prefix, dropped entirely at r = 1 where a literal
 * `1 ×` is noise. The relation is `=` only when the decimal is exact.
 */
function equation(
  exact: ExactValue | null,
  value: number,
  r: number,
  fnLatex: string,
  fnText: string,
  degreeLabel: string,
  alphabet: 'latex' | 'text',
): string {
  const latex = alphabet === 'latex';
  const times = latex ? ' \\times ' : ' × ';
  const approx = latex ? ' \\approx ' : ' ≈ ';
  const exactPart =
    exact === null
      ? latex
        ? `${fnLatex} ${degreeLabel}^\\circ`
        : `${fnText} ${degreeLabel}°`
      : latex
        ? formatExactLatex(exact)
        : formatExactText(exact);
  const prefix = r === 1 ? '' : `${round4(r)}${times}`;
  const decimal = round4(value);
  // "0 = 0" and "1 = 1" are noise. With no r prefix, a whole coordinate whose
  // exact and decimal forms are the same string is stated once.
  if (prefix === '' && exactPart === decimal) return decimal;
  const relation = exact !== null && isRational(exact) ? ' = ' : approx;
  return `${prefix}${exactPart}${relation}${decimal}`;
}

/** The same equation as prose, for the live region. */
function spokenEquation(exact: ExactValue | null, value: number, r: number): string {
  const decimal = round4(value);
  if (exact === null) return `about ${decimal}`;
  const prefix = r === 1 ? '' : `${round4(r)} times `;
  const relation = isRational(exact) ? '' : 'about ';
  return `${prefix}${formatExactSpoken(exact)}, ${relation}${decimal}`;
}

/**
 * Every string the coordinate readout needs, for angle θ (degrees) and radius r.
 *
 * β is deliberately absent: it rotates the view, so the point it moves is still
 * the point θ describes. Arc length already treats β the same way.
 */
export function buildCoordinateReadout(theta: number, r: number): CoordinateReadout {
  const rad = degreesToRadians(theta);
  const x = r * Math.cos(rad);
  const y = r * Math.sin(rad);
  const exact = exactCoordinates(theta);
  const degreeLabel = formatDegrees(theta);

  const xLatex = `x = r\\cos\\theta = ${equation(exact?.x ?? null, x, r, '\\cos', 'cos', degreeLabel, 'latex')}`;
  const yLatex = `y = r\\sin\\theta = ${equation(exact?.y ?? null, y, r, '\\sin', 'sin', degreeLabel, 'latex')}`;
  const xText = equation(exact?.x ?? null, x, r, '\\cos', 'cos', degreeLabel, 'text');
  const yText = equation(exact?.y ?? null, y, r, '\\sin', 'sin', degreeLabel, 'text');

  // The label and the triple line share one rule: the exact pair appears only on
  // the unit circle, where it IS the chart's fact. Off it, the scaled radical is
  // too wide for a point label and lives in the equations instead.
  const showExactPair = exact !== null && r === 1;

  const labelText = showExactPair
    ? `(${formatExactText(exact.x)}, ${formatExactText(exact.y)})`
    : `(${fixed2(x)}, ${fixed2(y)})`;

  const pairLatex = showExactPair
    ? `\\left(${formatExactLatex(exact.x)},\\ ${formatExactLatex(exact.y)}\\right)`
    : `\\left(${round4(x)},\\ ${round4(y)}\\right)`;

  // The radian measure, exact where one exists — the chart's middle column.
  const radianLatex = isIntegerDegrees(theta)
    ? formatPiLatex(piMultiple(Math.round(theta)))
    : `${round4(rad)}\\text{ rad}`;

  return {
    tripleLatex: `${degreeLabel}^\\circ \\quad ${radianLatex} \\quad ${pairLatex}`,
    xLatex,
    yLatex,
    xText,
    yText,
    labelText,
    pairText: `(${round4(x)}, ${round4(y)})`,
    spoken:
      `The point is x equals ${spokenEquation(exact?.x ?? null, x, r)}, ` +
      `and y equals ${spokenEquation(exact?.y ?? null, y, r)}.`,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/scripts/explorer/angle-coordinates.test.ts`

Expected: PASS — 18 tests. If any expected string differs by a space, fix the **implementation** to match the test — the test encodes the approved design. A rounding-digit disagreement is the one exception: verify it with a calculator and correct whichever side is actually wrong.

- [ ] **Step 5: Run the whole unit suite and type-check**

Run: `npm test && npx astro check`

Expected: all tests pass, 0 type errors.

- [ ] **Step 6: Append the SUMMARY.md entry**

```markdown

## [2026-07-27 18:20] Commit Summary

**Change Type:** Feature
**Scope:** Angle Explorer — coordinate readout strings

**Summary:**
Added `src/scripts/explorer/angle-coordinates.ts`, building every display string the
coordinate readout needs: the chart-style triple line, the worked `x = r·cos θ`
equations, the narrow SVG label, four-decimal export text, and screen-reader prose.

**Rationale:**
This is where the feature's real branching lives — dropping the `1 ×` prefix at r = 1,
falling back from a radical to a named `cos 37°`, choosing `=` over `≈` when the
decimal is exact. Putting it in a pure module rather than inside `AngleExplorer.tsx`
keeps it reachable by the node test runner, since the project has no jsdom and tests
`.ts` only. The component is left with nothing to do but render.

**References:**
- TODO.md: [2026-07-27] Feature: Unit Circle Coordinates
```

- [ ] **Step 7: Commit**

```bash
git add src/scripts/explorer/angle-coordinates.ts src/scripts/explorer/angle-coordinates.test.ts SUMMARY.md
git commit -m "feat(explorer): coordinate readout strings

Builds the chart-style triple line, worked x = r cos theta equations,
narrow SVG label, export text, and spoken prose. Drops the 1 x prefix
on the unit circle and falls back to a named cosine off the chart."
```

---

### Task 3: Coordinate label on the diagram

**Files:**
- Modify: `src/scripts/explorer/angle-diagram.ts`
- Test: `src/scripts/explorer/angle-diagram.test.ts`

**Interfaces:**
- Consumes: `polarToCartesian` from `./angle-render` (already imported by this file).
- Produces: `AngleDiagramOptions` gains `coordinateLabel?: string`. When absent or empty, no label is drawn and the markup is byte-identical to today's.

- [ ] **Step 1: Write the failing test**

Append to `src/scripts/explorer/angle-diagram.test.ts`:

```ts
/**
 * Parse the coordinate label's anchor and alignment back out of the markup.
 * The attribute order here must match the order the builder emits — `data-role`
 * first, then x and y, with `text-anchor` later in the tag.
 */
function readLabel(svg: string): { x: number; y: number; anchor: string } | null {
  const match = svg.match(
    /<text data-role="coordinate-label" x="([-\d.]+)" y="([-\d.]+)"[^>]*text-anchor="(start|end)"/,
  );
  return match
    ? { x: Number(match[1]), y: Number(match[2]), anchor: match[3]! }
    : null;
}

describe('buildAngleDiagramSvg — coordinate label', () => {
  it('draws nothing when no label is supplied, leaving today\'s markup untouched', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 30 });
    expect(svg).not.toContain('data-role="coordinate-label"');
  });

  it('draws the supplied text beside the terminal dot', () => {
    const svg = buildAngleDiagramSvg({
      ...base,
      theta: 30,
      coordinateLabel: '(√3/2, 1/2)',
    });
    expect(svg).toContain('(√3/2, 1/2)');
    expect(readLabel(svg)).not.toBeNull();
  });

  it('keeps the label inside the viewBox across the whole r × θ domain', () => {
    const view = 320;
    // LABEL_WIDTH in the implementation; the label occupies this much horizontally.
    const width = 96;
    for (let r = 0.5; r <= 1.5001; r += 0.1) {
      for (let theta = -360; theta <= 360; theta += 15) {
        const svg = buildAngleDiagramSvg({
          ...base,
          r: Number(r.toFixed(1)),
          theta,
          coordinateLabel: '(-0.71, -0.71)',
        });
        const label = readLabel(svg);
        expect(label, `no label at r=${r} θ=${theta}`).not.toBeNull();
        const left = label!.anchor === 'start' ? label!.x : label!.x - width;
        const right = label!.anchor === 'start' ? label!.x + width : label!.x;
        expect(left, `overflows left at r=${r} θ=${theta}`).toBeGreaterThanOrEqual(0);
        expect(right, `overflows right at r=${r} θ=${theta}`).toBeLessThanOrEqual(view);
        expect(label!.y).toBeGreaterThanOrEqual(12);
        expect(label!.y).toBeLessThanOrEqual(view - 6);
      }
    }
  });

  it('flips the anchor inward rather than clipping at the widest radius', () => {
    // r = 1.5, θ = 0: the dot sits at x = 292 of 320. Outward placement would run
    // the label off the right edge, so it must flip to the inward side.
    const svg = buildAngleDiagramSvg({
      ...base,
      r: 1.5,
      theta: 0,
      coordinateLabel: '(1.50, 0.00)',
    });
    const label = readLabel(svg)!;
    expect(label.anchor).toBe('end');
    expect(label.x).toBeLessThan(292);
  });

  it('places the label at β + θ, so it travels with the dot it belongs to', () => {
    const atZero = buildAngleDiagramSvg({
      ...base,
      theta: 30,
      coordinateLabel: '(0.87, 0.50)',
    });
    const rotated = buildAngleDiagramSvg({
      ...base,
      theta: 30,
      beta: 90,
      coordinateLabel: '(0.87, 0.50)',
    });
    expect(readLabel(rotated)!.x).not.toBeCloseTo(readLabel(atZero)!.x, 3);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/scripts/explorer/angle-diagram.test.ts`

Expected: FAIL — the "draws the supplied text" test fails because `coordinateLabel` is not a recognised option and nothing is emitted.

- [ ] **Step 3: Write the implementation**

In `src/scripts/explorer/angle-diagram.ts`, add to the `AngleDiagramOptions` interface, after `measureR`:

```ts
  /**
   * Pre-formatted coordinate text for the terminal point, e.g. `(√3/2, 1/2)`.
   * Supplied by `angle-coordinates.ts` — this builder deliberately knows nothing
   * about exact maths. Omitted or empty draws no label.
   */
  coordinateLabel?: string;
```

Add above `buildAngleDiagramSvg`:

```ts
/**
 * Horizontal space the coordinate label occupies, in viewBox units. This builder
 * is a pure string function with no font metrics, so overflow is tested against a
 * reserved constant rather than measured text. Sized for the widest pair the
 * feature produces — `(-0.71, -0.71)` at font-size 10 — with margin.
 */
const LABEL_WIDTH = 96;
/** Radial gap between the terminal dot and the label anchor, in px. */
const LABEL_GAP = 14;
/** Keep-out margin at the viewBox edges, in px. */
const LABEL_MARGIN = 4;

/**
 * The coordinate label, anchored beside the terminal dot and clamped so no
 * combination of r and θ can push it out of the viewBox.
 *
 * Placement is outward from the dot with the text growing away from the figure.
 * At large r that would clip the edge, so it flips to the inward side and swaps
 * the alignment. The inward flip cannot collide with the angle-measure arc: it
 * only triggers at radii where the inward anchor is still far outside that arc's
 * 0.3-unit radius.
 *
 * LABEL_WIDTH is deliberately conservative — wider than the text actually is —
 * so the failure mode is flipping inward slightly sooner than strictly necessary
 * rather than clipping. An early flip is still perfectly readable; a clipped
 * label is not.
 */
function coordinateLabelMarkup(
  c: number,
  dotRadiusPx: number,
  endRad: number,
  view: number,
  text: string,
  fill: string,
): string {
  const outward = polarToCartesian(c, c, dotRadiusPx + LABEL_GAP, endRad);
  const rightSide = outward.x >= c;

  let anchorX = outward.x;
  let anchorY = outward.y;
  let textAnchor = rightSide ? 'start' : 'end';

  const overflows = rightSide
    ? anchorX + LABEL_WIDTH > view - LABEL_MARGIN
    : anchorX - LABEL_WIDTH < LABEL_MARGIN;

  if (overflows) {
    const inward = polarToCartesian(c, c, Math.max(dotRadiusPx - LABEL_GAP, 0), endRad);
    anchorX = inward.x;
    anchorY = inward.y;
    textAnchor = rightSide ? 'end' : 'start';
  }

  const y = Math.min(Math.max(anchorY, 12), view - 6);
  return (
    `<text data-role="coordinate-label" x="${anchorX}" y="${y}" fill="${fill}" ` +
    `font-size="10" font-weight="600" text-anchor="${textAnchor}" ` +
    `dominant-baseline="middle">${text}</text>`
  );
}
```

Then, inside `buildAngleDiagramSvg`, after the `terminalDot` declaration, add:

```ts
  // tickText, not the terminal-side red: #e24b4a clears only 3.93:1 against
  // white, below the 4.5:1 floor for text. Weight and size carry the emphasis
  // instead.
  const labelMarkup =
    opts.coordinateLabel !== undefined && opts.coordinateLabel !== ''
      ? coordinateLabelMarkup(c, r * unit, endRad, view, opts.coordinateLabel, tickText)
      : '';
```

Finally, append `labelMarkup` to the returned markup string, after the two endpoint `<circle>` elements:

```ts
    `<circle cx="${terminalDot.x}" cy="${terminalDot.y}" r="3.5" fill="${colors.point}" stroke="${colors.pointStroke}" />` +
    labelMarkup
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/scripts/explorer/angle-diagram.test.ts`

Expected: PASS — the 4 existing tests plus 5 new ones.

- [ ] **Step 5: Run the whole unit suite and type-check**

Run: `npm test && npx astro check`

Expected: all pass, 0 type errors. The existing diagram tests must still pass unchanged — omitting `coordinateLabel` produces byte-identical markup.

- [ ] **Step 6: Append the SUMMARY.md entry**

```markdown

## [2026-07-27 18:40] Commit Summary

**Change Type:** Feature
**Scope:** Angle Explorer — diagram coordinate label

**Summary:**
`buildAngleDiagramSvg` accepts an optional pre-formatted `coordinateLabel` and draws it
beside the terminal dot, with placement clamped so no combination of r and θ can push
it out of the viewBox. At large radii the anchor flips inward and the alignment swaps
rather than clipping the edge.

**Rationale:**
The label text is passed in already formatted so this builder keeps knowing nothing
about exact maths — it stays a pure geometry-to-markup function. Because it is the
single source of truth for both the live figure and the export artifact, the label
reaches the exported PNG/PDF with no additional work.

Overflow is tested against a reserved width constant rather than measured text, since a
pure string builder has no font metrics. The label uses `tickText` rather than the
terminal-side red, which clears only 3.93:1 against white — below the 4.5:1 floor for
text; weight and size carry the emphasis instead.

**References:**
- TODO.md: [2026-07-27] Feature: Unit Circle Coordinates
```

- [ ] **Step 7: Commit**

```bash
git add src/scripts/explorer/angle-diagram.ts src/scripts/explorer/angle-diagram.test.ts SUMMARY.md
git commit -m "feat(explorer): coordinate label on the angle diagram

Optional pre-formatted label drawn beside the terminal dot, with
clamped placement that flips inward at large radii instead of
clipping the viewBox. Reaches the export via the shared builder."
```

---

### Task 4: Wire the readout into the component

**Files:**
- Modify: `src/components/explorer/AngleExplorer.tsx`

**Interfaces:**
- Consumes: `buildCoordinateReadout` from `@/scripts/explorer/angle-coordinates`; `coordinateLabel` option on `buildAngleDiagramSvg`.
- Produces: a `data-testid="angle-coordinates"` block, for Task 5's Playwright tests to target.

This task has no unit test of its own — the logic it wires up is already fully covered by Tasks 1–3, and the project has no jsdom. Its verification is a type-check, a build, and the Playwright coverage added in Task 5.

- [ ] **Step 1: Add the import**

In `src/components/explorer/AngleExplorer.tsx`, after the `angle-parse` import block:

```ts
import { buildCoordinateReadout } from '@/scripts/explorer/angle-coordinates';
```

- [ ] **Step 2: Build the readout and its KaTeX**

After the existing `radiansExactHtml` memo, add:

```tsx
  // Coordinates depend on θ and r only — β rotates the view, so the point it
  // moves is still the point θ describes, exactly as arc length already treats it.
  const coords = useMemo(() => buildCoordinateReadout(theta, r), [theta, r]);
  const coordHtml = useMemo(
    () => ({
      triple: katex.renderToString(coords.tripleLatex, {
        throwOnError: false,
        displayMode: false,
        output: 'html',
      }),
      x: katex.renderToString(coords.xLatex, {
        throwOnError: false,
        displayMode: false,
        output: 'html',
      }),
      y: katex.renderToString(coords.yLatex, {
        throwOnError: false,
        displayMode: false,
        output: 'html',
      }),
    }),
    [coords.tripleLatex, coords.xLatex, coords.yLatex],
  );
```

- [ ] **Step 3: Add coordinates to the live region**

Change the debounced announcement effect so the spoken coordinate sentence rides along with the existing one:

```tsx
  const [announced, setAnnounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setAnnounced(`${readout.spoken} ${coords.spoken}`), 250);
    return () => clearTimeout(id);
  }, [readout.spoken, coords.spoken]);
```

- [ ] **Step 4: Pass the label into the live diagram**

In the `<svg>` element's `dangerouslySetInnerHTML`, add the label:

```tsx
          dangerouslySetInnerHTML={{
            __html: buildAngleDiagramSvg({
              theta,
              r,
              beta,
              colors,
              tickText,
              coordinateLabel: coords.labelText,
            }),
          }}
```

- [ ] **Step 5: Render the coordinates block**

Immediately after the closing `</div>` of the existing `data-testid="angle-readout"` block, add:

```tsx
        <div
          data-testid="angle-coordinates"
          aria-hidden="true"
          className="mt-3 space-y-2 rounded-lg border bg-card p-4 text-center"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Coordinates
          </p>
          <div dangerouslySetInnerHTML={{ __html: coordHtml.triple }} />
          <div className="space-y-1 text-sm text-muted-foreground">
            <div dangerouslySetInnerHTML={{ __html: coordHtml.x }} />
            <div dangerouslySetInnerHTML={{ __html: coordHtml.y }} />
          </div>
        </div>
```

`aria-hidden` matches the existing readout box: KaTeX markup is noise to a screen reader, and the live region already carries the same facts as prose.

- [ ] **Step 6: Add the β note**

Change the attribution paragraph's preceding sibling — insert this directly above it:

```tsx
        <p className="mt-3 text-center text-xs text-muted-foreground">
          The position slider β rotates the view; coordinates are measured from θ.
        </p>
```

- [ ] **Step 7: Type-check and build**

Run: `npx astro check && npm run build`

Expected: 0 type errors, build succeeds.

- [ ] **Step 8: Verify in the browser**

Run: `npm run dev`, open `http://localhost:4321/explorers/angles`.

Confirm: at the 30°/r=1 default the coordinates block reads `30° π/6 (√3/2, 1/2)` with `x = r cos θ = √3/2 ≈ 0.866` and `y = r sin θ = 1/2 = 0.5`; the label `(√3/2, 1/2)` sits beside the terminal dot; dragging the radius slider to 1.2 switches both to decimals and adds the `1.2 ×` prefix to the equations; dragging the radius to 1.5 with θ = 0 keeps the label on-canvas; the dark-mode toggle re-themes the label.

- [ ] **Step 9: Append the SUMMARY.md entry**

```markdown

## [2026-07-27 19:00] Commit Summary

**Change Type:** Feature
**Scope:** Angle Explorer — coordinates block

**Summary:**
`AngleExplorer.tsx` renders the coordinates block below the existing conversion chain,
passes the formatted label into the shared diagram builder, appends the spoken
coordinate sentence to the live region, and notes that β rotates the view while
coordinates are measured from θ.

**Rationale:**
The component only renders — every branch (prefix dropping, exact-versus-decimal,
`=` versus `≈`) already lives in `angle-coordinates.ts` where the node test runner can
reach it. The coordinates box is `aria-hidden` for the same reason the existing readout
is: KaTeX markup is noise to a screen reader, and the debounced live region carries the
same facts as prose.

**References:**
- TODO.md: [2026-07-27] Feature: Unit Circle Coordinates
```

- [ ] **Step 10: Commit**

```bash
git add src/components/explorer/AngleExplorer.tsx SUMMARY.md
git commit -m "feat(explorer): render the coordinates block

Adds the chart-style triple line and worked equations below the
conversion chain, pins the label to the terminal dot, and extends the
live region. Notes that beta rotates the view while coordinates are
measured from theta."
```

---

### Task 5: Export, end-to-end coverage, and docs

**Files:**
- Modify: `src/components/explorer/AngleExplorer.tsx` (the `createExportSnapshot` function)
- Modify: `tests/e2e/angle.spec.ts`
- Modify: `tests/e2e/angle-export.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: `coords.pairText`, `coords.xText`, `coords.yText`, `coords.labelText` from Task 2's `CoordinateReadout`.

- [ ] **Step 1: Write the failing end-to-end tests**

Append to `tests/e2e/angle.spec.ts`:

```ts
const COORDS = '[data-testid="angle-coordinates"]';

test('shows the exact unit-circle point at the default angle', async ({ page }) => {
  await goto(page);
  const coords = page.locator(COORDS);
  await expect(coords).toContainText('√3');
  await expect(coords).toContainText('0.866');
});

test('labels the terminal point on the diagram itself', async ({ page }) => {
  await goto(page);
  await expect(
    page.locator(`${DIAGRAM} [data-role="coordinate-label"]`),
  ).toContainText('√3/2');
});

test('switches to decimals and shows the r scaling when the radius moves', async ({
  page,
}) => {
  await goto(page);
  // Radix puts role="slider" on the THUMB, while the id and aria-label sit on the
  // root — so getByRole('slider', {name: 'radius'}) does not resolve. Target the
  // thumb inside the identified root instead.
  const slider = page.locator('#slider-radius [role="slider"]');
  await slider.focus();
  // The radius slider steps 0.1, so two presses take the 1.0 default to 1.2.
  await slider.press('ArrowRight');
  await slider.press('ArrowRight');

  const coords = page.locator(COORDS);
  await expect(coords).toContainText('1.2');
  await expect(coords).toContainText('1.0392');
});

test('falls back to a named cosine for an angle off the chart', async ({ page }) => {
  await goto(page);
  await deg(page).fill('37');
  const coords = page.locator(COORDS);
  await expect(coords).toContainText('0.7986');
  await expect(coords).not.toContainText('√');
});
```

Append to `tests/e2e/angle-export.spec.ts`:

```ts
test('carries the terminal point into the exported artifact', async ({ page }) => {
  await goto(page);

  await downloadExport(page, 'PNG', async (artifact) => {
    const text = await artifact.evaluate((node) => node.textContent);
    // Default is 30° on the unit circle.
    expect(text).toContain('Point (x, y)');
    expect(text).toContain('√3/2');
    expect(text).toContain('0.866');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx playwright test tests/e2e/angle.spec.ts tests/e2e/angle-export.spec.ts`

Expected: the four new `angle.spec.ts` tests fail (no `angle-coordinates` testid yet if Task 4 is not merged; if it is, only the export test fails), and the export test fails on `Point (x, y)`.

- [ ] **Step 3: Extend the export snapshot**

In `createExportSnapshot` in `src/components/explorer/AngleExplorer.tsx`, add above the `return`:

```ts
    const snapshotCoords = buildCoordinateReadout(snapshotTheta, snapshotR);
```

Add to the `Circle` section's `facts` array, after the `Arc length` entry:

```ts
              { label: 'Point (x, y)', value: snapshotCoords.pairText },
```

Add to the `table.rows` array, after the `Exact radians` row:

```ts
            ['x = r·cos θ', snapshotCoords.xText],
            ['y = r·sin θ', snapshotCoords.yText],
```

That takes the table to 7 rows, within `MAX_EXPORT_TABLE_ROWS = 9`.

Add the label to the export diagram, in `renderGraph`:

```ts
        target.innerHTML = `<svg viewBox="0 0 320 320" width="${EXPORT_GRAPH_WIDTH}" height="${EXPORT_GRAPH_HEIGHT}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${buildAngleDiagramSvg(
          {
            theta: snapshotTheta,
            r: snapshotR,
            beta: snapshotBeta,
            colors: lightColors,
            tickText: '#334155',
            coordinateLabel: snapshotCoords.labelText,
          },
        )}</svg>`;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx playwright test tests/e2e/angle.spec.ts tests/e2e/angle-export.spec.ts`

Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test && npx astro check && npm run build && npm run test:e2e`

Expected: all unit tests pass, 0 type errors, build succeeds, all Playwright tests pass — including `export-visual.spec.ts`, which is unaffected because it has no angle-explorer baseline.

- [ ] **Step 6: Check coverage on the changed code**

Run: `npm run test:coverage`

Expected: `unit-circle.ts` and `angle-coordinates.ts` at or above 80% line coverage. If either falls short, add the missing cases to that module's test file before proceeding.

- [ ] **Step 7: Update the README**

In `README.md`, find the Angle Explorer feature description and add a sentence covering the coordinates readout:

```markdown
The terminal point is reported in the unit-circle reference chart's three-part form —
degrees, radian measure, and exact coordinates such as `(√3/2, 1/2)` — with the worked
`x = r·cos θ` substitution below it. Exact radicals appear at the chart's 16 angles
(multiples of 30° and 45°); every other angle falls back to decimals. The position
slider β rotates the view, so coordinates are always measured from θ.
```

- [ ] **Step 8: Append the SUMMARY.md entry**

```markdown

## [2026-07-27 19:20] Commit Summary

**Change Type:** Feature
**Scope:** Angle Explorer — export and end-to-end coverage

**Summary:**
The export artifact gains a `Point (x, y)` fact, `x = r·cos θ` and `y = r·sin θ` table
rows (7 of the 9-row cap), and the coordinate label in its diagram. Added Playwright
coverage for the exact point at the default angle, the on-diagram label, the switch to
decimals and `r ×` scaling when the radius moves, the named-cosine fallback off the
chart, and the new export rows. README updated.

**Rationale:**
Keeps the exported sheet a faithful record of the screen. No PNG baseline regeneration
was needed: `export-visual.spec.ts` covers only graphing-calculator, function-explorer,
and transformation-explorer — there is no angle-explorer baseline.

**References:**
- TODO.md: [2026-07-27] Feature: Unit Circle Coordinates
```

- [ ] **Step 9: Commit**

```bash
git add src/components/explorer/AngleExplorer.tsx tests/e2e/angle.spec.ts tests/e2e/angle-export.spec.ts README.md SUMMARY.md
git commit -m "feat(explorer): export the terminal point and cover it end to end

Adds the Point (x, y) fact, the two substitution table rows, and the
diagram label to the export artifact, with Playwright coverage for the
exact point, the decimal fallback, and the r scaling."
```

- [ ] **Step 10: Open the pull request**

```bash
git push -u origin feature/unit-circle-coordinates
```

Open a PR against `main` describing the feature, the four design decisions from the spec, and the note that no visual baselines needed regeneration. Do not self-approve or auto-merge.

---

## Notes for the implementer

**If a test in Task 2 fails on an exact string**, the test is authoritative — it encodes the approved design. Fix the implementation. The one exception is a genuine arithmetic disagreement (e.g. `1.2 × cos 37°` is 0.9583 or 0.9584); verify with a calculator and correct whichever side is wrong.

**Do not attempt to unit-test `AngleExplorer.tsx` directly.** It uses `useState`, `useEffect`, and `document`, and the project has no jsdom. `renderToStaticMarkup` works for stateless components like `FunctionDetailsPanels` but not this one. Task 4's verification is deliberately type-check plus browser plus Playwright.

**The `LABEL_WIDTH = 96` constant appears in both the implementation and Task 3's test.** If you change one, change the other — the test's overflow assertion is meaningless otherwise.
