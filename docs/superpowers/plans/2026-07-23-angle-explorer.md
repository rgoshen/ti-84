# Angle Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a standalone Angle Explorer at `/explorers/angles` that renders a sweeping angle on an adjustable-radius circle, shows the same measurement five ways at once, and converts between degrees and radians in both directions.

**Architecture:** Three pure, DOM-free logic modules (`angle.ts` exact arithmetic, `angle-parse.ts` input parsing, `angle-render.ts` SVG geometry) unit-tested in the node environment, consumed by one React component that renders **hand-authored SVG**. This explorer deliberately does **not** use function-plot: the diagram is polar (circle, arc, rays, ticks), not `y = f(x)`, so function-plot's Cartesian model does not apply.

**Tech Stack:** Astro 7 · React 19 · TypeScript (strict) · Tailwind 4 · radix-ui primitives via `src/components/ui/` · mathjs (parsing only) · KaTeX (readout) · vitest (unit) · Playwright (e2e)

**Spec:** GitHub issue [#14](https://github.com/rgoshen/ti-84/issues/14). Requirements below are traceable to it.

## Global Constraints

- **GitFlow:** all work on `feature/angle-explorer`, branched from `main`. No direct commits to `main`.
- **Conventional Commits** (`feat:`, `test:`, `docs:`, `fix:`, `refactor:`).
- **Never add `Co-Authored-By` or any AI-generation trailer to commits or PRs.** This is a project rule and overrides any default harness behavior.
- **Strict TDD:** every logic step is write-failing-test → run-and-see-it-fail → minimal implementation → run-and-see-it-pass → commit.
- **`SUMMARY.md`:** append an entry before the final commit of each task (format in `CLAUDE.md` §11.5).
- **Path alias:** `@/*` → `./src/*`.
- **Test env:** vitest runs `environment: 'node'`, include glob `src/**/*.{test,spec}.ts` — logic modules must stay DOM-free.
- **Degrees are the single source of truth.** θ state is a **float** degree value, never an integer. The slider snaps to 1°; typed entry does not.
- **Do NOT add Playwright visual-snapshot baselines.** PNG baselines must be generated on Linux/Docker; baselines committed from macOS fail CI deterministically. Out of scope for this plan.
- **Accessibility target:** WCAG 2.1 AA. Non-text graphical elements ≥3:1 contrast in both themes.
- **Never pass raw user input to `mathjs.evaluate()`** — see Task 2.

---

### Task 0: Branch and TODO entry

**Files:**
- Modify: `TODO.md`

- [ ] **Step 1: Create the feature branch**

```bash
git checkout main
git pull
git checkout -b feature/angle-explorer
```

- [ ] **Step 2: Append the TODO.md entry**

Add at the end of `TODO.md`:

```md
## [2026-07-23] Feature: Angle Explorer (degrees ↔ radians)

**Objective:**
Add `/explorers/angles`: sweep an angle on an adjustable-radius circle, read it five
ways at once (degrees, turn fraction, ×2π, exact π-multiple, decimal radians) plus
arc length, and convert in both directions via linked degree/radian fields.

**Approach:**
Three pure modules — `angle.ts` (exact arithmetic), `angle-parse.ts` (input parsing
with a whitelist guard before mathjs), `angle-render.ts` (SVG path geometry) — behind
one React component rendering hand-authored SVG. Not function-plot: the diagram is
polar, not y = f(x).

**Tests:**
Unit: fraction reduction incl. 180°→π and 37°→37π/180; parser valid/invalid/injection
cases; arc paths at >180° and exactly ±360°. E2E: slider drives readout, `pi/3` → 60°,
`1` rad → 57.2958°, invalid input leaves the diagram intact, reset restores defaults.

**Risks & Tradeoffs:**
A full ±360° arc cannot be drawn with one SVG `A` command and must be split. Exact
π forms must be suppressed for non-integer degrees or the readout prints absurd
fractions. mathjs `evaluate` on raw input is a known injection surface.
```

- [ ] **Step 3: Commit**

```bash
git add TODO.md
git commit -m "docs(explorer): plan Angle Explorer feature"
```

---

### Task 1: `angle.ts` — exact angle arithmetic

**Files:**
- Create: `src/scripts/explorer/angle.ts`
- Test: `src/scripts/explorer/angle.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Fraction {n, d}`, `DEG_EPS`, `degreesToRadians(deg): number`, `radiansToDegrees(rad): number`, `reduceFraction(n, d): Fraction`, `turnFraction(deg): Fraction`, `piMultiple(deg): Fraction`, `isIntegerDegrees(deg): boolean`, `formatPiLatex(f): string`, `formatFractionLatex(f): string`, `arcLength(r, radians): number`.

- [ ] **Step 1: Write the failing test**

Create `src/scripts/explorer/angle.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  degreesToRadians,
  radiansToDegrees,
  reduceFraction,
  turnFraction,
  piMultiple,
  isIntegerDegrees,
  formatPiLatex,
  formatFractionLatex,
  arcLength,
} from './angle';

describe('degree ↔ radian conversion', () => {
  it('converts the anchor values', () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI, 12);
    expect(degreesToRadians(-90)).toBeCloseTo(-Math.PI / 2, 12);
    expect(radiansToDegrees(Math.PI)).toBeCloseTo(180, 12);
  });

  it('round-trips 1 radian to the value the 1° slider cannot reach', () => {
    expect(radiansToDegrees(1)).toBeCloseTo(57.2958, 4);
  });
});

describe('reduceFraction', () => {
  it('reduces to lowest terms', () => {
    expect(reduceFraction(30, 360)).toEqual({ n: 1, d: 12 });
    expect(reduceFraction(180, 180)).toEqual({ n: 1, d: 1 });
  });

  it('keeps the sign on the numerator', () => {
    expect(reduceFraction(-90, 360)).toEqual({ n: -1, d: 4 });
    expect(reduceFraction(90, -360)).toEqual({ n: -1, d: 4 });
  });

  it('reduces zero to 0/1 rather than dividing by zero', () => {
    expect(reduceFraction(0, 360)).toEqual({ n: 0, d: 1 });
  });

  it('throws on a zero denominator', () => {
    expect(() => reduceFraction(1, 0)).toThrow();
  });
});

describe('turnFraction — θ as a share of a full turn', () => {
  it('matches the readout examples', () => {
    expect(turnFraction(30)).toEqual({ n: 1, d: 12 });
    expect(turnFraction(360)).toEqual({ n: 1, d: 1 });
    expect(turnFraction(-360)).toEqual({ n: -1, d: 1 });
    expect(turnFraction(0)).toEqual({ n: 0, d: 1 });
  });
});

describe('piMultiple — θ as an exact multiple of π', () => {
  it('handles the special angles', () => {
    expect(piMultiple(30)).toEqual({ n: 1, d: 6 });
    expect(piMultiple(90)).toEqual({ n: 1, d: 2 });
    expect(piMultiple(180)).toEqual({ n: 1, d: 1 });
    expect(piMultiple(270)).toEqual({ n: 3, d: 2 });
    expect(piMultiple(360)).toEqual({ n: 2, d: 1 });
    expect(piMultiple(-30)).toEqual({ n: -1, d: 6 });
  });

  it('leaves a non-special angle irreducible', () => {
    expect(piMultiple(37)).toEqual({ n: 37, d: 180 });
  });
});

describe('isIntegerDegrees — guards the exact forms', () => {
  it('accepts integers and rejects typed decimals', () => {
    expect(isIntegerDegrees(30)).toBe(true);
    expect(isIntegerDegrees(-360)).toBe(true);
    expect(isIntegerDegrees(57.2958)).toBe(false);
  });
});

describe('formatPiLatex', () => {
  it('never emits a denominator of 1 or a bare coefficient of 1', () => {
    expect(formatPiLatex({ n: 1, d: 1 })).toBe('\\pi');
    expect(formatPiLatex({ n: 2, d: 1 })).toBe('2\\pi');
    expect(formatPiLatex({ n: 1, d: 6 })).toBe('\\frac{\\pi}{6}');
    expect(formatPiLatex({ n: 3, d: 2 })).toBe('\\frac{3\\pi}{2}');
    expect(formatPiLatex({ n: -2, d: 3 })).toBe('-\\frac{2\\pi}{3}');
    expect(formatPiLatex({ n: 0, d: 1 })).toBe('0');
  });
});

describe('formatFractionLatex', () => {
  it('renders plain fractions for the turn share', () => {
    expect(formatFractionLatex({ n: 1, d: 12 })).toBe('\\frac{1}{12}');
    expect(formatFractionLatex({ n: 1, d: 1 })).toBe('1');
    expect(formatFractionLatex({ n: 0, d: 1 })).toBe('0');
    expect(formatFractionLatex({ n: -1, d: 4 })).toBe('-\\frac{1}{4}');
  });
});

describe('arcLength — s = rθ', () => {
  it('equals the radian measure on the unit circle', () => {
    expect(arcLength(1, Math.PI / 6)).toBeCloseTo(Math.PI / 6, 12);
  });

  it('diverges from the radian measure once r ≠ 1 — the whole teaching point', () => {
    expect(arcLength(1.5, Math.PI / 6)).toBeCloseTo(0.7854, 4);
  });

  it('is a magnitude, so a negative sweep still has positive length', () => {
    expect(arcLength(1, -Math.PI / 2)).toBeCloseTo(Math.PI / 2, 12);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/scripts/explorer/angle.test.ts`
Expected: FAIL — `Failed to resolve import "./angle"`.

- [ ] **Step 3: Write minimal implementation**

Create `src/scripts/explorer/angle.ts`:

```ts
/**
 * Exact angle arithmetic for the Angle Explorer: degree ↔ radian conversion plus
 * the exact turn-fraction and π-multiple forms the readout is built from.
 *
 * Showing `π/6` is the point — `0.524` alone does not teach the relationship — so
 * these reductions are exact integer maths, not float formatting. Pure and
 * DOM-free so it unit-tests in the node environment, like `transform.ts`.
 */

/** Fraction in lowest terms; the sign always rides on the numerator. */
export interface Fraction {
  n: number;
  d: number;
}

/**
 * How close to a whole degree still counts as "exact". Typed radian input lands
 * on values like 59.9885°, which must NOT be rendered as an exact π-multiple.
 */
export const DEG_EPS = 1e-9;

export function degreesToRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radiansToDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Greatest common divisor (Euclid) on magnitudes. */
function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

/**
 * Reduce n/d to lowest terms. Integer inputs only — callers must gate on
 * {@link isIntegerDegrees} first, because gcd on floats is meaningless.
 */
export function reduceFraction(n: number, d: number): Fraction {
  if (d === 0) throw new Error('reduceFraction: zero denominator');
  const sign = d < 0 ? -1 : 1;
  const g = gcd(n, d) || 1; // gcd(0, d) === d, so this only guards gcd(0, 0)
  return { n: (sign * n) / g, d: (sign * d) / g };
}

/** θ as a share of one full turn: 30 → 1/12, 360 → 1/1. */
export function turnFraction(deg: number): Fraction {
  return reduceFraction(deg, 360);
}

/** θ as an exact multiple of π: 30 → 1/6 (π/6), 180 → 1/1 (π), 360 → 2/1 (2π). */
export function piMultiple(deg: number): Fraction {
  return reduceFraction(deg, 180);
}

/** True when an exact π / turn form is meaningful for this angle. */
export function isIntegerDegrees(deg: number): boolean {
  return Math.abs(deg - Math.round(deg)) < DEG_EPS;
}

/** KaTeX for an exact π-multiple: `0`, `\pi`, `2\pi`, `\frac{\pi}{6}`, `-\frac{2\pi}{3}`. */
export function formatPiLatex(f: Fraction): string {
  if (f.n === 0) return '0';
  const sign = f.n < 0 ? '-' : '';
  const mag = Math.abs(f.n);
  const numerator = mag === 1 ? '\\pi' : `${mag}\\pi`;
  return f.d === 1 ? `${sign}${numerator}` : `${sign}\\frac{${numerator}}{${f.d}}`;
}

/** KaTeX for a plain fraction: `0`, `1`, `\frac{1}{12}`, `-\frac{1}{4}`. */
export function formatFractionLatex(f: Fraction): string {
  if (f.n === 0) return '0';
  const sign = f.n < 0 ? '-' : '';
  const mag = Math.abs(f.n);
  return f.d === 1 ? `${sign}${mag}` : `${sign}\\frac{${mag}}{${f.d}}`;
}

/**
 * Arc length s = r·θ (θ in radians), as a magnitude — a length has no sign even
 * when the sweep is clockwise. On the unit circle this equals the radian measure;
 * that coincidence breaking as r moves is what the radius slider exists to show.
 */
export function arcLength(r: number, radians: number): number {
  return Math.abs(r * radians);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/scripts/explorer/angle.test.ts`
Expected: PASS — all suites green.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/explorer/angle.ts src/scripts/explorer/angle.test.ts
git commit -m "feat(explorer): add exact angle arithmetic for degrees and radians"
```

---

### Task 2: `angle-parse.ts` — bidirectional input parsing

**Files:**
- Create: `src/scripts/explorer/angle-parse.ts`
- Test: `src/scripts/explorer/angle-parse.test.ts`

**Interfaces:**
- Consumes: `degreesToRadians`, `radiansToDegrees` from `./angle`.
- Produces: `ParseResult`, `MAX_DEG`, `parseAngleInput(raw, unit): ParseResult`, `formatDegrees(deg): string`, `formatRadiansDecimal(deg): string`.

- [ ] **Step 1: Write the failing test**

Create `src/scripts/explorer/angle-parse.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseAngleInput, formatDegrees, formatRadiansDecimal, MAX_DEG } from './angle-parse';

/** Narrow to the success branch so the tests read cleanly. */
const deg = (raw: string, unit: 'deg' | 'rad'): number => {
  const r = parseAngleInput(raw, unit);
  if (!r.ok) throw new Error(`expected success, got: ${r.error}`);
  return r.degrees;
};

describe('parseAngleInput — degrees', () => {
  it('accepts plain and signed decimals', () => {
    expect(deg('30', 'deg')).toBeCloseTo(30, 9);
    expect(deg('-45.5', 'deg')).toBeCloseTo(-45.5, 9);
    expect(deg('  90  ', 'deg')).toBeCloseTo(90, 9);
  });

  it('accepts arithmetic', () => {
    expect(deg('180/2', 'deg')).toBeCloseTo(90, 9);
  });
});

describe('parseAngleInput — radians', () => {
  it('converts exact π expressions', () => {
    expect(deg('pi/3', 'rad')).toBeCloseTo(60, 9);
    expect(deg('2*pi/3', 'rad')).toBeCloseTo(120, 9);
    expect(deg('-pi/6', 'rad')).toBeCloseTo(-30, 9);
  });

  it('accepts the unicode π and is case-insensitive', () => {
    expect(deg('π/3', 'rad')).toBeCloseTo(60, 9);
    expect(deg('PI/3', 'rad')).toBeCloseTo(60, 9);
  });

  it('converts 1 radian to the value the 1° slider cannot reach', () => {
    expect(deg('1', 'rad')).toBeCloseTo(57.2958, 4);
  });
});

describe('parseAngleInput — rejection', () => {
  it('rejects empty and whitespace-only input', () => {
    expect(parseAngleInput('', 'deg').ok).toBe(false);
    expect(parseAngleInput('   ', 'deg').ok).toBe(false);
  });

  it('rejects unparseable text', () => {
    expect(parseAngleInput('abc', 'deg').ok).toBe(false);
    expect(parseAngleInput('(', 'deg').ok).toBe(false);
  });

  it('rejects non-finite results', () => {
    expect(parseAngleInput('1/0', 'deg').ok).toBe(false);
    expect(parseAngleInput('1e999', 'deg').ok).toBe(false);
  });

  it('rejects values beyond the slider range', () => {
    expect(parseAngleInput('361', 'deg').ok).toBe(false);
    expect(parseAngleInput('-361', 'deg').ok).toBe(false);
    expect(parseAngleInput(String(MAX_DEG), 'deg').ok).toBe(true);
  });

  it('rejects injection-shaped input BEFORE it can reach the evaluator', () => {
    // mathjs has a documented history of sandbox-escape advisories; the whitelist
    // is the security boundary, so these must fail on the guard, not on evaluate().
    for (const attack of [
      'config',
      'import("fs")',
      'x.constructor',
      '[].map(f)',
      'evaluate("1")',
    ]) {
      const r = parseAngleInput(attack, 'deg');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/numbers/i);
    }
  });
});

describe('formatters', () => {
  it('trims float noise for display', () => {
    expect(formatDegrees(60.000000001)).toBe('60');
    expect(formatDegrees(57.29577951)).toBe('57.2958');
  });

  it('renders decimal radians', () => {
    expect(formatRadiansDecimal(180)).toBe('3.1416');
    expect(formatRadiansDecimal(0)).toBe('0');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/scripts/explorer/angle-parse.test.ts`
Expected: FAIL — `Failed to resolve import "./angle-parse"`.

- [ ] **Step 3: Write minimal implementation**

Create `src/scripts/explorer/angle-parse.ts`:

```ts
/**
 * Parsing for the linked degrees/radians fields.
 *
 * The slider steps 1°, but 1 radian is 57.2958° — the diagram draws a tick the
 * slider can never land on. These fields close that gap, so parsing must accept
 * exact forms like `pi/3` as well as decimals.
 */
import { evaluate } from 'mathjs';
import { degreesToRadians, radiansToDegrees } from './angle';

export type ParseResult = { ok: true; degrees: number } | { ok: false; error: string };

/** Widest angle accepted, matching the θ slider range. */
export const MAX_DEG = 360;

/** Slack for the range check so a typed `360` is not rejected by float error. */
const RANGE_EPS = 1e-9;

/**
 * SECURITY BOUNDARY. mathjs has a documented history of sandbox-escape
 * advisories, so raw user text must never reach `evaluate()`. The accepted
 * grammar is tiny — digits, `.`, the four operators, parentheses, whitespace and
 * the literal `pi` — so we blank out `pi` and require everything left over to be
 * in that character class. Anything else is rejected before evaluation.
 */
function isSafeExpression(src: string): boolean {
  return /^[0-9+\-*/().\s]*$/.test(src.replace(/pi/g, ' '));
}

/**
 * Parse one field's text into degrees. Degrees are the single source of truth,
 * so radian input is converted here and the caller stores degrees only.
 */
export function parseAngleInput(raw: string, unit: 'deg' | 'rad'): ParseResult {
  const src = raw.trim().toLowerCase().replace(/π/g, 'pi');
  if (src === '') return { ok: false, error: 'Enter an angle.' };
  if (!isSafeExpression(src)) {
    return { ok: false, error: 'Use numbers, + − * /, parentheses, and pi only.' };
  }

  let value: unknown;
  try {
    value = evaluate(src);
  } catch {
    return { ok: false, error: 'That is not a valid expression.' };
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { ok: false, error: 'That is not a finite number.' };
  }

  const degrees = unit === 'deg' ? value : radiansToDegrees(value);
  if (Math.abs(degrees) > MAX_DEG + RANGE_EPS) {
    return { ok: false, error: `Enter an angle between −${MAX_DEG}° and ${MAX_DEG}°.` };
  }
  return { ok: true, degrees };
}

/** Four decimals is enough to show 57.2958 without exposing float noise. */
const DECIMALS = 4;

const trim = (n: number): string => String(Number(n.toFixed(DECIMALS)));

export function formatDegrees(deg: number): string {
  return trim(deg);
}

export function formatRadiansDecimal(deg: number): string {
  return trim(degreesToRadians(deg));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/scripts/explorer/angle-parse.test.ts`
Expected: PASS — including all five injection strings rejected on the guard.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/explorer/angle-parse.ts src/scripts/explorer/angle-parse.test.ts
git commit -m "feat(explorer): parse degree and radian input with a whitelist guard"
```

---

### Task 3: `angle-render.ts` — SVG geometry

**Files:**
- Create: `src/scripts/explorer/angle-render.ts`
- Test: `src/scripts/explorer/angle-render.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Point {x, y}`, `polarToCartesian(cx, cy, r, radians): Point`, `arcPath(cx, cy, r, startRad, endRad): string`, `tickAngles(thetaRad): number[]`, `arrowheadPoints(cx, cy, r, radians, sign): string`.

- [ ] **Step 1: Write the failing test**

Create `src/scripts/explorer/angle-render.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { polarToCartesian, arcPath, tickAngles, arrowheadPoints } from './angle-render';

/** Pull the numeric flags out of `A rx ry rot largeArc sweep x y`. */
const flagsOf = (path: string): Array<{ largeArc: string; sweep: string }> =>
  [...path.matchAll(/A [\d.]+ [\d.]+ 0 ([01]) ([01])/g)].map((m) => ({
    largeArc: m[1],
    sweep: m[2],
  }));

describe('polarToCartesian', () => {
  it('places 0 rad to the right of centre', () => {
    const p = polarToCartesian(100, 100, 50, 0);
    expect(p.x).toBeCloseTo(150, 9);
    expect(p.y).toBeCloseTo(100, 9);
  });

  it('flips y so a positive angle rises on screen', () => {
    // SVG y grows downward; +90° must land ABOVE centre (smaller y).
    const p = polarToCartesian(100, 100, 50, Math.PI / 2);
    expect(p.x).toBeCloseTo(100, 9);
    expect(p.y).toBeCloseTo(50, 9);
  });
});

describe('arcPath', () => {
  it('is empty for a zero sweep', () => {
    expect(arcPath(100, 100, 50, 0, 0)).toBe('');
  });

  it('uses large-arc-flag 0 below 180°', () => {
    const flags = flagsOf(arcPath(100, 100, 50, 0, Math.PI / 2));
    expect(flags).toHaveLength(1);
    expect(flags[0].largeArc).toBe('0');
  });

  it('uses large-arc-flag 1 above 180°', () => {
    const flags = flagsOf(arcPath(100, 100, 50, 0, (3 * Math.PI) / 2));
    expect(flags).toHaveLength(1);
    expect(flags[0].largeArc).toBe('1');
  });

  it('flips sweep-flag with the direction of rotation', () => {
    const ccw = flagsOf(arcPath(100, 100, 50, 0, Math.PI / 2))[0];
    const cw = flagsOf(arcPath(100, 100, 50, 0, -Math.PI / 2))[0];
    expect(ccw.sweep).toBe('0');
    expect(cw.sweep).toBe('1');
  });

  it('splits a full 360° sweep into two arcs — one A command would draw nothing', () => {
    const full = arcPath(100, 100, 50, 0, 2 * Math.PI);
    expect(flagsOf(full)).toHaveLength(2);
  });

  it('splits a full −360° sweep too, preserving direction', () => {
    const full = arcPath(100, 100, 50, 0, -2 * Math.PI);
    const flags = flagsOf(full);
    expect(flags).toHaveLength(2);
    expect(flags.every((f) => f.sweep === '1')).toBe(true);
  });
});

describe('tickAngles', () => {
  it('always yields at least one tick, even below 1 radian', () => {
    // 30° is 0.5236 rad. The source demo showed nothing here, which reads as a bug.
    expect(tickAngles(Math.PI / 6)).toEqual([1]);
    expect(tickAngles(0)).toEqual([1]);
  });

  it('yields every whole radian up to θ', () => {
    expect(tickAngles(3.4)).toEqual([1, 2, 3]);
  });

  it('mirrors for a negative sweep', () => {
    expect(tickAngles(-3.4)).toEqual([-1, -2, -3]);
    expect(tickAngles(-Math.PI / 6)).toEqual([-1]);
  });

  it('covers the full ±360° range (2π ≈ 6.28 rad)', () => {
    expect(tickAngles(2 * Math.PI)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('arrowheadPoints', () => {
  it('returns three comma-separated coordinate pairs', () => {
    const pts = arrowheadPoints(100, 100, 50, Math.PI / 2, 1).split(' ');
    expect(pts).toHaveLength(3);
    for (const p of pts) expect(p).toMatch(/^-?[\d.]+,-?[\d.]+$/);
  });

  it('points the opposite way when the sweep reverses', () => {
    const ccw = arrowheadPoints(100, 100, 50, Math.PI / 2, 1);
    const cw = arrowheadPoints(100, 100, 50, Math.PI / 2, -1);
    expect(ccw).not.toBe(cw);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/scripts/explorer/angle-render.test.ts`
Expected: FAIL — `Failed to resolve import "./angle-render"`.

- [ ] **Step 3: Write minimal implementation**

Create `src/scripts/explorer/angle-render.ts`:

```ts
/**
 * SVG path geometry for the Angle Explorer diagram. Pure number → string, with
 * no DOM access, so every arc-flag decision is unit-testable in the node env.
 *
 * Coordinate convention: SVG y grows DOWNWARD, so every conversion negates the
 * sine. Without that flip, positive angles would sweep clockwise on screen —
 * backwards from every textbook.
 */

export interface Point {
  x: number;
  y: number;
}

export function polarToCartesian(cx: number, cy: number, r: number, radians: number): Point {
  return { x: cx + r * Math.cos(radians), y: cy - r * Math.sin(radians) };
}

/** Below this, a sweep is treated as nothing rather than a degenerate arc. */
const ZERO = 1e-9;

/**
 * A circular arc from `startRad` to `endRad`.
 *
 * Two traps this exists to avoid:
 *  1. An arc wider than 180° needs large-arc-flag = 1, or SVG draws the minor arc.
 *  2. A FULL ±360° arc cannot be expressed with one `A` command — start and end
 *     coincide, so the renderer draws nothing at all. θ reaches exactly ±360°, so
 *     the full turn is split into two half-arcs.
 *
 * Sweep-flag 1 is clockwise in screen space; because y is flipped, a
 * mathematically positive (counter-clockwise) sweep is sweep-flag 0.
 */
export function arcPath(
  cx: number,
  cy: number,
  r: number,
  startRad: number,
  endRad: number,
): string {
  const delta = endRad - startRad;
  if (Math.abs(delta) < ZERO) return '';

  if (Math.abs(delta) >= 2 * Math.PI - ZERO) {
    const mid = startRad + delta / 2;
    return `${arcPath(cx, cy, r, startRad, mid)} ${arcPath(cx, cy, r, mid, endRad)}`;
  }

  const start = polarToCartesian(cx, cy, r, startRad);
  const end = polarToCartesian(cx, cy, r, endRad);
  const largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
  const sweep = delta > 0 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
}

/**
 * Whole-radian tick positions from the initial side toward θ.
 *
 * The source Demonstration emitted nothing below |θ| = 1 rad, so at its own 30°
 * default the radian scale vanished — which reads as a bug. We always emit the
 * first tick, so a student at 30° can see that the angle is about half a radian.
 */
export function tickAngles(thetaRad: number): number[] {
  const dir = thetaRad < 0 ? -1 : 1;
  const whole = Math.floor(Math.abs(thetaRad));
  const count = Math.max(1, whole);
  return Array.from({ length: count }, (_, i) => dir * (i + 1));
}

/** How far behind the tip the arrowhead's base sits, in radians. */
const HEAD_SWEEP = 0.12;

/**
 * Triangle for the sweep arrowhead as an SVG `points` attribute. `sign` is the
 * sweep direction (+1 counter-clockwise, −1 clockwise) so the head always points
 * the way the angle is growing.
 */
export function arrowheadPoints(
  cx: number,
  cy: number,
  r: number,
  radians: number,
  sign: number,
): string {
  const back = radians - sign * HEAD_SWEEP;
  const tip = polarToCartesian(cx, cy, r, radians);
  const inner = polarToCartesian(cx, cy, r * 0.93, back);
  const outer = polarToCartesian(cx, cy, r * 1.07, back);
  return `${tip.x},${tip.y} ${inner.x},${inner.y} ${outer.x},${outer.y}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/scripts/explorer/angle-render.test.ts`
Expected: PASS — note the two ±360° split cases pass.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/explorer/angle-render.ts src/scripts/explorer/angle-render.test.ts
git commit -m "feat(explorer): add SVG arc geometry with full-turn split handling"
```

---

### Task 4: Route, config, and catalog card

**Files:**
- Create: `src/pages/explorers/angles.astro`
- Create: `src/components/explorer/AngleExplorer.tsx` (skeleton)
- Modify: `src/config.ts`
- Modify: `src/pages/explorers/index.astro`

**Interfaces:**
- Consumes: nothing from Tasks 1–3 yet.
- Produces: route `/explorers/angles`; default-exported `AngleExplorer` component; `SITE_TITLE_ANGLE_EXPLORER` constant.

- [ ] **Step 1: Add the title constant**

Append to `src/config.ts`, after `SITE_TITLE_TRANSFORMATION_EXPLORER`:

```ts
export const SITE_TITLE_ANGLE_EXPLORER =
  import.meta.env.PUBLIC_SITE_TITLE_ANGLE_EXPLORER ?? 'Angle Explorer';
```

- [ ] **Step 2: Create the component skeleton**

Create `src/components/explorer/AngleExplorer.tsx`:

```tsx
import { useState } from 'react';

/** Slider defaults, also the reset target. */
const DEFAULTS = { theta: 30, r: 1, beta: 0 };

export default function AngleExplorer(): React.JSX.Element {
  const [theta] = useState(DEFAULTS.theta);
  return (
    <div data-testid="angle-explorer" className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <p className="text-sm text-muted-foreground">Angle: {theta}°</p>
    </div>
  );
}
```

- [ ] **Step 3: Create the page**

Create `src/pages/explorers/angles.astro`:

```astro
---
import 'katex/dist/katex.min.css';
import Base from '@/layouts/Base.astro';
import { SITE_TITLE_ANGLE_EXPLORER } from '@/config';
import AngleExplorer from '@/components/explorer/AngleExplorer.tsx';
---

<Base
  title={SITE_TITLE_ANGLE_EXPLORER}
  description="Sweep an angle around a circle and watch degrees, radians, and arc length stay in step — then convert between degrees and radians in either direction."
>
  <section class="py-6">
    <h1 class="text-2xl font-semibold tracking-tight">{SITE_TITLE_ANGLE_EXPLORER}</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted-foreground">
      Drag <strong>angle</strong> to sweep the arc, and <strong>radius</strong> to grow the
      circle. On the unit circle the radian measure and the arc length are the same number
      &mdash; change the radius and watch them come apart. Type into either field to convert
      between degrees and radians.
    </p>
  </section>
  <AngleExplorer client:only="react" />
</Base>
```

- [ ] **Step 4: Add the catalog card**

In `src/pages/explorers/index.astro`, add `SITE_TITLE_ANGLE_EXPLORER` to the existing import from `@/config`, then add this third `<a>` inside the grid, after the Transformation Explorer card:

```astro
    <a
      href="/explorers/angles"
      class="group rounded-xl border bg-card p-6 shadow-sm transition-colors hover:bg-accent"
    >
      <h2 class="text-lg font-medium">{SITE_TITLE_ANGLE_EXPLORER}</h2>
      <p class="mt-2 text-sm text-muted-foreground">
        Sweep an angle on a circle you can resize &mdash; see degrees, radians, and arc length
        move together, then convert between them in either direction.
      </p>
      <span class="mt-4 inline-block text-sm font-medium group-hover:underline">
        Open the Angle Explorer &rarr;
      </span>
    </a>
```

- [ ] **Step 5: Verify the route builds and renders**

Run: `npm run build`
Expected: build succeeds, output includes `explorers/angles/index.html`.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/config.ts src/pages/explorers/angles.astro src/pages/explorers/index.astro src/components/explorer/AngleExplorer.tsx
git commit -m "feat(explorer): scaffold the Angle Explorer route and catalog card"
```

---

### Task 5: SVG diagram and sliders

**Files:**
- Modify: `src/components/explorer/AngleExplorer.tsx` (full rewrite of the skeleton)

**Interfaces:**
- Consumes: `degreesToRadians`, `arcLength` from `./angle`; `polarToCartesian`, `arcPath`, `tickAngles`, `arrowheadPoints` from `./angle-render`; `explorerColors` from `@/scripts/graphing/theme`; `Slider`, `Button`, `Label` from `@/components/ui/*`.
- Produces: the rendered diagram at `data-testid="angle-diagram"`; sliders named `angle`, `radius`, `position`; a reset button.

- [ ] **Step 1: Replace the component with the diagram implementation**

Overwrite `src/components/explorer/AngleExplorer.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { explorerColors } from '@/scripts/graphing/theme';
import { degreesToRadians } from '@/scripts/explorer/angle';
import {
  arcPath,
  arrowheadPoints,
  polarToCartesian,
  tickAngles,
} from '@/scripts/explorer/angle-render';

/** Slider defaults, also the reset target. */
const DEFAULTS = { theta: 30, r: 1, beta: 0 };

/** viewBox is fixed and the container is fluid, so the figure scales with no
 *  "large format" toggle — the source Demonstration only needed one because
 *  Mathematica cannot reflow. */
const VIEW = 320;
const C = VIEW / 2;
/** Pixels per unit radius, leaving room for tick labels outside r = 1.5. */
const UNIT = 88;
/** Radius of the small angle-measure arc, in units. */
const MEASURE_R = 0.3;

export default function AngleExplorer(): React.JSX.Element {
  const [theta, setTheta] = useState(DEFAULTS.theta); // degrees, float
  const [r, setR] = useState(DEFAULTS.r);
  const [beta, setBeta] = useState(DEFAULTS.beta); // degrees

  const [dark, setDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

  // Track the site theme so the diagram re-themes with the header toggle.
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setDark(el.classList.contains('dark')));
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const colors = useMemo(() => explorerColors(dark), [dark]);
  const axis = dark ? '#64748b' : '#94a3b8';
  const text = dark ? '#e2e8f0' : '#334155';

  const thetaRad = degreesToRadians(theta);
  const betaRad = degreesToRadians(beta);
  const sign = theta < 0 ? -1 : 1;
  const endRad = betaRad + thetaRad;

  const reset = (): void => {
    setTheta(DEFAULTS.theta);
    setR(DEFAULTS.r);
    setBeta(DEFAULTS.beta);
  };

  const initialTip = polarToCartesian(C, C, (r + 0.2) * UNIT, betaRad);
  const terminalTip = polarToCartesian(C, C, (r + 0.2) * UNIT, endRad);
  const initialDot = polarToCartesian(C, C, r * UNIT, betaRad);
  const terminalDot = polarToCartesian(C, C, r * UNIT, endRad);

  const sliders = [
    {
      id: 'angle',
      label: 'angle',
      value: theta,
      min: -360,
      max: 360,
      step: 1,
      set: setTheta,
      suffix: '°',
    },
    { id: 'radius', label: 'radius', value: r, min: 0.5, max: 1.5, step: 0.1, set: setR, suffix: '' },
    {
      id: 'position',
      label: 'position',
      value: beta,
      min: -360,
      max: 360,
      step: 1,
      set: setBeta,
      suffix: '°',
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-5">
        {sliders.map((s) => (
          <div key={s.id} className="space-y-2">
            <Label htmlFor={`slider-${s.id}`} className="justify-between">
              <span>{s.label}</span>
              <span className="font-mono text-muted-foreground">
                {s.value}
                {s.suffix}
              </span>
            </Label>
            <Slider
              id={`slider-${s.id}`}
              aria-label={s.label}
              aria-valuetext={`${s.value}${s.suffix}`}
              value={[s.value]}
              min={s.min}
              max={s.max}
              step={s.step}
              onValueChange={([v]) => s.set(v)}
            />
          </div>
        ))}
        <Button type="button" variant="outline" onClick={reset}>
          Reset
        </Button>
      </div>

      <div data-testid="angle-diagram" className="mx-auto w-full max-w-lg">
        <svg
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Angle of ${theta} degrees swept on a circle of radius ${r}.`}
        >
          {/* Reference axes and the unit circle. */}
          <line x1={C - 1.35 * UNIT} y1={C} x2={C + 1.35 * UNIT} y2={C} stroke={axis} strokeWidth={1} />
          <line x1={C} y1={C - 1.35 * UNIT} x2={C} y2={C + 1.35 * UNIT} stroke={axis} strokeWidth={1} />
          <circle cx={C} cy={C} r={UNIT} fill="none" stroke={axis} strokeWidth={1} strokeDasharray="3 3" />

          {/* The adjustable circle. */}
          <circle cx={C} cy={C} r={r * UNIT} fill="none" stroke={colors.ghost} strokeWidth={1.5} />

          {/* Whole-radian ticks, scaling with r. */}
          {tickAngles(thetaRad).map((a) => {
            const inner = polarToCartesian(C, C, r * UNIT, betaRad + a);
            const outer = polarToCartesian(C, C, (r + 0.1) * UNIT, betaRad + a);
            const label = polarToCartesian(C, C, (r + 0.22) * UNIT, betaRad + a);
            return (
              <g key={a}>
                <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={axis} strokeWidth={1.5} />
                <text
                  x={label.x}
                  y={label.y}
                  fill={text}
                  fontSize={9}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {a} rad
                </text>
              </g>
            );
          })}

          {/* Small angle-measure arc with its direction arrowhead. */}
          <path
            d={arcPath(C, C, MEASURE_R * UNIT, betaRad, endRad)}
            fill="none"
            stroke={colors.arrow}
            strokeWidth={1.5}
          />
          <polygon
            points={arrowheadPoints(C, C, MEASURE_R * UNIT, endRad, sign)}
            fill={colors.arrow}
          />

          {/* The swept arc — its length is the radian measure when r = 1. */}
          <path
            d={arcPath(C, C, r * UNIT, betaRad, endRad)}
            fill="none"
            stroke={colors.curve}
            strokeWidth={3}
          />

          {/* Initial and terminal rays. */}
          <line x1={C} y1={C} x2={initialTip.x} y2={initialTip.y} stroke={colors.floor} strokeWidth={2} />
          <line x1={C} y1={C} x2={terminalTip.x} y2={terminalTip.y} stroke={colors.wall} strokeWidth={2} />
          <circle cx={initialDot.x} cy={initialDot.y} r={3.5} fill={colors.point} stroke={colors.pointStroke} />
          <circle cx={terminalDot.x} cy={terminalDot.y} r={3.5} fill={colors.point} stroke={colors.pointStroke} />
        </svg>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds and typechecks**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Verify manually in the browser**

Run: `npm run dev`, open `http://localhost:4321/explorers/angles`.
Expected, all four checked by eye:
1. At the 30° default, one arc sweeps counter-clockwise from the positive x-axis and a `1 rad` tick is visible.
2. Dragging **angle** to 360° draws a complete circle (this is the two-arc split — if the arc vanishes at exactly 360°, `arcPath` is wrong).
3. Dragging **angle** negative flips the arrowhead to clockwise.
4. Dragging **radius** grows the solid circle away from the dashed unit circle.

- [ ] **Step 4: Commit**

```bash
git add src/components/explorer/AngleExplorer.tsx
git commit -m "feat(explorer): render the angle diagram with sliders and reset"
```

---

### Task 6: KaTeX readout with arc length

**Files:**
- Modify: `src/components/explorer/AngleExplorer.tsx`

**Interfaces:**
- Consumes: `turnFraction`, `piMultiple`, `isIntegerDegrees`, `formatPiLatex`, `formatFractionLatex`, `arcLength`, `degreesToRadians` from `@/scripts/explorer/angle`.
- Produces: readout at `data-testid="angle-readout"`; `announcement` string reused by Task 8.

- [ ] **Step 1: Add the readout builder above the component**

Add these imports to the existing import block in `AngleExplorer.tsx`:

```tsx
import katex from 'katex';
import {
  arcLength,
  degreesToRadians,
  formatFractionLatex,
  formatPiLatex,
  isIntegerDegrees,
  piMultiple,
  turnFraction,
} from '@/scripts/explorer/angle';
```

(Replace the existing single-name `degreesToRadians` import from `./angle` with this one.)

Then add above `export default function AngleExplorer`:

```tsx
/** Round for display without exposing float noise. */
const round4 = (n: number): string => String(Number(n.toFixed(4)));

/**
 * The five-way identity plus arc length, as KaTeX source.
 *
 * Exact π and turn forms are shown ONLY for whole degrees. `piMultiple` reduces
 * deg/180 with integer gcd, so a typed 1.047 rad (59.9885°) would otherwise render
 * as an absurd fraction. Non-integer angles fall back to decimals alone.
 */
function buildReadout(theta: number, r: number): { chain: string; arc: string; spoken: string } {
  const rad = degreesToRadians(theta);
  const decimal = round4(rad);
  const s = arcLength(r, rad);

  if (!isIntegerDegrees(theta)) {
    return {
      chain: `${round4(theta)}^\\circ = ${decimal}\\text{ rad}`,
      arc: `s = r\\theta = ${round4(r)} \\times ${decimal} \\approx ${round4(s)}`,
      spoken: `${round4(theta)} degrees is ${decimal} radians. Arc length ${round4(s)}.`,
    };
  }

  const turn = formatFractionLatex(turnFraction(theta));
  const pi = formatPiLatex(piMultiple(theta));
  return {
    chain:
      `${theta}^\\circ = ${turn}\\text{ of a full turn} = ${turn} \\times 2\\pi ` +
      `= ${pi} \\approx ${decimal}\\text{ rad}`,
    // Written out with real numbers, not a bare s = rθ.
    arc: `s = r\\theta = ${round4(r)} \\times ${pi} \\approx ${round4(s)}`,
    spoken: `${theta} degrees is ${turn} of a full turn, ${pi} radians, about ${decimal}. Arc length ${round4(s)}.`,
  };
}
```

- [ ] **Step 2: Compute the readout inside the component**

Immediately after the `const endRad = betaRad + thetaRad;` line, add:

```tsx
  const readout = useMemo(() => buildReadout(theta, r), [theta, r]);
  const chainHtml = useMemo(
    () => katex.renderToString(readout.chain, { throwOnError: false, displayMode: false }),
    [readout.chain],
  );
  const arcHtml = useMemo(
    () => katex.renderToString(readout.arc, { throwOnError: false, displayMode: false }),
    [readout.arc],
  );
```

- [ ] **Step 3: Render the readout under the diagram**

Inside the diagram `<div data-testid="angle-diagram">`, immediately after the closing `</svg>`, add:

```tsx
        <div
          data-testid="angle-readout"
          aria-hidden="true"
          className="mt-4 space-y-2 rounded-lg border bg-card p-4 text-center"
        >
          <div dangerouslySetInnerHTML={{ __html: chainHtml }} />
          <div className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: arcHtml }} />
        </div>
```

The readout is `aria-hidden` because KaTeX markup reads as noise to a screen reader; Task 8 adds the live region that speaks `readout.spoken` instead. This mirrors `TransformationExplorer.tsx`.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run dev` and open `/explorers/angles`.
Expected at defaults: `30° = 1/12 of a full turn = 1/12 × 2π = π/6 ≈ 0.5236 rad` and `s = rθ = 1 × π/6 ≈ 0.5236`. Drag **radius** to 1.5 — the chain is unchanged but `s` becomes `≈ 0.7854`, which is the divergence the feature exists to show.

- [ ] **Step 5: Commit**

```bash
git add src/components/explorer/AngleExplorer.tsx
git commit -m "feat(explorer): add the five-way KaTeX readout with arc length"
```

---

### Task 7: Bidirectional degree/radian fields

**Files:**
- Modify: `src/components/explorer/AngleExplorer.tsx`

**Interfaces:**
- Consumes: `parseAngleInput`, `formatDegrees`, `formatRadiansDecimal` from `@/scripts/explorer/angle-parse`; `Input` from `@/components/ui/input`.
- Produces: inputs labelled `Degrees` and `Radians`; error text at `data-testid="angle-input-error"`.

- [ ] **Step 1: Add the imports**

```tsx
import { Input } from '@/components/ui/input';
import {
  formatDegrees,
  formatRadiansDecimal,
  parseAngleInput,
} from '@/scripts/explorer/angle-parse';
```

- [ ] **Step 2: Add field state and handlers inside the component**

After the `reset` function, add:

```tsx
  // Draft text for the two fields. Kept separate from θ so a half-typed value
  // ("-", "pi/") never destroys the diagram, and so the field being edited is
  // not reformatted mid-keystroke.
  const [degText, setDegText] = useState(() => formatDegrees(DEFAULTS.theta));
  const [radText, setRadText] = useState(() => formatRadiansDecimal(DEFAULTS.theta));
  const [editing, setEditing] = useState<'deg' | 'rad' | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  // Reflect θ into whichever field is NOT being edited. Slider drags and reset
  // update both; typing updates only the other one.
  useEffect(() => {
    if (editing !== 'deg') setDegText(formatDegrees(theta));
    if (editing !== 'rad') setRadText(formatRadiansDecimal(theta));
  }, [theta, editing]);

  const onFieldChange = (unit: 'deg' | 'rad', raw: string): void => {
    if (unit === 'deg') setDegText(raw);
    else setRadText(raw);

    const result = parseAngleInput(raw, unit);
    if (!result.ok) {
      // Non-destructive: report the problem, leave the diagram on the last valid angle.
      setInputError(result.error);
      return;
    }
    setInputError(null);
    setTheta(result.degrees);
  };

  // Normalise the edited field only on blur, so it cannot fight the typist.
  const onFieldBlur = (): void => {
    setEditing(null);
    setInputError(null);
  };
```

Also extend `reset` so the fields and error clear with everything else — replace the existing `reset` body with:

```tsx
  const reset = (): void => {
    setTheta(DEFAULTS.theta);
    setR(DEFAULTS.r);
    setBeta(DEFAULTS.beta);
    setEditing(null);
    setInputError(null);
  };
```

- [ ] **Step 3: Render the fields**

In the controls column, between the sliders `.map(...)` block and the `<Button>`, insert:

```tsx
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium">Convert</p>
          {(
            [
              { unit: 'deg' as const, label: 'Degrees', value: degText, hint: 'e.g. 30 or 180/2' },
              { unit: 'rad' as const, label: 'Radians', value: radText, hint: 'e.g. 1, pi/3, 2*pi/3' },
            ]
          ).map((f) => (
            <div key={f.unit} className="space-y-1">
              <Label htmlFor={`field-${f.unit}`}>{f.label}</Label>
              <Input
                id={`field-${f.unit}`}
                value={f.value}
                inputMode="text"
                aria-invalid={inputError !== null && editing === f.unit}
                aria-describedby={`hint-${f.unit}${inputError ? ' angle-input-error' : ''}`}
                onFocus={() => setEditing(f.unit)}
                onBlur={onFieldBlur}
                onChange={(e) => onFieldChange(f.unit, e.target.value)}
              />
              <p id={`hint-${f.unit}`} className="text-xs text-muted-foreground">
                {f.hint}
              </p>
            </div>
          ))}
          {inputError && (
            <p
              id="angle-input-error"
              data-testid="angle-input-error"
              role="alert"
              className="text-xs font-medium text-destructive"
            >
              {inputError}
            </p>
          )}
        </div>
```

The hint text is not decoration: `pi/3` being valid input is undiscoverable otherwise. The error is announced via `role="alert"` and carries text, never colour alone.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run dev` and open `/explorers/angles`. Check by hand:
1. Type `pi/3` in **Radians** → degrees shows `60`, diagram sweeps to 60°.
2. Type `1` in **Radians** → degrees shows `57.2958` — the value the slider cannot reach.
3. Type `abc` in **Degrees** → error appears, diagram unchanged.
4. Drag the **angle** slider → both fields update.
5. Press **Reset** → fields return to `30` / `0.5236`, error clears.

- [ ] **Step 5: Commit**

```bash
git add src/components/explorer/AngleExplorer.tsx
git commit -m "feat(explorer): add bidirectional degree and radian input fields"
```

---

### Task 8: Screen-reader announcements

**Files:**
- Modify: `src/components/explorer/AngleExplorer.tsx`

**Interfaces:**
- Consumes: `readout.spoken` from Task 6.
- Produces: a polite live region; no new exports.

- [ ] **Step 1: Add the coalesced announcement**

After the `readout` / `arcHtml` memos, add:

```tsx
  // The readout box is aria-hidden (KaTeX markup is noise to a screen reader), so
  // this live region is how the conversion reaches assistive tech at all. Debounced
  // so a slider drag announces once on settle rather than on every frame.
  const [announced, setAnnounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setAnnounced(readout.spoken), 250);
    return () => clearTimeout(id);
  }, [readout.spoken]);
```

- [ ] **Step 2: Render the live region**

Immediately after the readout `<div data-testid="angle-readout">…</div>`, add:

```tsx
        <p className="sr-only" role="status" aria-live="polite">
          {announced}
        </p>
```

- [ ] **Step 3: Improve the slider announcements**

The `aria-valuetext` added in Task 5 announces `30°`, which is correct but thin. Replace the `aria-valuetext` expression on the **angle** slider only by changing its entry in the `sliders` array to carry a spoken form:

```tsx
    {
      id: 'angle',
      label: 'angle',
      value: theta,
      min: -360,
      max: 360,
      step: 1,
      set: setTheta,
      suffix: '°',
      spoken: `${theta} degrees, ${round4(degreesToRadians(theta))} radians`,
    },
```

Give the other two entries `spoken: undefined`, then change the `Slider`'s prop to:

```tsx
              aria-valuetext={s.spoken ?? `${s.value}${s.suffix}`}
```

A bare number is not meaningful here — the whole feature is about the pairing.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/explorer/AngleExplorer.tsx
git commit -m "feat(explorer): announce angle conversions to screen readers"
```

---

### Task 9: End-to-end tests and docs

**Files:**
- Create: `tests/e2e/angle.spec.ts`
- Modify: `README.md`
- Modify: `SUMMARY.md`

**Interfaces:**
- Consumes: everything above, via the rendered page.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing e2e spec**

Create `tests/e2e/angle.spec.ts`:

```ts
import { test, expect, type Page } from '@playwright/test';

const DIAGRAM = '[data-testid="angle-diagram"]';
const READOUT = '[data-testid="angle-readout"]';

async function goto(page: Page): Promise<void> {
  await page.goto('/explorers/angles');
  await expect(page.locator(`${DIAGRAM} svg`)).toBeVisible();
}

test('renders the default angle with its exact radian form', async ({ page }) => {
  await goto(page);
  const readout = page.locator(READOUT);
  await expect(readout).toContainText('30');
  await expect(readout).toContainText('0.5236');
});

test('is reachable from the explorers catalog', async ({ page }) => {
  await page.goto('/explorers');
  await page.getByRole('link', { name: /Open the Angle Explorer/i }).click();
  await expect(page).toHaveURL(/\/explorers\/angles/);
  await expect(page.locator(`${DIAGRAM} svg`)).toBeVisible();
});

test('converts pi/3 typed in radians to exactly 60 degrees', async ({ page }) => {
  await goto(page);
  await page.getByLabel('Radians').fill('pi/3');
  await expect(page.getByLabel('Degrees')).toHaveValue('60');
  await expect(page.locator(READOUT)).toContainText('60');
});

test('converts 1 radian to the value the 1-degree slider cannot reach', async ({ page }) => {
  await goto(page);
  await page.getByLabel('Radians').fill('1');
  await expect(page.getByLabel('Degrees')).toHaveValue('57.2958');
});

test('degrees drive radians in the other direction', async ({ page }) => {
  await goto(page);
  await page.getByLabel('Degrees').fill('180');
  await expect(page.getByLabel('Radians')).toHaveValue('3.1416');
});

test('invalid input reports an error and leaves the diagram intact', async ({ page }) => {
  await goto(page);
  await page.getByLabel('Degrees').fill('abc');
  await expect(page.getByTestId('angle-input-error')).toBeVisible();
  // The last valid angle survives the typo.
  await expect(page.locator(READOUT)).toContainText('30');
  await expect(page.locator(`${DIAGRAM} svg`)).toBeVisible();
});

test('the angle slider drives the readout and both fields', async ({ page }) => {
  await goto(page);
  const angle = page.getByRole('slider', { name: 'angle' });
  await angle.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  await expect(page.getByLabel('Degrees')).toHaveValue('35');
});

test('a full 360 degree sweep still draws an arc', async ({ page }) => {
  await goto(page);
  // Regression guard: a 360° arc built from a single SVG "A" command renders nothing.
  await page.getByLabel('Degrees').fill('360');
  const drawn = await page.locator(`${DIAGRAM} svg path`).evaluateAll((nodes) =>
    nodes.some((n) => (n.getAttribute('d') ?? '').split('A').length > 2),
  );
  expect(drawn).toBe(true);
});

test('reset restores every control', async ({ page }) => {
  await goto(page);
  await page.getByLabel('Degrees').fill('200');
  await expect(page.getByLabel('Degrees')).toHaveValue('200');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByLabel('Degrees')).toHaveValue('30');
  await expect(page.getByLabel('Radians')).toHaveValue('0.5236');
});
```

- [ ] **Step 2: Run the spec**

Run: `npx playwright test tests/e2e/angle.spec.ts`
Expected: all 9 tests PASS. If the 360° test fails, `arcPath`'s full-turn split is not reaching the DOM — fix `angle-render.ts`, not the test.

- [ ] **Step 3: Run the whole suite**

Run: `npm test`
Expected: all unit tests PASS, including the three new modules.

Run: `npx playwright test`
Expected: all e2e specs PASS with no new visual-snapshot files created. Confirm with `git status` that no `tests/e2e/__snapshots__/**` files are untracked — committing macOS-generated baselines breaks CI.

- [ ] **Step 4: Add the attribution**

Issue #14 requires attribution to appear in the UI or docs — the concept is adapted from a CC BY-NC-SA Demonstration. Put it in the UI so it travels with the feature.

In `AngleExplorer.tsx`, immediately after the live region `<p className="sr-only">…</p>`, add:

```tsx
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Concept adapted from{' '}
          <a
            className="underline"
            href="https://demonstrations.wolfram.com/AnglesMeasuredInDegreesAndRadians/"
            rel="noopener noreferrer"
            target="_blank"
          >
            Angles Measured in Degrees and Radians
          </a>{' '}
          by Eric Schulz, Wolfram Demonstrations Project (CC BY-NC-SA).
        </p>
```

- [ ] **Step 5: Update the docs**

In `README.md`:

1. After the Transformation Explorer bullet (currently line 17), add:

```md
- **Angle Explorer** — sweep an angle on a circle whose radius you control: whole-radian tick marks, a five-way readout (degrees, fraction of a turn, ×2π, exact π-multiple, decimal radians) and arc length s = rθ. Because arc length equals radian measure only when r = 1, changing the radius pulls them apart on screen. Linked degree/radian fields convert in either direction and accept exact forms like `pi/3`.
```

2. In the env var table (near line 185), add:

```md
| `PUBLIC_SITE_TITLE_ANGLE_EXPLORER` | Title/heading for the Angle Explorer page. | `Angle Explorer` |
```

3. Update the two structure comments that enumerate the explorers: `explorer/  # Function + Transformation Explorer islands` → `# Function, Transformation + Angle Explorer islands`, and note in the `src/scripts/explorer/` line that the Angle Explorer modules are renderer-free (SVG, not function-plot).

Append to `SUMMARY.md` — replace the timestamp with the actual commit time:

```md
## [2026-07-23 00:00] Commit Summary

**Change Type:** Feature
**Scope:** Explorers / Angle Explorer

**Summary:**
Added `/explorers/angles`: an SVG unit-circle explorer with angle, radius, and position
sliders, whole-radian tick marks, a five-way KaTeX readout (degrees, turn fraction, ×2π,
exact π-multiple, decimal radians) plus arc length, and linked degree/radian fields that
convert in both directions.

**Rationale:**
Built as a standalone explorer rather than a mode in the graphing calculator: the diagram
is polar, not y = f(x), so function-plot does not apply and a second renderer inside
`GraphingCalculator.tsx` would have mixed two unrelated jobs. Logic lives in three pure
modules so the exact-fraction and arc-geometry edge cases are unit-testable.

**Bug Fix Context (if applicable):**
N/A — new feature. Two traps handled up front: a full ±360° SVG arc must be split across
two `A` commands or it renders as nothing, and exact π forms are suppressed for
non-integer degrees so typed radian input cannot produce absurd fractions.

**References:**
- TODO.md: [2026-07-23] Feature: Angle Explorer (degrees ↔ radians)
- Issue: GH-14
```

- [ ] **Step 6: Commit and open the PR**

```bash
git add tests/e2e/angle.spec.ts src/components/explorer/AngleExplorer.tsx README.md SUMMARY.md
git commit -m "test(explorer): cover the Angle Explorer end to end"
git push -u origin feature/angle-explorer
gh pr create --base main --title "feat(explorer): add the Angle Explorer" --body "Closes #14"
```

The PR description must reference `Closes #14`, list the manual verification steps from Tasks 5–7, and include a screenshot of the diagram in both light and dark themes.

---

## Verification checklist

Map back to issue #14's acceptance criteria before requesting review:

- [ ] `/explorers/angles` renders; catalog card links to it — Task 4, e2e "reachable from the explorers catalog"
- [ ] All four controls work across full ranges including ±360° — Task 5, e2e "full 360 degree sweep"
- [ ] Arc correct at >180° and exactly ±360°, both directions — Task 3 unit tests
- [ ] Readout shows five representations plus arc length with exact π — Task 6
- [ ] Changing `r` visibly separates arc length from radian measure — Task 6, Step 4
- [ ] Fields linked bidirectionally — Task 7, e2e both directions
- [ ] `pi/3` → exactly 60° — Task 7, e2e
- [ ] `1` rad → 57.2958° — Task 7, e2e
- [ ] Exact π suppressed for non-integer degrees — Task 6 `buildReadout` guard
- [ ] Invalid input accessible + non-destructive — Task 7, e2e
- [ ] Dark mode themed, contrast verified both themes — Task 5, manual
- [ ] Screen-reader announcements on every control change — Task 8
- [ ] CC BY-NC-SA attribution visible in the UI — Task 9, Step 4
- [ ] Unit + e2e pass, lint and typecheck clean — Task 9
